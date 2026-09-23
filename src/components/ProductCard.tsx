import { Link } from "@tanstack/react-router";
import { MapPin, Shirt } from "lucide-react";
import { formatZAR, type Product } from "@/lib/format";

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link to="/product/$id" params={{ id: p.id }} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded border bg-muted">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Shirt className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          {p.category}
        </span>
      </div>
      <div className="mt-2">
        <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
        <p className="text-base font-bold">{formatZAR(p.price)}</p>
        {p.sellers && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {p.sellers.shop_name} · {p.sellers.location}
          </p>
        )}
      </div>
    </Link>
  );
}
