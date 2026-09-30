import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/cart";
import { RequireAuth } from "@/components/SiteHeader";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My Orders — Atelier" },
      { name: "description", content: "See all your orders and their delivery status." },
      { property: "og:title", content: "My Orders — Atelier" },
      { property: "og:description", content: "See all your orders and their delivery status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Orders />
    </RequireAuth>
  ),
});

function Orders() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl">My orders</h1>
      {isLoading ? (
        <p className="mt-6 text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <p className="mt-6 text-muted-foreground">No orders yet. <Link to="/" className="underline">Start shopping</Link></p>
      ) : (
        <ul className="mt-8 divide-y border-y">
          {data.map((o) => (
            <li key={o.id}>
              <Link to="/orders/$orderNumber" params={{ orderNumber: o.order_number }} className="flex items-center justify-between py-4 hover:bg-muted/50">
                <div>
                  <p className="font-medium">{o.order_number}</p>
                  <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs capitalize">{o.status}</span>
                <span>{money(Number(o.total))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
