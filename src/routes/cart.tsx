import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CartItem } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatZAR } from "@/lib/format";
import { waNumber } from "@/lib/lowdata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — SA Streetwear" },
      { name: "description", content: "Review your items and place pay-on-collection orders." },
      { property: "og:title", content: "Your cart — SA Streetwear" },
      { property: "og:description", content: "Review your items and place pay-on-collection orders." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, clearSeller } = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ shop: string; url: string } | null>(null);

  const groups = items.reduce<Record<string, CartItem[]>>((acc, i) => {
    (acc[i.sellerId] ??= []).push(i);
    return acc;
  }, {});

  const placeOrder = async (sellerId: string, list: CartItem[]) => {
    if (!session) return navigate({ to: "/auth" });
    if (!phone.trim()) return toast.error("Add your phone number so the vendor can reach you");
    setBusy(sellerId);
    const total = list.reduce((n, i) => n + i.price * i.quantity, 0);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: session.user.id,
        seller_id: sellerId,
        total,
        customer_phone: phone,
        customer_name: session.user.user_metadata?.["display_name"] ?? session.user.email ?? "",
      })
      .select()
      .single();
    if (error || !order) {
      setBusy(null);
      return toast.error(error?.message ?? "Could not place order");
    }
    const { error: e2 } = await supabase.from("order_items").insert(
      list.map((i) => ({ order_id: order.id, product_id: i.productId, title: i.title, price: i.price, quantity: i.quantity, size: i.size })),
    );
    setBusy(null);
    if (e2) return toast.error(e2.message);
    const { data: s } = await supabase.from("sellers").select("shop_name, phone").eq("id", sellerId).maybeSingle();
    if (s?.phone) {
      const msg = `Hi ${s.shop_name}! New SA Streetwear order (#${order.id.slice(0, 6)}):\n${list
        .map((i) => `${i.quantity} x ${i.title}${i.size ? ` (${i.size})` : ""}`)
        .join("\n")}\nTotal ${formatZAR(total)} — cash on collection. My number: ${phone}`;
      setAlert({ shop: s.shop_name, url: `https://wa.me/${waNumber(s.phone)}?text=${encodeURIComponent(msg)}` });
    }
    clearSeller(sellerId);
    toast.success("Order placed! The vendor will get it ready for collection.");
  };

  if (alert)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-4xl">Order placed!</h1>
        <p className="mt-3 text-muted-foreground">Let {alert.shop} know straight away. They may not check the website often.</p>
        <a href={alert.url} target="_blank" rel="noreferrer" className="mt-8 inline-flex rounded bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Send order to vendor on WhatsApp
        </a>
        <div className="mt-4 flex justify-center gap-4 text-sm underline">
          <Link to="/orders">Track my order</Link>
          <button onClick={() => setAlert(null)}>Back to cart</button>
        </div>
      </div>
    );

  if (!items.length)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl">Your cart is empty</h1>
        <Link to="/" className="mt-6 inline-flex rounded bg-primary px-6 py-3 font-semibold text-primary-foreground">Keep shopping</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-4xl">Your cart</h1>
      <p className="mt-2 text-muted-foreground">Each vendor gets their own order. You pay cash when you collect.</p>
      <div className="mt-6 max-w-sm">
        <label className="text-sm font-semibold">Your phone number</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 072 123 4567" />
      </div>
      {Object.entries(groups).map(([sellerId, list]) => {
        const total = list.reduce((n, i) => n + i.price * i.quantity, 0);
        return (
          <section key={sellerId} className="mt-8 rounded border-2 border-foreground">
            <div className="bg-secondary px-5 py-3 font-display text-secondary-foreground">{list[0]?.shopName || "Vendor"}</div>
            <ul className="divide-y">
              {list.map((i) => (
                <li key={i.productId + i.size} className="flex items-center gap-4 p-4">
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded bg-muted">
                    {i.imageUrl && <img src={i.imageUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{i.title}</p>
                    {i.size && <p className="text-xs text-muted-foreground">Size {i.size}</p>}
                    <p className="text-sm">{formatZAR(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon-sm" variant="outline" onClick={() => setQty(i.productId, i.size, i.quantity - 1)}><Minus /></Button>
                    <span className="w-6 text-center">{i.quantity}</span>
                    <Button size="icon-sm" variant="outline" onClick={() => setQty(i.productId, i.size, i.quantity + 1)}><Plus /></Button>
                  </div>
                  <Button size="icon-sm" variant="ghost" onClick={() => remove(i.productId, i.size)} aria-label="Remove"><Trash2 /></Button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-lg font-bold">Total {formatZAR(total)}</p>
              <Button onClick={() => placeOrder(sellerId, list)} disabled={busy === sellerId}>
                {session ? "Place order · pay on collection" : "Sign in to order"}
              </Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
