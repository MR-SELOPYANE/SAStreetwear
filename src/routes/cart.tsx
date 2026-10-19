import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, CreditCard, MapPin, Minus, Plus, Store, Trash2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CartItem } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatZAR } from "@/lib/format";
import { waNumber } from "@/lib/lowdata";
import {
  DEFAULT_FULFILLMENT,
  DEFAULT_PAY_CHOICE,
  orderTotal,
  resolveCheckout,
  type Fulfillment,
  type PayChoice,
} from "@/lib/checkout";
import { usePayOrder } from "@/lib/use-pay-order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — SA Streetwear" },
      { name: "description", content: "Check out: pay online by card or Instant EFT, or pay cash on delivery or collection." },
      { property: "og:title", content: "Your cart — SA Streetwear" },
      { property: "og:description", content: "Pay online by card or Instant EFT, or pay cash on delivery or collection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function Choice({
  active,
  onClick,
  icon,
  title,
  sub,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded border-2 p-4 text-left transition-colors ${
        active ? "border-foreground bg-secondary text-secondary-foreground" : "border-border hover:border-foreground"
      }`}
    >
      <span className="mt-0.5">{icon}</span>
      <span className="flex-1">
        <span className="flex items-center gap-2 font-display uppercase">
          {title}
          {badge && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-sans font-bold ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {badge}
            </span>
          )}
        </span>
        <span className={`mt-1 block text-sm ${active ? "opacity-80" : "text-muted-foreground"}`}>{sub}</span>
      </span>
    </button>
  );
}

function CartPage() {
  const { items, setQty, remove, clearSeller } = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const payOrder = usePayOrder();
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState<PayChoice>(DEFAULT_PAY_CHOICE);
  const [fulfillment, setFulfillment] = useState<Fulfillment>(DEFAULT_FULFILLMENT);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ shop: string; url: string | null; paid: boolean } | null>(null);

  const groups = items.reduce<Record<string, CartItem[]>>((acc, i) => {
    (acc[i.sellerId] ??= []).push(i);
    return acc;
  }, {});

  const placeOrder = async (sellerId: string, list: CartItem[]) => {
    if (!session) return navigate({ to: "/auth" });
    if (!phone.trim()) return toast.error("Add your phone number so the vendor can reach you");
    const checkout = resolveCheckout(pay, fulfillment, address);
    if (!checkout.ok) return toast.error(checkout.error);

    setBusy(sellerId);
    const total = orderTotal(list);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: session.user.id,
        seller_id: sellerId,
        total,
        customer_phone: phone,
        customer_name: session.user.user_metadata?.["display_name"] ?? session.user.email ?? "",
        payment_method: checkout.payment_method,
        fulfillment: checkout.fulfillment,
        delivery_address: checkout.delivery_address,
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
    if (e2) {
      setBusy(null);
      return toast.error(e2.message);
    }

    let paid = false;
    let reference = "";
    if (checkout.payment_method === "paystack") {
      const result = await payOrder(order.id).catch((e: unknown) => ({
        status: "error" as const,
        error: e instanceof Error ? e.message : "Payment failed",
      }));
      if (result.status !== "paid") {
        setBusy(null);
        clearSeller(sellerId);
        toast.error(
          result.status === "cancelled"
            ? "Payment not finished. Your order is saved — you can pay from My orders."
            : `${result.error} Your order is saved — try paying again from My orders.`,
        );
        return navigate({ to: "/orders" });
      }
      paid = true;
      reference = result.reference;
    }
    setBusy(null);

    const { data: s } = await supabase.from("sellers").select("shop_name, phone").eq("id", sellerId).maybeSingle();
    const payLine =
      checkout.payment_method === "paystack"
        ? `PAID ONLINE ${formatZAR(total)} (ref ${reference})`
        : `Total ${formatZAR(total)} — ${checkout.payment_method === "cash_delivery" ? "cash on delivery" : "cash on collection"}`;
    const getLine = checkout.fulfillment === "delivery" ? `Please deliver to: ${checkout.delivery_address}` : "I'll collect at your stall.";
    const msg = `Hi ${s?.shop_name ?? ""}! New SA Streetwear order (#${order.id.slice(0, 6)}):\n${list
      .map((i) => `${i.quantity} x ${i.title}${i.size ? ` (${i.size})` : ""}`)
      .join("\n")}\n${payLine}\n${getLine}\nMy number: ${phone}`;
    setAlert({
      shop: s?.shop_name ?? "the vendor",
      url: s?.phone ? `https://wa.me/${waNumber(s.phone)}?text=${encodeURIComponent(msg)}` : null,
      paid,
    });
    clearSeller(sellerId);
    toast.success(paid ? "Payment received! Your order is on its way to the vendor." : "Order placed!");
  };

  if (alert)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-4xl">{alert.paid ? "Paid & ordered!" : "Order placed!"}</h1>
        <p className="mt-3 text-muted-foreground">Let {alert.shop} know straight away. They may not check the website often.</p>
        {alert.url && (
          <a href={alert.url} target="_blank" rel="noreferrer" className="mt-8 inline-flex rounded bg-secondary px-6 py-3 font-semibold text-secondary-foreground">
            Send order to vendor on WhatsApp
          </a>
        )}
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
        <Link to="/" className="mt-6 inline-flex rounded bg-secondary px-6 py-3 font-semibold text-secondary-foreground">Keep shopping</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-4xl">Your cart</h1>
      <p className="mt-2 text-muted-foreground">Each vendor gets their own order.</p>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-lg">1. How do you want to pay?</h2>
          <div role="radiogroup" aria-label="Payment" className="mt-3 grid gap-3">
            <Choice
              active={pay === "online"}
              onClick={() => setPay("online")}
              icon={<CreditCard className="h-5 w-5" />}
              title="Pay online"
              badge="DEFAULT"
              sub="Card, Instant EFT or Apple Pay — secured by Paystack."
            />
            <Choice
              active={pay === "cash"}
              onClick={() => setPay("cash")}
              icon={<Banknote className="h-5 w-5" />}
              title="Cash"
              sub="Pay the vendor in cash when you get your items."
            />
          </div>
        </div>
        <div>
          <h2 className="text-lg">2. How do you want to get it?</h2>
          <div role="radiogroup" aria-label="Delivery" className="mt-3 grid gap-3">
            <Choice
              active={fulfillment === "collection"}
              onClick={() => setFulfillment("collection")}
              icon={<Store className="h-5 w-5" />}
              title="Collect at stall"
              sub="Pick up from the vendor. We show you the map."
            />
            <Choice
              active={fulfillment === "delivery"}
              onClick={() => setFulfillment("delivery")}
              icon={<Truck className="h-5 w-5" />}
              title="Delivery"
              sub="The vendor brings it to you. Agree any delivery fee on WhatsApp."
            />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="phone" className="text-sm font-semibold">Your phone number</label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 072 123 4567" />
        </div>
        {fulfillment === "delivery" && (
          <div>
            <label htmlFor="address" className="flex items-center gap-1 text-sm font-semibold"><MapPin className="h-4 w-4" /> Delivery address</label>
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Street, house number, area, city" />
          </div>
        )}
      </section>

      {Object.entries(groups).map(([sellerId, list]) => {
        const total = orderTotal(list);
        const label = !session
          ? "Sign in to order"
          : busy === sellerId
            ? pay === "online" ? "Opening payment…" : "Placing order…"
            : pay === "online"
              ? `Pay ${formatZAR(total)} now`
              : `Place order · cash on ${fulfillment === "delivery" ? "delivery" : "collection"}`;
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <p className="text-lg font-bold">Total {formatZAR(total)}</p>
              <Button
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={() => placeOrder(sellerId, list)}
                disabled={busy !== null}
              >
                {label}
              </Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
