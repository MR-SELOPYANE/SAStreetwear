import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, type Product } from "@/lib/format";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SA Streetwear — Shop South Africa's street vendors" },
      { name: "description", content: "Discover clothes, sneakers and caps from local street vendors. Order online, pay on collection." },
      { property: "og:title", content: "SA Streetwear — Shop South Africa's street vendors" },
      { property: "og:description", content: "Discover clothes, sneakers and caps from local street vendors. Order online, pay on collection." },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", q, cat],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, sellers!inner(shop_name, location, phone, status)")
        .eq("active", true)
        .eq("sellers.status", "approved")
        .order("created_at", { ascending: false })
        .limit(60);
      if (q.trim()) query = query.or(`title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
      if (cat) query = query.eq("category", cat);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  return (
    <div>
      <section className="border-b">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[1.4fr_1fr] md:py-20">
          <div>
            <p className="text-xs font-bold tracking-[0.3em] text-muted-foreground">MZANSI · FROM THE CORNER TO YOUR CLOSET</p>
            <h1 className="mt-4 text-5xl leading-[0.95] sm:text-7xl">
              The street
              <br />
              <span className="bg-primary px-2 text-primary-foreground">is the store.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Real clothes from real vendors across South Africa. Find your fit, order online, and pay cash when you collect.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#shop" className="rounded bg-primary px-6 py-3 font-semibold text-primary-foreground">Shop now</a>
              <Link to="/sell" className="rounded border-2 border-foreground px-6 py-3 font-semibold">Become a seller</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            {[
              ["01", "Browse local vendors"],
              ["02", "Order what you like"],
              ["03", "Collect & pay cash"],
              ["04", "Ask our AI stylist"],
            ].map(([n, t]) => (
              <div key={n} className="rounded border-2 border-foreground p-4">
                <p className="font-display text-3xl">{n}</p>
                <p className="mt-1 text-sm font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl">Fresh drops</h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hoodies, sneakers…" className="pl-9" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[null, ...CATEGORIES].map((c) => (
            <button
              key={c ?? "all"}
              onClick={() => setCat(c)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                cat === c ? "border-foreground bg-primary text-primary-foreground" : "hover:border-foreground"
              }`}
            >
              {c ?? "All"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-10 rounded border-2 border-dashed p-12 text-center">
            <p className="font-display text-2xl">No items yet</p>
            <p className="mt-2 text-muted-foreground">
              Vendors are setting up their stalls. Are you a vendor?{" "}
              <Link to="/sell" className="font-semibold underline">List your clothes</Link>.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
