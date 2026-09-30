import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { productQuery } from "@/lib/products";
import { money, useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product — Atelier" },
      { name: "description", content: "Product details, sizes and price at Atelier." },
      { property: "og:title", content: "Product — Atelier" },
      { property: "og:description", content: "Product details, sizes and price at Atelier." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: p, isLoading } = useQuery(productQuery(slug));
  const [size, setSize] = useState<string | null>(null);
  const { add } = useCart();
  if (isLoading) return <p className="p-10 text-muted-foreground">Loading…</p>;
  if (!p) return <p className="p-10">Product not found. <Link to="/" className="underline">Back to shop</Link></p>;
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <div className="aspect-[3/4] overflow-hidden bg-muted">
        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
      </div>
      <div className="md:pt-10">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">{p.category}</p>
        <h1 className="mt-2 text-4xl md:text-5xl">{p.name}</h1>
        <p className="mt-3 text-2xl">{money(Number(p.price))}</p>
        <p className="mt-6 text-muted-foreground">{p.description}</p>
        <p className="mt-8 text-sm font-medium">Size</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {p.sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`min-w-12 border px-3 py-2 text-sm ${size === s ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <Button
          size="lg"
          className="mt-8 w-full"
          onClick={() => {
            if (!size) {
              toast.error("Please choose a size");
              return;
            }
            add({ productId: p.id, slug: p.slug, name: p.name, price: Number(p.price), image: p.image_url, size, quantity: 1 });
            toast.success(`${p.name} added to your bag`);
          }}
        >
          Add to bag
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">Free delivery in 5 days · 30-day refunds</p>
      </div>
    </main>
  );
}
