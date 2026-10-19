import { useServerFn } from "@tanstack/react-start";
import { confirmPaystackPayment, startPaystackPayment } from "./payments.functions";

export type PayResult = { status: "paid"; reference: string } | { status: "cancelled" } | { status: "error"; error: string };

/** Opens the Paystack payment window for an order and confirms it on the server. */
export function usePayOrder() {
  const start = useServerFn(startPaystackPayment);
  const confirm = useServerFn(confirmPaystackPayment);

  return async (orderId: string): Promise<PayResult> => {
    const init = await start({ data: { orderId } });
    if ("error" in init && init.error) return { status: "error", error: init.error };
    if (!("accessCode" in init) || !init.accessCode) return { status: "error", error: "Could not start the payment" };

    const { default: PaystackPop } = await import("@paystack/inline-js");
    const outcome = await new Promise<{ reference: string } | null | { error: string }>((resolve) => {
      new PaystackPop().resumeTransaction(init.accessCode, {
        onSuccess: (tx) => resolve({ reference: tx.reference }),
        onCancel: () => resolve(null),
        onError: (e) => resolve({ error: e.message || "Payment window failed to open" }),
      });
    });
    if (outcome === null) return { status: "cancelled" };
    if ("error" in outcome) return { status: "error", error: outcome.error };

    const res = await confirm({ data: { orderId, reference: outcome.reference } });
    if (!res.paid) return { status: "error", error: res.error ?? "Payment not confirmed" };
    return { status: "paid", reference: outcome.reference };
  };
}
