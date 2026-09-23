import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SA Streetwear" },
      { name: "description", content: "Sign in or create your SA Streetwear account." },
      { property: "og:title", content: "Sign in — SA Streetwear" },
      { property: "og:description", content: "Sign in or create your SA Streetwear account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (data.session) navigate({ to: "/" });
      else toast.success("Check your email to confirm your account.");
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) return toast.error(String(r.error.message ?? r.error));
    if (r.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl">{mode === "in" ? "Welcome back" : "Join the street"}</h1>
      <p className="mt-2 text-muted-foreground">Shoppers and vendors use the same account.</p>
      <Button variant="outline" className="mt-8 w-full" onClick={google}>
        Continue with Google
      </Button>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === "up" && (
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "in" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <button className="mt-6 text-sm underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
