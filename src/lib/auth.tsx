import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Seller = {
  id: string;
  shop_name: string;
  location: string;
  phone: string;
  bio: string;
  status: "pending" | "approved" | "rejected";
};

type AuthCtx = {
  session: Session | null;
  loading: boolean;
  roles: string[];
  seller: Seller | null;
  isAdmin: boolean;
  isSeller: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);

  const loadExtras = useCallback(async (s: Session | null) => {
    if (!s) {
      setRoles([]);
      setSeller(null);
      return;
    }
    const [{ data: r }, { data: sel }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
      supabase.from("sellers").select("*").eq("id", s.user.id).maybeSingle(),
    ]);
    setRoles((r ?? []).map((x) => x.role));
    setSeller((sel as Seller) ?? null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => void loadExtras(s), 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadExtras(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadExtras]);

  const value: AuthCtx = {
    session,
    loading,
    roles,
    seller,
    isAdmin: roles.includes("admin"),
    isSeller: roles.includes("seller"),
    refresh: () => loadExtras(session),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
