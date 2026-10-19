import { describe, expect, it } from "vitest";
import { DEFAULT_PAY_CHOICE, resolveCheckout, toCents } from "./checkout";

describe("checkout rules", () => {
  it("defaults to paying online", () => {
    expect(DEFAULT_PAY_CHOICE).toBe("online");
  });

  it("online payment uses Paystack", () => {
    const r = resolveCheckout("online", "collection", "");
    expect(r.ok && r.payment_method).toBe("paystack");
  });

  it("cash + delivery is cash on delivery with the address kept", () => {
    const r = resolveCheckout("cash", "delivery", " 12 Vilakazi St, Soweto ");
    expect(r).toEqual({ ok: true, payment_method: "cash_delivery", fulfillment: "delivery", delivery_address: "12 Vilakazi St, Soweto" });
  });

  it("cash + collection is cash on collection with no address", () => {
    const r = resolveCheckout("cash", "collection", "ignored");
    expect(r).toEqual({ ok: true, payment_method: "cash_collection", fulfillment: "collection", delivery_address: "" });
  });

  it("delivery needs an address", () => {
    expect(resolveCheckout("cash", "delivery", "  ").ok).toBe(false);
    expect(resolveCheckout("online", "delivery", "").ok).toBe(false);
  });

  it("charges Paystack in cents", () => {
    expect(toCents(349.99)).toBe(34999);
    expect(toCents(250)).toBe(25000);
  });
});
