import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { productsQuery } from "@/lib/products";
import { money } from "@/lib/cart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atelier — Shop Modern Clothing" },
      { name: "description", content: "Linen, wool, denim and leather essentials. Order online and track with our support assistant." },
      { property: "og:title", content: "Atelier — Shop Modern Clothing" },
      { property: "og:description", content: "Modern clothing essentials with instant order support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

const CATS = ["All", "Women", "Men", "Shoes", "Accessories"];

function Shop() {
  const { data, isLoading } = useQuery(productsQuery);
  const [cat, setCat] = useState("All");
  const list = (data ?? []).filter((p) => cat === "All" || p.category === cat);
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-16">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Autumn edit</p>
        <h1 className="mt-3 max-w-3xl text-5xl leading-[1.05] md:text-7xl">
          Clothes made to be <em>lived in</em>.
        </h1>
        <p className="mt-5 max-w-xl text-muted-foreground">
          Natural fabrics, honest prices, and a support assistant that can track your order or start a refund in seconds.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/support" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Need help? Chat with support
          </Link>
          <Link to="/orders" className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted">
            View my orders
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-8 flex flex-wrap gap-2 border-b pb-4">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${cat === c ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {c}
            </button>
          ))}
        </div>
        {isLoading ? (
          <p className="text-muted-foreground">Loading products…</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {list.map((p) => (
              <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} className="group">
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="mt-3 flex justify-between gap-2 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span>{money(Number(p.price))}</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
