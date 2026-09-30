import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";
import { money, useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Bag — Atelier" },
      { name: "description", content: "Review the items in your shopping bag." },
      { property: "og:title", content: "Your Bag — Atelier" },
      { property: "og:description", content: "Review the items in your shopping bag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, update, remove, total } = useCart();
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl">Your bag</h1>
      {items.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          Your bag is empty. <Link to="/" className="underline">Continue shopping</Link>
        </p>
      ) : (
        <>
          <ul className="mt-8 divide-y border-y">
            {items.map((i) => (
              <li key={i.productId + i.size} className="flex gap-4 py-4">
                <img src={i.image} alt={i.name} className="h-24 w-20 object-cover" />
                <div className="flex-1">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-sm text-muted-foreground">Size {i.size}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" onClick={() => update(i.productId, i.size, i.quantity - 1)} aria-label="Less"><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center text-sm">{i.quantity}</span>
                    <Button variant="outline" size="icon-sm" onClick={() => update(i.productId, i.size, i.quantity + 1)} aria-label="More"><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(i.productId, i.size)} aria-label="Remove"><X className="h-4 w-4" /></Button>
                  <span>{money(i.price * i.quantity)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-lg">Total <strong>{money(total)}</strong></span>
            <Button asChild size="lg"><Link to="/checkout">Checkout</Link></Button>
          </div>
        </>
      )}
    </main>
  );
}
