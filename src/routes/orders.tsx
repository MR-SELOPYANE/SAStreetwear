import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatZAR } from "@/lib/format";
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

function OrdersPage() {
  const { session, loading } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["my-orders", session?.user.id],
    enabled: !!session,
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
        {data.map((o) => (
          <div key={o.id} className="rounded border p-5">
            <div className="flex items-center justify-between">
              <p className="font-display">{o.sellers?.shop_name}</p>
              <StatusBadge status={o.status} />
            </div>
            <p className="text-sm text-muted-foreground">Collect at: {o.sellers?.location} · {o.sellers?.phone}</p>
            <ul className="mt-3 text-sm">
              {o.order_items.map((i) => (
                <li key={i.id}>{i.quantity} × {i.title} {i.size && `(${i.size})`} — {formatZAR(i.price)}</li>
              ))}
            </ul>
            <p className="mt-3 font-bold">Pay on collection: {formatZAR(o.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
