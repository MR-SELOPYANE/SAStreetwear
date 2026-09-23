import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  sellerId: string;
  shopName: string;
  title: string;
  price: number;
  imageUrl: string | null;
  size: string;
  quantity: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: string, size: string) => void;
  setQty: (productId: string, size: string, q: number) => void;
  clearSeller: (sellerId: string) => void;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "sa-streetwear-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const same = (i: CartItem, id: string, size: string) => i.productId === id && i.size === size;

  const value: CartCtx = {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    add: (item) =>
      setItems((prev) => {
        const found = prev.find((i) => same(i, item.productId, item.size));
        if (found)
          return prev.map((i) =>
            same(i, item.productId, item.size) ? { ...i, quantity: i.quantity + item.quantity } : i,
          );
        return [...prev, item];
      }),
    remove: (id, size) => setItems((p) => p.filter((i) => !same(i, id, size))),
    setQty: (id, size, q) =>
      setItems((p) => p.map((i) => (same(i, id, size) ? { ...i, quantity: Math.max(1, q) } : i))),
    clearSeller: (sellerId) => setItems((p) => p.filter((i) => i.sellerId !== sellerId)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside provider");
  return c;
}
