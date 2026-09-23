import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User, Store, Shield, LogOut, Package } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { session, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="bg-secondary py-1.5 text-center text-xs font-semibold tracking-wide text-secondary-foreground">
        ORDER ONLINE · PAY CASH ON COLLECTION · SUPPORT LOCAL VENDORS
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="font-display text-xl leading-none sm:text-2xl">
          SA<span className="mx-1 inline-block bg-primary px-1.5 text-primary-foreground">Street</span>wear
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
          <Link to="/sell" className="hidden rounded px-3 py-2 hover:bg-accent sm:inline-flex">
            Sell with us
          </Link>
          {isAdmin && (
            <Link to="/admin" className="hidden rounded px-3 py-2 hover:bg-accent sm:inline-flex">
              Admin
            </Link>
          )}
          <Link to="/cart" className="relative rounded p-2 hover:bg-accent" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded p-2 hover:bg-accent" aria-label="Account">
                <User className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate({ to: "/orders" })}>
                  <Package className="mr-2 h-4 w-4" /> My orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/sell" })}>
                  <Store className="mr-2 h-4 w-4" /> Seller dashboard
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <Shield className="mr-2 h-4 w-4" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth" className="rounded bg-primary px-4 py-2 text-primary-foreground">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
