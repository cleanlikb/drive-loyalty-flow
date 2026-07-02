import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary grid place-items-center text-primary-foreground font-bold">S</div>
            <span className="font-semibold tracking-tight">Soldbook</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>
      <main>
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <span className="inline-block text-xs font-medium tracking-wide uppercase text-primary bg-primary/10 rounded-full px-3 py-1">For UK independent dealerships</span>
          <h1 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Your best leads are the customers you've already sold to.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Soldbook finds every customer hitting a 12, 18, 24, 36, 48 or 60-month anniversary this month, matches each one to a car in your live stock, and writes a personalised three-email sequence you approve in one click.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth"><Button size="lg">Start your free account</Button></Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No card required. Live in under five minutes.</p>
        </section>
        <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
          {[
            { title: "Monthly cohorts, on autopilot", body: "On the 1st of each month we surface every past buyer at a milestone. No spreadsheets." },
            { title: "Matched to your live stock", body: "We score each lead against the cars you have today — same make + newer year wins." },
            { title: "AI-written, dealer-approved", body: "Three warm emails per customer, in your voice, with real prices from your database." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
