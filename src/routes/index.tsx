import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  Calculator,
  Check,
  Sparkles,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import logo from "@/assets/redrive-icon.png.asset.json";
import explainerAsset from "@/assets/redrive-explainer.mp4.asset.json";

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
        <VideoSection />
        <PainSection />
        <SolutionSection />
        <BenefitsSection />
        <PricingSection />
        <CalculatorSection />
        <PricingFAQ />
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
          <img src={logo.url} alt="ReDrive" className="h-9 w-9 object-contain" />
          <span className="font-semibold text-lg tracking-tight">ReDrive</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#benefits">Benefits</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
          <NavLink href="#calculator">ROI calculator</NavLink>
          <Link to="/contact" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors">
            Contact
          </Link>
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
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-violet-600 text-primary-foreground pt-24 pb-28 md:pt-32 md:pb-36">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.12),transparent_40%)] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase text-white">
          For UK independent dealerships
        </span>
        <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white">
          When did you last hear from a customer you sold a car to two years ago?
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
          They&apos;re due a new car right now. Someone&apos;s about to sell it to them. Is it you?
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="h-12 px-8 text-base bg-white text-primary hover:bg-white/90 shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow">
            <Link to="/auth">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="mt-3 text-sm text-white/70">No setup fees</p>
      </div>
    </section>
  );
}

function VideoSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
          See how it works in 60 seconds
        </h2>
        <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Watch how ReDrive turns your existing customer list into a reliable, low-cost source of extra sales and stock opportunities.
        </p>
        <div className="mt-10 rounded-2xl border border-border bg-card p-2 md:p-3 shadow-sm">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video
              src={explainerAsset.url}
              controls
              preload="metadata"
              playsInline
              webkit-playsinline="true"
              className="w-full h-full"
              aria-label="ReDrive explainer video"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PainSection() {
  const pains = [
    {
      icon: Zap,
      title: "How many of last year’s buyers are due a new car right now — and don’t know you’re still here?",
      body: "Most dealers pay auction fees and transport costs to source stock they've already sold once. ReDrive puts you back in touch with the owner before they trade it elsewhere.",
    },
    {
      icon: Database,
      title: "If a customer’s ready to upgrade next month, who finds out first — you, or the dealer who emails them first?",
      body: "Thousands of past buyers sit idle while you spend thousands on portals to find new ones. Past customers convert faster, trust you already, and cost almost nothing to reach.",
    },
    {
      icon: Users,
      title: "What’s it costing you to buy back at auction the same car you already sold once?",
      body: "When a salesperson leaves, their contact book often leaves too. ReDrive institutionalises the follow-up so your dealership owns the relationship, not the individual.",
    },
    {
      icon: PenTool,
      title: "Your CRM has the data. When’s the last time it actually sold you a car?",
      body: "Milestones pass, finance deals expire, and customers slip away. ReDrive automates the timing and the copy so it happens without eating your day.",
    },
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Why most independent dealers are leaving money on the table</h2>
          <p className="mt-4 text-lg text-muted-foreground">ReDrive fixes the four leaks that quietly drain profit from every dealership.</p>
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
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-foreground">So how do you get there before We Buy Any Car does?</h2>
          <p className="mt-4 text-lg text-muted-foreground">More sales, better relationships, cheaper stock — in 3 simple steps.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <StepCard
            step={1}
            title="Upload your previous customer sales in one CSV"
            body="Securely import the sales you already have. The more history, the more warm leads and buy-back opportunities surface every month."
            mockup={<UploadMockup />}
          />
          <StepCard
            step={2}
            title="We automatically flag every customer at the right moment"
            body="Each month we surface buyers at 12, 18, 24, 36, 48 or 60 months — exactly when they're likely to change car again."
            mockup={<MilestoneMockup />}
          />
          <StepCard
            step={3}
            title="Review the AI emails and approve the whole month in one click"
            body="Three warm, personalised emails per customer are written for you. Approve once, and ReDrive schedules everything automatically."
            mockup={<SequenceMockup />}
          />
        </div>
        <p className="mt-12 text-center text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          That&apos;s it. No campaigns to build, no lists to manage — most dealers spend under 10 minutes a month keeping it running.
        </p>
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

import stepCustomersCropped from "@/assets/step-customers-cropped.png";
import stepLeadsCropped from "@/assets/step-leads-cropped.png";
import stepSequencesCropped from "@/assets/step-sequences-cropped.png";

function ScreenshotFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm aspect-[16/11]">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function UploadMockup() {
  return <ScreenshotFrame src={stepCustomersCropped} alt="ReDrive customers page showing imported sales history" />;
}

function MilestoneMockup() {
  return <ScreenshotFrame src={stepLeadsCropped} alt="ReDrive monthly leads grouped by ownership milestone" />;
}

function SequenceMockup() {
  return <ScreenshotFrame src={stepSequencesCropped} alt="ReDrive AI-generated 3-email sequence preview" />;
}


function BenefitsSection() {
  const benefits = [
    {
      icon: MousePointerClick,
      title: "More sales, not more ad spend",
      body: "Every email goes to someone who already knows and trusts your dealership. No portal fees, no click costs, no competing against every other dealer in your postcode.",
    },
    {
      icon: ShieldCheck,
      title: "Buy back cars you previously sold",
      body: "Re-engaging past owners gives you first refusal on stock you understand. No auction buyer's premium, no transport, no surprises — just familiar cars you can retail with confidence.",
    },
    {
      icon: Users,
      title: "Stronger customer relationships",
      body: "A well-timed, personal email at a 12, 18 or 24-month milestone keeps you front of mind. Customers feel looked after, not sold to.",
    },
    {
      icon: Lock,
      title: "Marketing that works while you sleep",
      body: "The system runs automatically every month. Your team reviews the emails and clicks approve — everything else is handled.",
    },
    {
      icon: Sparkles,
      title: "No copywriting or marketing skills needed",
      body: "The AI writes every email in a warm, human tone, referencing the exact car the customer bought and a soft, natural call-to-action.",
    },
    {
      icon: Database,
      title: "Your CRM becomes a profit engine",
      body: "The same customer database you've already paid to acquire keeps producing leads. We turn dead data into live opportunities month after month.",
    },
  ];

  return (
    <section id="benefits" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">The payoff</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">The benefits that matter to your bottom line</h2>
          <p className="mt-4 text-lg text-muted-foreground">ReDrive is built to drive three outcomes: more sales, better retention, and cheaper stock.</p>
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

function CalculatorSection() {
  const [carsPerMonth, setCarsPerMonth] = useState(20);
  const [monthlyPayment, setMonthlyPayment] = useState(149);

  const PROFIT_PER_SALE = 2000;
  const CONVERSION_RATE = 0.005;

  const stats = useMemo(() => {
    const totalCustomers = carsPerMonth * 12 * 5;
    const monthlyLeads = carsPerMonth * 6; // 6 milestone cohorts surface each month
    const monthlyEmails = monthlyLeads * 3;
    const monthlySales = monthlyLeads * CONVERSION_RATE;
    const yearlySales = monthlySales * 12;
    const yearlyProfit = yearlySales * PROFIT_PER_SALE;
    const yearlyCost = monthlyPayment * 12;
    const netAnnualProfit = yearlyProfit - yearlyCost;
    return { totalCustomers, monthlyLeads, monthlyEmails, monthlySales, yearlySales, yearlyProfit, yearlyCost, netAnnualProfit };
  }, [carsPerMonth, monthlyPayment]);

  const formatSales = (n: number) => (n < 1 ? n.toFixed(1) : Math.round(n).toLocaleString());

  const plans = [
    { name: "Starter", price: 99 },
    { name: "Growth", price: 149 },
    { name: "Pro", price: 299 },
  ];

  return (
    <section id="calculator" className="py-24 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase text-primary">
            <Calculator className="h-3.5 w-3.5" />
            ROI calculator
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">See what your past sales could be worth</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Slide your average monthly sales and pick a plan. ReDrive re-engages those same customers at key milestones, turning history into a measurable return.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-xl shadow-primary/5">
          <div className="mb-10">
            <label htmlFor="sales-slider" className="block text-sm font-medium text-muted-foreground mb-4">
              Average cars sold per month
            </label>
            <div className="flex items-center gap-6">
              <Slider
                id="sales-slider"
                value={[carsPerMonth]}
                onValueChange={(value) => setCarsPerMonth(value[0])}
                min={1}
                max={200}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-2 min-w-[100px] justify-end">
                <input
                  type="number"
                  value={carsPerMonth}
                  onChange={(e) => setCarsPerMonth(Math.max(1, Math.min(200, Number(e.target.value) || 0)))}
                  className="w-20 h-10 rounded-lg border border-input bg-background px-3 text-right font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <label className="block text-sm font-medium text-muted-foreground mb-4">
              Your monthly ReDrive plan
            </label>
            <div className="flex flex-wrap gap-3">
              {plans.map((plan) => (
                <button
                  key={plan.name}
                  onClick={() => setMonthlyPayment(plan.price)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    monthlyPayment === plan.price
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-background border-border hover:border-primary/30"
                  }`}
                >
                  {plan.name} — £{plan.price}/mo
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <StatBox label="People re-engaged / month" value={stats.monthlyLeads.toLocaleString()} />
            <StatBox label="Estimated extra sales / month" value={formatSales(stats.monthlySales)} />
            <StatBox label="Estimated profit / year" value={`£${Math.round(stats.yearlyProfit).toLocaleString()}`} highlight />
            <StatBox label="Profit after subscription" value={`£${Math.round(stats.netAnnualProfit).toLocaleString()}`} />
          </div>

          <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
            <p className="text-sm text-muted-foreground">
              At a 0.5% conversion rate and{" "}
              <span className="font-semibold text-foreground">£{PROFIT_PER_SALE.toLocaleString()} profit per sale</span>,
              that&apos;s approximately{" "}
              <span className="font-semibold text-foreground">{formatSales(stats.yearlySales)} extra sales per year</span>{" "}
              generating{" "}
              <span className="font-semibold text-foreground">£{Math.round(stats.yearlyProfit).toLocaleString()} profit</span>{" "}
              after your{" "}
              <span className="font-semibold text-foreground">£{stats.yearlyCost.toLocaleString()} annual subscription</span>,
              leaving{" "}
              <span className="font-semibold text-foreground">£{Math.round(stats.netAnnualProfit).toLocaleString()} net profit</span>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 text-center border ${highlight ? "bg-primary/10 border-primary/20" : "bg-background/50 border-border"}`}>
      <div className={`text-3xl md:text-4xl font-semibold tracking-tight ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
      <div className="mt-2 text-sm text-muted-foreground leading-tight">{label}</div>
    </div>
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
              Your next customer already owns a car. It’s yours. Are you going to remind them?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Your customers are already changing cars. Let ReDrive make sure they change them with you.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                <Link to="/auth">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No setup fees</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const [annual, setAnnual] = useState(false);

  const tiers = [
    {
      name: "Starter",
      monthly: 99,
      limit: "1,000 past customers",
      popular: false,
      features: [
        "Automated monthly anniversary leads",
        "AI-generated 3-email sequences",
        "1-click approve & send",
        "Reply detection & unsubscribe handling",
      ],
    },
    {
      name: "Growth",
      monthly: 149,
      limit: "2,500 past customers",
      popular: true,
      features: [
        "Everything in Starter",
        "Custom dealer email domain",
        "Faster AI generation",
        "Open & click analytics",
        "Hot lead flagging",
      ],
    },
    {
      name: "Pro",
      monthly: 299,
      limit: "5,000 past customers",
      popular: false,
      features: [
        "Everything in Growth",
        "Multi-site dealership support",
        "Priority processing",
        "Advanced re-engagement logic",
        "Dedicated onboarding support",
      ],
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">Pricing</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">Worth more than one extra sale a month?</h2>
          <p className="mt-4 text-lg text-muted-foreground">One extra sale usually pays for the entire year. Pick a plan based on how many past customers you have.</p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!annual ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Billed monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all inline-flex items-center gap-2 ${annual ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Billed annually
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {tiers.map((tier) => {
            const price = annual ? Math.round(tier.monthly * 0.8) : tier.monthly;
            return (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border bg-card p-8 transition-all ${
                  tier.popular
                    ? "border-primary/40 shadow-xl shadow-primary/20 ring-1 ring-primary/30 md:-translate-y-2"
                    : "border-border hover:border-primary/20 hover:shadow-lg"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tier.limit}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-semibold tracking-tight">£{price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground h-4">
                  {annual ? `Billed £${price * 12} yearly` : "\u00A0"}
                </p>

                <ul className="mt-6 space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 h-5 w-5 rounded-full grid place-items-center flex-shrink-0 ${tier.popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    asChild
                    size="lg"
                    variant={tier.popular ? "default" : "outline"}
                    className={`w-full h-12 ${tier.popular ? "shadow-lg shadow-primary/25" : ""}`}
                  >
                    <Link to="/auth">Get started</Link>
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    No setup fees. Cancel or change plans anytime.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingFAQ() {
  const faqs = [
    {
      q: "What kind of results can I expect?",
      a: "Most dealers see an immediate uplift in warm enquiries from past customers. The system is designed to create more sales, strengthen relationships, and surface buy-back opportunities — all without portal or auction fees.",
    },
    {
      q: "What data do I need to upload?",
      a: "A simple CSV of your previous sales is enough: customer name, email, car details and sale date. ReDrive handles the rest and surfaces the right customers at the right milestone.",
    },
    {
      q: "How secure is my customer data?",
      a: "Fully GDPR compliant, encrypted at rest and in transit, and never shared or sold. We only ever email your customers on your behalf.",
    },
    {
      q: "Do I need marketing experience?",
      a: "None. ReDrive writes the emails, selects the timing, and manages replies. You just review and approve.",
    },
  ];

  return (
    <section className="py-16 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
        </div>
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card divide-y divide-border">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-0 px-6">
              <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo.url} alt="ReDrive" className="h-8 w-8 object-contain" />
          <span className="font-semibold tracking-tight">ReDrive</span>
        </Link>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} ReDrive. Built for UK independent car dealerships.
        </p>
      </div>
    </footer>
  );
}
