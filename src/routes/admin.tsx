import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatZAR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — SA Streetwear" },
      { name: "description", content: "Approve vendors and oversee the SA Streetwear marketplace." },
      { property: "og:title", content: "Admin — SA Streetwear" },
      { property: "og:description", content: "Approve vendors and oversee the SA Streetwear marketplace." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin"],
    enabled: isAdmin,
    queryFn: async () => {
      const [s, p, o] = await Promise.all([
        supabase.from("sellers").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("*, sellers(shop_name)").order("created_at", { ascending: false }),
        supabase.from("orders").select("*, sellers(shop_name)").order("created_at", { ascending: false }),
      ]);
      return { sellers: s.data ?? [], products: p.data ?? [], orders: o.data ?? [] };
    },
  });
  if (loading) return null;
  if (!isAdmin) return <div className="mx-auto max-w-3xl p-10">Admins only.</div>;

  const setSeller = async (id: string, status: string) => {
    const { error } = await supabase.from("sellers").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Seller ${status}`);
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const sellers = data?.sellers ?? [];
  const pending = sellers.filter((s) => s.status === "pending");
  const gmv = (data?.orders ?? []).filter((o) => o.status === "collected").reduce((n, o) => n + Number(o.total), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-bold tracking-widest text-muted-foreground">ADMIN DASHBOARD</p>
      <h1 className="text-4xl">Marketplace control</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[["Vendors", sellers.length], ["Awaiting approval", pending.length], ["Listings", data?.products.length ?? 0], ["Collected sales", formatZAR(gmv)]].map(([l, v]) => (
          <div key={l} className="rounded border-2 border-foreground p-5">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>
      <Tabs defaultValue="sellers" className="mt-8">
        <TabsList>
          <TabsTrigger value="sellers">Vendors</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="sellers" className="grid gap-3">
          {sellers.length === 0 && <p className="py-6 text-muted-foreground">No vendor applications yet.</p>}
          {sellers.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded border p-4">
              <div className="flex-1">
                <p className="font-semibold">{s.shop_name} <StatusBadge status={s.status} /></p>
                <p className="text-sm text-muted-foreground">{s.location} · {s.phone}</p>
                {s.bio && <p className="mt-1 text-sm">{s.bio}</p>}
              </div>
              {s.status !== "approved" && <Button size="sm" onClick={() => setSeller(s.id, "approved")}>Approve</Button>}
              {s.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setSeller(s.id, "rejected")}>{s.status === "approved" ? "Suspend" : "Reject"}</Button>}
            </div>
          ))}
        </TabsContent>
        <TabsContent value="products" className="grid gap-3">
          {(data?.products ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded border p-3">
              <div className="h-14 w-12 overflow-hidden rounded bg-muted">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex-1">
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-muted-foreground">{p.sellers?.shop_name} · {formatZAR(p.price)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={async () => {
                if (!confirm("Remove this listing?")) return;
                await supabase.from("products").delete().eq("id", p.id);
                qc.invalidateQueries({ queryKey: ["admin"] });
              }}>Remove</Button>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="orders" className="grid gap-3">
          {(data?.orders ?? []).map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded border p-3 text-sm">
              <span>{o.customer_name} → {o.sellers?.shop_name}</span>
              <span className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{paymentLabel(o.payment_method, o.payment_status)}</span><b>{formatZAR(o.total)}</b><StatusBadge status={o.status} /></span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
