import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/cart";
import { RequireAuth } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders/$orderNumber")({
  validateSearch: (s: Record<string, unknown>): { placed?: boolean } => (s["placed"] === true || s["placed"] === "true" ? { placed: true } : {}),
  head: () => ({
    meta: [
      { title: "Order Details — Atelier" },
      { name: "description", content: "Order confirmation, items and tracking details." },
      { property: "og:title", content: "Order Details — Atelier" },
      { property: "og:description", content: "Order confirmation, items and tracking details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <OrderPage />
    </RequireAuth>
  ),
});

function OrderPage() {
  const { orderNumber } = Route.useParams();
  const { placed } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), refund_requests(*)")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <p className="p-10 text-muted-foreground">Loading…</p>;
  if (!data) return <p className="p-10">Order not found.</p>;
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {placed && (
        <div className="mb-8 flex items-start gap-3 border border-accent bg-card p-5">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-accent" />
          <div>
            <p className="font-display text-2xl">Order confirmed!</p>
            <p className="text-sm text-muted-foreground">
              Your order number is <strong className="text-foreground">{data.order_number}</strong>. Save it — our assistant can track it for you.
            </p>
          </div>
        </div>
      )}
      <h1 className="text-4xl">{data.order_number}</h1>
      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <Info label="Status" value={data.status} />
        <Info label="Tracking" value={data.tracking_number ?? "—"} />
        <Info label="Est. delivery" value={data.estimated_delivery ?? "—"} />
      </div>
      <ul className="mt-8 divide-y border-y text-sm">
        {data.order_items.map((i) => (
          <li key={i.id} className="flex justify-between py-3">
            <span>{i.quantity} × {i.product_name} ({i.size})</span>
            <span>{money(Number(i.unit_price) * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-right text-lg">Total <strong>{money(Number(data.total))}</strong></p>
      <p className="mt-6 text-sm text-muted-foreground">
        Ship to: {data.shipping_name}, {data.shipping_address}, {data.shipping_city} {data.shipping_zip}
      </p>
      {data.refund_requests[0] && (
        <p className="mt-4 text-sm">Refund {data.refund_requests[0].refund_number}: <span className="capitalize">{data.refund_requests[0].status}</span></p>
      )}
      <Button asChild variant="outline" className="mt-8">
        <Link to="/support">Need help with this order?</Link>
      </Button>
    </main>
  );
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="border bg-card p-3">
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 capitalize">{value}</p>
  </div>
);
