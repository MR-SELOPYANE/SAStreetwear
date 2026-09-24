import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, formatZAR, type Product } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell with SA Streetwear — Vendor dashboard" },
      { name: "description", content: "Street vendors: list your clothes online and reach more customers." },
      { property: "og:title", content: "Sell with SA Streetwear — Vendor dashboard" },
      { property: "og:description", content: "Street vendors: list your clothes online and reach more customers." },
    ],
  }),
  component: SellPage,
});

function SellPage() {
  const { session, loading, seller } = useAuth();
  if (loading) return null;
  if (!session)
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-5xl">Your stall, online.</h1>
        <p className="mt-4 text-lg text-muted-foreground">Sign in to list your clothes and reach customers beyond your corner.</p>
        <Link to="/auth" className="mt-8 inline-flex rounded bg-primary px-6 py-3 font-semibold text-primary-foreground">Sign in to start</Link>
      </div>
    );
  if (!seller) return <ApplyForm />;
  if (seller.status !== "approved")
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-4xl">{seller.shop_name}</h1>
        <div className="mt-4"><StatusBadge status={seller.status} /></div>
        <p className="mt-4 text-muted-foreground">
          {seller.status === "pending"
            ? "Thanks for applying! An admin will review your shop soon. You can list items once approved."
            : "Your application wasn't approved. Please contact support."}
        </p>
      </div>
    );
  return <Dashboard />;
}

function ApplyForm() {
  const { session, refresh } = useAuth();
  const [f, setF] = useState({ shop_name: "", location: "", phone: "", bio: "" });
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-4xl">Open your shop</h1>
      <p className="mt-2 text-muted-foreground">Tell customers where to find you. An admin will approve your shop.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const { error } = await supabase.from("sellers").insert({ id: session!.user.id, ...f });
          setBusy(false);
          if (error) return toast.error(error.message);
          toast.success("Application sent!");
          await refresh();
        }}
      >
        <div><Label>Shop name</Label><Input required value={f.shop_name} onChange={(e) => setF({ ...f, shop_name: e.target.value })} /></div>
        <div><Label>Where you trade (street, area, city)</Label><Input required placeholder="e.g. Bree St Taxi Rank, Joburg CBD" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
        <div><Label>Phone / WhatsApp</Label><Input required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>About your stall</Label><Textarea value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        <Button type="submit" disabled={busy} className="w-full">Apply to sell</Button>
      </form>
    </div>
  );
}

function Dashboard() {
  const { seller } = useAuth();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ["my-products", seller!.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("seller_id", seller!.id).order("created_at", { ascending: false });
      return (data ?? []) as Product[];
    },
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["seller-orders", seller!.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, order_items(*)").eq("seller_id", seller!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const pending = orders.filter((o) => o.status === "pending").length;
  const revenue = orders.filter((o) => o.status === "collected").reduce((n, o) => n + Number(o.total), 0);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["seller-orders"] });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-muted-foreground">SELLER DASHBOARD</p>
          <h1 className="text-4xl">{seller!.shop_name}</h1>
        </div>
        <ProductDialog />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[["Listings", products.length], ["New orders", pending], ["Collected sales", formatZAR(revenue)]].map(([l, v]) => (
          <div key={l} className="rounded border-2 border-foreground p-5">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>
      <Tabs defaultValue="products" className="mt-8">
        <TabsList><TabsTrigger value="products">Products</TabsTrigger><TabsTrigger value="orders">Orders</TabsTrigger></TabsList>
        <TabsContent value="products">
          {products.length === 0 && <p className="py-8 text-muted-foreground">No listings yet — add your first item.</p>}
          <div className="grid gap-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-4 rounded border p-3">
                <div className="h-16 w-14 overflow-hidden rounded bg-muted">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
                <div className="flex-1">
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-muted-foreground">{p.category} · {formatZAR(p.price)} · {p.stock} in stock {!p.active && "· hidden"}</p>
                </div>
                <Button size="icon-sm" variant="ghost" aria-label="Toggle visibility" onClick={async () => {
                  await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
                  qc.invalidateQueries({ queryKey: ["my-products"] });
                }}>{p.active ? <Eye /> : <EyeOff />}</Button>
                <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={async () => {
                  if (!confirm("Delete this item?")) return;
                  await supabase.from("products").delete().eq("id", p.id);
                  qc.invalidateQueries({ queryKey: ["my-products"] });
                }}><Trash2 /></Button>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="orders">
          {orders.length === 0 && <p className="py-8 text-muted-foreground">No orders yet.</p>}
          <div className="grid gap-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{o.customer_name} · {o.customer_phone}</p>
                  <StatusBadge status={o.status} />
                </div>
                <ul className="mt-2 text-sm text-muted-foreground">
                  {o.order_items.map((i) => <li key={i.id}>{i.quantity} × {i.title} {i.size && `(${i.size})`}</li>)}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="mr-auto font-bold">{formatZAR(o.total)}</span>
                  {o.status === "pending" && <Button size="sm" onClick={() => setStatus(o.id, "ready")}>Mark ready</Button>}
                  {o.status === "ready" && <Button size="sm" onClick={() => setStatus(o.id, "collected")}>Collected & paid</Button>}
                  {(o.status === "pending" || o.status === "ready") && <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "cancelled")}>Cancel</Button>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductDialog() {
  const { seller } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const empty = { title: "", description: "", price: "", category: CATEGORIES[0] ?? "Tops", sizes: "", stock: "1" };
  const [f, setF] = useState(empty);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let image_url: string | null = null;
    if (file) {
      const path = `${seller!.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "")}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
      if (upErr) { setBusy(false); return toast.error(upErr.message); }
      const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      image_url = data?.signedUrl ?? null;
    }
    const { error } = await supabase.from("products").insert({
      seller_id: seller!.id,
      title: f.title,
      description: f.description,
      price: Number(f.price),
      category: f.category,
      sizes: f.sizes,
      stock: Number(f.stock),
      image_url,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Item listed!");
    setF(empty);
    setFile(null);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["my-products"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Add item</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>List a new item</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Photo</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          <div><Label>Title</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Price (R)</Label><Input required type="number" min="0" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
            <div><Label>Stock</Label><Input type="number" min="0" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></div>
          </div>
          <div>
            <Label>Category</Label>
            <select className="h-9 w-full rounded border bg-background px-3 text-sm" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><Label>Sizes (comma separated)</Label><Input placeholder="S, M, L or 6, 7, 8" value={f.sizes} onChange={(e) => setF({ ...f, sizes: e.target.value })} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "List item"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
