import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money, useCart } from "@/lib/cart";
import { RequireAuth } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Atelier" },
      { name: "description", content: "Enter delivery details and place your order." },
      { property: "og:title", content: "Checkout — Atelier" },
      { property: "og:description", content: "Enter delivery details and place your order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Checkout />
    </RequireAuth>
  ),
});

function Checkout() {
  const { user } = useAuth();
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", address: "", city: "", zip: "", phone: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (items.length === 0) return;
    setBusy(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({ user_id: user.id, total, shipping_name: f.name, shipping_address: f.address, shipping_city: f.city, shipping_zip: f.zip, phone: f.phone })
      .select()
      .single();
    if (error || !order) {
      setBusy(false);
      toast.error(error?.message ?? "Could not place order");
      return;
    }
    const { error: itemErr } = await supabase.from("order_items").insert(
      items.map((i) => ({ order_id: order.id, product_id: i.productId, product_name: i.name, size: i.size, quantity: i.quantity, unit_price: i.price })),
    );
    setBusy(false);
    if (itemErr) {
      toast.error(itemErr.message);
      return;
    }
    clear();
    navigate({ to: "/orders/$orderNumber", params: { orderNumber: order.order_number }, search: { placed: true } });
  };

  const field = (k: keyof typeof f, label: string, req = true) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} required={req} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="mt-1" />
    </div>
  );

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_320px]">
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-4xl">Checkout</h1>
        {field("name", "Full name")}
        {field("address", "Address")}
        <div className="grid grid-cols-2 gap-4">
          {field("city", "City")}
          {field("zip", "Postal code")}
        </div>
        {field("phone", "Phone (optional)", false)}
        <p className="text-sm text-muted-foreground">Payment: cash on delivery (demo store).</p>
        <Button type="submit" size="lg" className="w-full" disabled={busy || items.length === 0}>
          {busy ? "Placing order…" : `Place order · ${money(total)}`}
        </Button>
      </form>
      <aside className="h-fit border bg-card p-5">
        <h2 className="text-xl">Summary</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.productId + i.size} className="flex justify-between">
              <span>{i.quantity} × {i.name} ({i.size})</span>
              <span>{money(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t pt-3 font-semibold"><span>Total</span><span>{money(total)}</span></p>
      </aside>
    </main>
  );
}
