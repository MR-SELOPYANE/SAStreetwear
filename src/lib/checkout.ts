// Checkout rules shared by the cart, orders pages and payment server functions.

export type PayChoice = "online" | "cash";
export type Fulfillment = "delivery" | "collection";
export type PaymentMethod = "paystack" | "cash_delivery" | "cash_collection";

/** Paying online is always the first, pre-selected option. */
export const DEFAULT_PAY_CHOICE: PayChoice = "online";
export const DEFAULT_FULFILLMENT: Fulfillment = "collection";

export type ResolvedCheckout =
  | { ok: true; payment_method: PaymentMethod; fulfillment: Fulfillment; delivery_address: string }
  | { ok: false; error: string };

export function resolveCheckout(pay: PayChoice, fulfillment: Fulfillment, address: string): ResolvedCheckout {
  const addr = address.trim();
  if (fulfillment === "delivery" && addr.length < 5) {
    return { ok: false, error: "Add your delivery address so the vendor knows where to bring it" };
  }
  const payment_method: PaymentMethod =
    pay === "online" ? "paystack" : fulfillment === "delivery" ? "cash_delivery" : "cash_collection";
  return { ok: true, payment_method, fulfillment, delivery_address: fulfillment === "delivery" ? addr : "" };
}

export const orderTotal = (items: { price: number; quantity: number }[]) =>
  Math.round(items.reduce((n, i) => n + Number(i.price) * i.quantity, 0) * 100) / 100;

/** Paystack takes amounts in cents (R1 = 100). */
export const toCents = (rands: number) => Math.round(Number(rands) * 100);

export function paymentLabel(method: string, paymentStatus: string) {
  if (method === "paystack") return paymentStatus === "paid" ? "Paid online" : "Online payment not finished";
  if (method === "cash_delivery") return "Cash on delivery";
  return "Cash on collection";
}

export function stepLabels(fulfillment: string): Record<string, string> {
  return fulfillment === "delivery"
    ? { pending: "Order sent", ready: "Out for delivery", collected: "Delivered" }
    : { pending: "Order sent", ready: "Ready for collection", collected: "Collected" };
}
