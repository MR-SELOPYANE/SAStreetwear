import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/format";

export const Route = createFileRoute("/shop/$id")({
  head: () => ({
    meta: [
      { title: "Vendor shop — SA Streetwear" },
      { name: "description", content: "Browse everything this street vendor has for sale." },
      { property: "og:title", content: "Vendor shop — SA Streetwear" },
      { property: "og:description", content: "Browse everything this street vendor has for sale." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["shop", id],
    queryFn: async () => {
      const [{ data: seller }, { data: products }] = await Promise.all([
        supabase.from("sellers").select("*").eq("id", id).maybeSingle(),
        supabase.from("products").select("*, sellers(shop_name, location, phone)").eq("seller_id", id).eq("active", true),
      ]);
      return { seller, products: (products ?? []) as unknown as Product[] };
    },
  });
  if (!data?.seller) return <div className="mx-auto max-w-7xl p-8">Loading…</div>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="rounded bg-secondary p-8 text-secondary-foreground">
        <h1 className="text-4xl">{data.seller.shop_name}</h1>
        <p className="mt-2 flex items-center gap-2 opacity-80"><MapPin className="h-4 w-4" /> {data.seller.location}</p>
        {data.seller.bio && <p className="mt-4 max-w-2xl opacity-80">{data.seller.bio}</p>}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {data.products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}
