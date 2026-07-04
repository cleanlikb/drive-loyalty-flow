import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/wynback-logo.png.asset.json";


// Only allow same-origin relative paths as post-auth targets, e.g. the OAuth
// consent URL. Prevents open-redirects via `?next=...`.
function safeNext(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const next = safeNext(search.next);
      if (next) throw redirect({ href: next });
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const safeNextPath = safeNext(next);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const emailRedirectTo = window.location.origin + (safeNextPath ?? "/dashboard");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo },
        });
        if (error) throw error;
        toast.success("Account created. Let's finish setting up your dealership.");
        if (safeNextPath) window.location.href = safeNextPath;
        else navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (safeNextPath) window.location.href = safeNextPath;
        else navigate({ to: "/dashboard" });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src={logo.url} alt="Wynback" className="h-10 w-auto object-contain" />
        </div>
        <Card className="p-6">
          <h1 className="text-lg font-semibold">{mode === "signup" ? "Create your account" : "Sign in"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signup" ? "Re-engage past car buyers in minutes." : "Welcome back."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center"
          >
            {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-6">
          By continuing you agree to keep customer data lawful under UK GDPR.
        </p>
      </div>
    </div>
  );
}
