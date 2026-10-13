import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MapPin, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatZAR } from "@/lib/format";
import { mapLink, waNumber } from "@/lib/lowdata";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My orders — SA Streetwear" },
      { name: "description", content: "Track your pay-on-collection orders." },
      { property: "og:title", content: "My orders — SA Streetwear" },
      { property: "og:description", content: "Track your pay-on-collection orders." },
    ],
  }),
  component: OrdersPage,
});

const STEPS = ["pending", "ready", "collected"] as const;
const LABEL: Record<string, string> = { pending: "Order sent", ready: "Ready for collection", collected: "Collected" };

function OrdersPage() {
  const { session, loading } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["my-orders", session?.user.id],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, sellers(shop_name, location, phone), order_items(*)")
        .eq("customer_id", session!.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (loading) return null;
  if (!session)
    return <div className="mx-auto max-w-3xl p-10">Please <Link to="/auth" className="underline">sign in</Link> to see your orders.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl">My orders</h1>
      {data.length === 0 && <p className="mt-6 text-muted-foreground">No orders yet.</p>}
      <div className="mt-6 space-y-4">
        {data.map((o) => {
          const step = STEPS.indexOf(o.status as (typeof STEPS)[number]);
          const ready = o.status === "ready";
          return (
            <div key={o.id} className={`rounded border-2 p-5 ${ready ? "border-foreground" : ""}`}>
              {ready && (
                <div className="-mx-5 -mt-5 mb-4 flex items-center gap-2 bg-primary px-5 py-3 font-display text-primary-foreground">
                  <CheckCircle2 className="h-5 w-5" /> READY FOR COLLECTION
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="font-display">{o.sellers?.shop_name}</p>
                <StatusBadge status={o.status} />
              </div>
              {step >= 0 && (
                <ol className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold">
                  {STEPS.map((s, i) => (
                    <li key={s} className={`border-t-4 pt-1 ${i <= step ? "border-foreground" : "border-muted text-muted-foreground"}`}>
                      {LABEL[s]}
                    </li>
                  ))}
                </ol>
              )}
              {o.sellers && (
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <a href={mapLink(o.sellers.location)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border px-3 py-2 font-semibold">
                    <MapPin className="h-4 w-4" /> {o.sellers.location} · Map
                  </a>
                  {o.sellers.phone && (
                    <a href={`https://wa.me/${waNumber(o.sellers.phone)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border px-3 py-2 font-semibold">
                      <MessageCircle className="h-4 w-4" /> WhatsApp vendor
                    </a>
                  )}
                </div>
              )}
              <ul className="mt-3 text-sm">
                {o.order_items.map((i) => (
                  <li key={i.id}>{i.quantity} × {i.title} {i.size && `(${i.size})`} — {formatZAR(i.price)}</li>
                ))}
              </ul>
              <p className="mt-3 font-bold">Pay on collection: {formatZAR(o.total)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
