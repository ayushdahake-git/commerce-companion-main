import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolOrDynamicToolName, type UIMessage } from "ai";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import stitch from "@/assets/stitch.png";

export const Route = createFileRoute("/support/$threadId")({
  head: () => ({
    meta: [
      { title: "Support Chat — Atelier" },
      { name: "description", content: "Your conversation with the Atelier support assistant." },
      { property: "og:title", content: "Support Chat — Atelier" },
      { property: "og:description", content: "Your conversation with the Atelier support assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SupportPage />
    </RequireAuth>
  ),
});

const QUICK = ["Track my latest order", "I want a refund", "Show my refund status", "I forgot my password"];

function SupportPage() {
  const { threadId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const threads = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_threads").select("id, title, updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const history = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_messages").select("message_id, role, parts").eq("thread_id", threadId).order("created_at");
      if (error) throw error;
      return data.map((m) => ({ id: m.message_id, role: m.role, parts: m.parts }) as unknown as UIMessage);
    },
  });

  const newThread = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("support_threads").insert({ user_id: user.id }).select("id").single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["threads"] });
    navigate({ to: "/support/$threadId", params: { threadId: data.id } });
  };

  return (
    <main className="mx-auto grid h-[calc(100vh-4rem)] max-w-6xl md:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col border-r p-3 md:flex">
        <Button onClick={newThread} variant="outline" className="mb-3 justify-start gap-2"><Plus className="h-4 w-4" /> New issue</Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {threads.data?.map((t) => (
            <Link
              key={t.id}
              to="/support/$threadId"
              params={{ threadId: t.id }}
              className={`block truncate rounded px-3 py-2 text-sm ${t.id === threadId ? "bg-secondary font-medium" : "hover:bg-muted"}`}
            >
              {t.title}
            </Link>
          ))}
        </div>
      </aside>
      {history.isLoading ? (
        <p className="p-10 text-muted-foreground">Loading conversation…</p>
      ) : (
        <ChatWindow key={threadId} threadId={threadId} initial={history.data ?? []} onNewThread={newThread} />
      )}
    </main>
  );
}

function ChatWindow({ threadId, initial, onNewThread }: { threadId: string; initial: UIMessage[]; onNewThread: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
      }),
    [threadId],
  );
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => toast.error(e.message || "Something went wrong"),
    onFinish: () => qc.invalidateQueries({ queryKey: ["threads"] }),
  });
  const busy = status === "submitted" || status === "streaming";

  const send = (t: string) => {
    if (!t.trim() || busy) return;
    sendMessage({ text: t });
    setText("");
  };

  return (
    <section className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <img src={stitch} alt="Stitch" width={36} height={36} className="h-9 w-9 rounded-full bg-card" />
        <div className="flex-1">
          <p className="font-display text-lg leading-none">Stitch</p>
          <p className="text-xs text-muted-foreground">Atelier support · orders, refunds, account</p>
        </div>
        <Button size="sm" variant="outline" className="md:hidden" onClick={onNewThread}>New issue</Button>
      </div>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="mx-auto mt-10 max-w-md text-center">
              <img src={stitch} alt="" width={96} height={96} className="mx-auto h-24 w-24" />
              <h2 className="mt-3 text-2xl">How can I help?</h2>
              <p className="mt-1 text-sm text-muted-foreground">I can track orders, start refunds and help with your account.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">{q}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : ""}>
                {m.parts.map((p, i) => {
                  if (p.type === "text") return <MessageResponse key={i}>{p.text}</MessageResponse>;
                  if (isToolUIPart(p))
                    return (
                      <Tool key={i} defaultOpen={false}>
                        <ToolHeader type={p.type as never} state={p.state} title={getToolOrDynamicToolName(p).replace(/_/g, " ")} />
                        <ToolContent>
                          <ToolInput input={p.input} />
                          <ToolOutput output={p.output} errorText={p.errorText} />
                        </ToolContent>
                      </Tool>
                    );
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Shimmer>Looking into it…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t p-3">
        <PromptInput onSubmit={() => send(text)}>
          <PromptInputTextarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about an order, refund or your account…" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}
