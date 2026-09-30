import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  update: (productId: string, size: string, quantity: number) => void;
  remove: (productId: string, size: string) => void;
  clear: () => void;
  count: number;
  total: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "atelier-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const add = (item: CartItem) =>
    setItems((prev) => {
      const found = prev.find((i) => i.productId === item.productId && i.size === item.size);
      if (found)
        return prev.map((i) =>
          i === found ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      return [...prev, item];
    });
  const update = (productId: string, size: string, quantity: number) =>
    setItems((prev) =>
      prev
        .map((i) => (i.productId === productId && i.size === size ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0),
    );
  const remove = (productId: string, size: string) =>
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.size === size)));
  const clear = () => setItems([]);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const total = items.reduce((n, i) => n + i.quantity * i.price, 0);

  return (
    <Ctx.Provider value={{ items, add, update, remove, clear, count, total }}>{children}</Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}

export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
