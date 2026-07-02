import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Mail, Calendar, ShieldCheck, Calculator } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function formatNumber(n: number) {
  return n.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

function CalculatorSection() {
  const [carsPerMonth, setCarsPerMonth] = useState(30);
  const milestones = 6;
  const peopleEmailed = carsPerMonth * milestones;
  const emailsSent = peopleEmailed * 3;
  const salesPerMonth = peopleEmailed * 0.01;
  const salesPerYear = salesPerMonth * 12;

  return (
    <section className="max-w-5xl mx-auto px-6 pb-24">
      <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">See what Soldbook could generate for you</h2>
            <p className="text-sm text-muted-foreground">Based on 6 anniversary milestones per customer and a 1% reply-to-sale rate.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <div>
              <label htmlFor="carsPerMonth" className="block text-sm font-medium text-foreground mb-2">
                Average cars sold per month
              </label>
              <div className="flex items-center gap-4">
                <Input
                  id="carsPerMonth"
                  type="number"
                  min={1}
                  max={200}
                  value={carsPerMonth}
                  onChange={(e) => setCarsPerMonth(Math.max(1, Math.min(200, Number(e.target.value) || 0)))}
                  className="w-28 text-center bg-background"
                />
                <span className="text-sm text-muted-foreground">cars / month</span>
              </div>
            </div>
            <Slider
              value={[carsPerMonth]}
              onValueChange={(v) => setCarsPerMonth(v[0])}
              min={1}
              max={200}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Assumes you have sold at roughly this monthly rate over the last 5 years, so each month a matching cohort reaches a 12, 18, 24, 36, 48 or 60-month anniversary.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="People emailed per month" value={formatNumber(peopleEmailed)} />
            <MetricCard label="Emails sent per month" value={formatNumber(emailsSent)} />
            <MetricCard label="Extra sales per month" value={formatNumber(salesPerMonth)} accent />
            <MetricCard label="Extra sales per year" value={formatNumber(salesPerYear)} accent />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-muted-foreground">
              At {carsPerMonth} cars/month, Soldbook would email <span className="font-medium text-foreground">{formatNumber(peopleEmailed)}</span> past customers every month and potentially convert <span className="font-medium text-foreground">{formatNumber(salesPerYear)}</span> extra sales per year.
            </p>
            <Link to="/auth"><Button>Start your free account</Button></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-border p-5 ${accent ? "bg-primary text-primary-foreground" : "bg-background"}`}>
      <div className={`text-xs uppercase tracking-wide ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</div>
      <div className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">{value}</div>
    </div>
  );
}

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

        <CalculatorSection />

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
