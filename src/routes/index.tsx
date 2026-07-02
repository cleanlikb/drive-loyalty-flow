import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, Calendar, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary grid place-items-center text-primary-foreground font-bold">S</div>
            <span className="font-semibold tracking-tight text-foreground">Soldbook</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <span className="inline-block text-xs font-medium tracking-wide uppercase text-primary bg-secondary rounded-full px-3 py-1 border border-border">
            For UK independent dealerships
          </span>
          <h1 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Your best leads are the customers you've already sold to.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Soldbook finds every customer hitting a 12, 18, 24, 36, 48 or 60-month anniversary this month, and writes a personalised three-email sequence you approve in one click.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth"><Button size="lg">Start your free account</Button></Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No card required. Live in under five minutes.</p>
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
          {[
            { icon: Calendar, title: "Monthly cohorts, on autopilot", body: "On the 1st of each month we surface every past buyer at a milestone. No spreadsheets." },
            { icon: Mail, title: "AI-written, dealer-approved", body: "Three warm emails per customer, in your voice, referencing their exact car and purchase date." },
            { icon: ShieldCheck, title: "Replies handled automatically", body: "Inbound replies are classified instantly. Hot leads are surfaced; unsubscribes are suppressed." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Soldbook. Built for UK car dealerships.
        </div>
      </footer>
    </div>
  );
}
