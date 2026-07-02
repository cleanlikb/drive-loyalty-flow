import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Zap,
  Database,
  Users,
  PenTool,
  UploadCloud,
  Flag,
  Send,
  ShieldCheck,
  MousePointerClick,
  Lock,
  ArrowRight,
  CheckCircle2,
  Mail,
} from "lucide-react";
import logo from "@/assets/redrive-logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white text-foreground font-sans selection:bg-primary/30">
      <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main>
        <HeroSection />
        <PainSection />
        <SolutionSection />
        <BenefitsSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}

function Header({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="ReDrive" className="h-8 w-8 object-contain" />
          <span className="font-semibold text-lg tracking-tight">ReDrive</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#benefits">Benefits</NavLink>
          <Link to="/auth" className="ml-2">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>

        <button
          className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-4 flex flex-col gap-2">
          <MobileNavLink href="#how-it-works" onClick={() => setMobileOpen(false)}>How it works</MobileNavLink>
          <MobileNavLink href="#benefits" onClick={() => setMobileOpen(false)}>Benefits</MobileNavLink>
          <Link to="/auth" onClick={() => setMobileOpen(false)} className="mt-2">
            <Button className="w-full" size="lg">Get started</Button>
          </Link>
          <Link to="/auth" onClick={() => setMobileOpen(false)} className="text-center text-sm text-muted-foreground py-2">
            Already have an account? Sign in
          </Link>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </a>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="block px-3 py-3 rounded-md text-base font-medium text-foreground hover:bg-accent transition-colors"
    >
      {children}
    </a>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pt-24 pb-20 md:pt-32 md:pb-28">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[520px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase text-primary">
          For UK independent dealerships
        </span>
        <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground max-w-4xl mx-auto">
          Your best leads are the customers you&apos;ve already sold to.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Stop burning money on third-party leads. Our software finds every past customer hitting a 12 to 60-month ownership anniversary this month, automatically writes a personalised 3-email sequence, and lets you launch it in one click.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
            <Link to="/auth">
              Start your free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">No credit card required</p>
      </div>
    </section>
  );
}

function PainSection() {
  const pains = [
    {
      icon: Zap,
      title: "The Lead Addiction",
      body: "Buying expensive, low-quality, shared leads from third-party platforms just to survive.",
    },
    {
      icon: Database,
      title: "The Graveyard CRM",
      body: "Thousands of past customer details sitting gathering dust because salespeople are too busy dealing with today's walk-ins.",
    },
    {
      icon: Users,
      title: "Staff Turnover Leaks",
      body: "When salespeople leave, the customer relationships leave with them.",
    },
    {
      icon: PenTool,
      title: "Admin & Copywriting Paralysis",
      body: "Wanting to reach out but having zero time to track dates or figure out what to write.",
    },
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Why most independent dealers are leaking money every month</h2>
          <p className="mt-4 text-lg text-muted-foreground">These are the daily headaches ReDrive was built to eliminate.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {pains.map((pain) => (
            <div
              key={pain.title}
              className="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-5">
                <pain.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{pain.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{pain.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden bg-white">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">How it works</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-foreground">From dusty CRM to booked appointments in 3 steps</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <StepCard
            step={1}
            title="Securely upload or sync your previous customer list"
            body="Upload once or connect your sales data. We keep every record secure and only ever email on your behalf."
            mockup={<UploadMockup />}
          />
          <StepCard
            step={2}
            title="Our system automatically flags buyers hitting key finance or ownership milestones"
            body="Every month we surface customers at 12, 18, 24, 36, 48 or 60 months since their last purchase."
            mockup={<MilestoneMockup />}
          />
          <StepCard
            step={3}
            title="Review the AI-generated, personalised 3-email sequence and tap 'Approve' to send"
            body="Check three warm, personalised emails per customer, then hit one button to schedule the entire month."
            mockup={<SequenceMockup />}
          />
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  title,
  body,
  mockup,
}: {
  step: number;
  title: string;
  body: string;
  mockup: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
      <div className="p-8 pb-6">
        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-5">
          {step}
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-3 text-muted-foreground leading-relaxed">{body}</p>
      </div>
      <div className="mt-auto p-6 pt-0">
        {mockup}
      </div>
    </div>
  );
}

function UploadMockup() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center mb-3">
        <UploadCloud className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-foreground">sales-history.csv</p>
      <p className="text-xs text-muted-foreground mt-1">2,847 customers ready to import</p>
    </div>
  );
}

function MilestoneMockup() {
  const rows = [
    { name: "James Cooper", months: 36 },
    { name: "Sarah Mitchell", months: 24 },
    { name: "Daniel Evans", months: 48 },
  ];
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 border border-border">
          <span className="text-sm font-medium text-foreground">{row.name}</span>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">{row.months}m</span>
        </div>
      ))}
    </div>
  );
}

function SequenceMockup() {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-card px-3 py-2 border border-border">
            <div className="flex items-center gap-2 mb-1.5">
              <Mail className="h-3 w-3 text-primary" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Email {i}</span>
            </div>
            <div className="h-1.5 w-3/4 bg-muted rounded-full" />
            <div className="h-1.5 w-1/2 bg-muted rounded-full mt-1.5" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">24 customers</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <CheckCircle2 className="h-3 w-3" />
          Approve
        </span>
      </div>
    </div>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      icon: ShieldCheck,
      title: "Plugs the Leaky Bucket",
      body: "Artificially creates main-dealer/franchise style retention without the expensive service department.",
    },
    {
      icon: MousePointerClick,
      title: "1-Click Approvals",
      body: "Requires zero marketing or copywriting skills. We do 99% of the heavy lifting.",
    },
    {
      icon: Lock,
      title: "100% Exclusive Leads",
      body: "Stop competing with 5 local dealers for the same buyer. These customers already trust you.",
    },
  ];

  return (
    <section id="benefits" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">The payoff</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">Turn your CRM into a predictable profit engine</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="text-center md:text-left p-8">
              <div className="mx-auto md:mx-0 h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-6">
                <benefit.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold">{benefit.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{benefit.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-10 md:p-16 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
              Your best leads are already in your CRM.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Let&apos;s turn them into sales this month.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                <Link to="/auth">
                  Start your free account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="ReDrive" className="h-6 w-6 object-contain" />
          <span className="font-semibold tracking-tight">ReDrive</span>
        </Link>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} ReDrive. Built for UK independent car dealerships.
        </p>
      </div>
    </footer>
  );
}
