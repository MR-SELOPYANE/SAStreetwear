import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Phone, Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatZAR, type Product } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product — SA Streetwear" },
      { name: "description", content: "View this item from a local street vendor." },
      { property: "og:title", content: "Product — SA Streetwear" },
      { property: "og:description", content: "View this item from a local street vendor." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { add } = useCart();
  const [size, setSize] = useState("");
  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, sellers(shop_name, location, phone)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Product | null;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-6xl p-8">Loading…</div>;
  if (!p) return <div className="mx-auto max-w-6xl p-8">Item not found.</div>;
  const sizes = p.sizes.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <div className="aspect-[4/5] overflow-hidden rounded border bg-muted">
        {p.image_url ? (
          <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center"><Shirt className="h-16 w-16 text-muted-foreground" /></div>
        )}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{p.category}</p>
        <h1 className="mt-2 text-4xl">{p.title}</h1>
        <p className="mt-3 text-3xl font-bold">{formatZAR(p.price)}</p>
        <p className="mt-6 whitespace-pre-line text-muted-foreground">{p.description}</p>
        {sizes.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold">Size</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`min-w-12 rounded border-2 px-3 py-2 text-sm font-semibold ${size === s ? "border-foreground bg-primary text-primary-foreground" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button
          size="lg"
          className="mt-8 w-full"
          disabled={p.stock < 1}
          onClick={() => {
            if (sizes.length && !size) return toast.error("Pick a size first");
            add({
              productId: p.id,
              sellerId: p.seller_id,
              shopName: p.sellers?.shop_name ?? "",
              title: p.title,
              price: Number(p.price),
              imageUrl: p.image_url,
              size,
              quantity: 1,
            });
            toast.success("Added to cart");
          }}
        >
          {p.stock < 1 ? "Sold out" : "Add to cart"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Pay cash when you collect from the vendor.</p>
        {p.sellers && (
          <div className="mt-8 rounded border-2 border-foreground p-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground">SOLD BY</p>
            <Link to="/shop/$id" params={{ id: p.seller_id }} className="font-display text-xl hover:underline">
              {p.sellers.shop_name}
            </Link>
            <p className="mt-2 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /> {p.sellers.location}</p>
            {p.sellers.phone && (
              <a href={`https://wa.me/${p.sellers.phone.replace(/\D/g, "").replace(/^0/, "27")}`} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 text-sm underline">
                <Phone className="h-4 w-4" /> WhatsApp the vendor
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
