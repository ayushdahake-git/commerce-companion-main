import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, isStepCount, streamText, tool, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const SYSTEM = `You are "Stitch", the friendly customer-service assistant for Atelier, an online clothing store.
You help signed-in customers with: tracking orders, order details, refund requests and refund status, password resets, sizing, shipping (free, ~5 days) and returns policy (refunds within 30 days of order, item unworn).
Always use the tools to look up real data - never invent order numbers, statuses or tracking numbers.
Before creating a refund request, confirm the order number and the reason with the customer.
Keep answers short, warm and clear. Use markdown lists when showing multiple orders.`;

// Model tool-calling support karna chahiye. Env se badal sakte ho: OPENROUTER_MODEL
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export async function handleChat(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Please sign in" }, 401);

  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "Please sign in" }, 401);
  const user = userData.user;

  const body = (await request.json()) as { messages: UIMessage[]; threadId: string };
  if (!body?.threadId || !Array.isArray(body.messages)) return json({ error: "Bad request" }, 400);

  const { data: thread } = await supabase
    .from("support_threads")
    .select("id, title")
    .eq("id", body.threadId)
    .maybeSingle();
  if (!thread) return json({ error: "Conversation not found" }, 404);

  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) return json({ error: "OPENROUTER_API_KEY is not configured" }, 500);

  const origin = new URL(request.url).origin;

  const findOrder = async (orderNumber: string) => {
    const { data } = await supabase
      .from("orders")
      .select(
        "*, order_items(product_name, size, quantity, unit_price), refund_requests(refund_number, status, amount, reason, created_at)",
      )
      .ilike("order_number", orderNumber.trim())
      .maybeSingle();
    return data;
  };

  const tools = {
    list_my_orders: tool({
      description: "List the customer's recent orders with number, status, total and date.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from("orders")
          .select("order_number, status, total, created_at, estimated_delivery")
          .order("created_at", { ascending: false })
          .limit(10);
        return { orders: data ?? [] };
      },
    }),
    track_order: tool({
      description: "Get full details and tracking for one order by its order number (e.g. ORD-1A2B3C4D).",
      inputSchema: z.object({ order_number: z.string() }),
      execute: async ({ order_number }) => {
        const o = await findOrder(order_number);
        if (!o) return { found: false };
        return {
          found: true,
          order_number: o.order_number,
          status: o.status,
          total: o.total,
          placed: o.created_at,
          tracking_number: o.tracking_number,
          estimated_delivery: o.estimated_delivery,
          items: o.order_items,
          refunds: o.refund_requests,
        };
      },
    }),
    request_refund: tool({
      description:
        "Create a refund request for an order. Only call after the customer confirmed the order number and reason.",
      inputSchema: z.object({ order_number: z.string(), reason: z.string() }),
      execute: async ({ order_number, reason }) => {
        const o = await findOrder(order_number);
        if (!o) return { ok: false, message: "Order not found" };
        if (o.refund_requests.length)
          return { ok: false, message: "A refund already exists", refund: o.refund_requests[0] };
        const days = (Date.now() - new Date(o.created_at).getTime()) / 86400000;
        if (days > 30) return { ok: false, message: "Order is older than 30 days" };
        const { data, error } = await supabase
          .from("refund_requests")
          .insert({ order_id: o.id, user_id: user.id, reason, amount: o.total })
          .select("refund_number, status, amount")
          .single();
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          ...data,
          note: "Refunds are reviewed within 2 business days and paid back in 5-7 days.",
        };
      },
    }),
    refund_status: tool({
      description: "List the customer's refund requests and their status.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from("refund_requests")
          .select("refund_number, status, amount, reason, created_at, orders(order_number)")
          .order("created_at", { ascending: false });
        return { refunds: data ?? [] };
      },
    }),
    send_password_reset: tool({
      description: "Email the customer a password reset link to their account email.",
      inputSchema: z.object({}),
      execute: async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
          redirectTo: `${origin}/reset-password`,
        });
        return error ? { ok: false, message: error.message } : { ok: true, sent_to: user.email };
      },
    }),
  };

  // Save the latest user message and set thread title
  const last = body.messages[body.messages.length - 1];
  if (last?.role === "user") {
    const { error } = await supabase.from("support_messages").upsert(
      {
        thread_id: thread.id,
        user_id: user.id,
        message_id: last.id,
        role: "user",
        parts: last.parts as never,
      },
      { onConflict: "thread_id,message_id" },
    );
    if (error) console.error("save user message failed", error);
    if (thread.title === "New conversation") {
      const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
      await supabase
        .from("support_threads")
        .update({ title: text.slice(0, 60) || "Conversation", updated_at: new Date().toISOString() })
        .eq("id", thread.id);
    }
  }

  // OpenRouter OpenAI-compatible API
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    headers: {
      "HTTP-Referer": origin,
      "X-Title": "Atelier Support",
    },
  });

  const result = streamText({
    // .chat() use karo (Chat Completions). OpenRouter par .responses() ki jagah ye stable hai.
    model: openrouter.chat(process.env["OPENROUTER_MODEL"] ?? DEFAULT_MODEL),
    system: `${SYSTEM}\nCustomer email: ${user.email}. Today: ${new Date().toDateString()}.`,
    messages: await convertToModelMessages(body.messages, { tools }),
    tools,
    stopWhen: isStepCount(50),
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    generateMessageId: () => crypto.randomUUID(),
    onFinish: async ({ responseMessage }) => {
      const { error } = await supabase.from("support_messages").upsert(
        {
          thread_id: thread.id,
          user_id: user.id,
          message_id: responseMessage.id,
          role: "assistant",
          parts: responseMessage.parts as never,
        },
        { onConflict: "thread_id,message_id" },
      );
      if (error) console.error("save assistant message failed", error);
      await supabase
        .from("support_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread.id);
    },
    onError: (e) => {
      console.error(e);
      return "Sorry, the assistant ran into a problem. Please try again.";
    },
  });
}