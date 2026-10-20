import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Menu,
  X,
  ArrowRight,
  Check,
  Minus,
  Plus,
  Flame,
  Reply,
  Ban,
  MailX,
  CalendarClock,
  Calculator,
  Eye,
  ShieldCheck,
  Quote,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import logo from "@/assets/wynback-logo.png.asset.json";
import dealerImg from "@/assets/dealer-forecourt.png.asset.json";
import stepCustomersCropped from "@/assets/step-customers-cropped.png";
import stepLeadsCropped from "@/assets/step-leads-cropped.png";
import stepSequencesCropped from "@/assets/step-sequences-cropped.png";
import { trackEvent } from "@/lib/analytics";

const DEMO_URL = "https://calendar.app.google/tjezLnaDgZ53Dhc78";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Wynback — Sell more cars. Make more profit." },
      {
        name: "description",
        content:
          "Sell more cars and make more profit from the customers you've already sold to. Wynback emails each past buyer at the moments they're most likely to change car and puts their replies in your inbox. Built for UK independent car dealers.",
      },
      { property: "og:title", content: "Wynback — Sell more cars. Make more profit." },
      {
        property: "og:description",
        content: "Sell more cars and make more profit from customers you've already sold to. Automatic, personal emails at 12–60 month ownership milestones. From £75/month, free setup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function DemoLink({
  location,
  children,
  className,
  variant = "default",
  size = "lg",
  onClick,
}: {
  location: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  onClick?: () => void;
}) {
  return (
    <Button asChild size={size} variant={variant} className={className}>
      <a
        href={DEMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackEvent("book_demo_clicked", { location });
          onClick?.();
        }}
      >
        {children}
      </a>
    </Button>
  );
}

const ctaClass = "h-12 px-8 text-base shadow-lg shadow-primary/25";

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-xs font-semibold text-primary uppercase tracking-[0.25em]">
      <span className="hidden lg:inline-block h-px w-8 bg-primary/60" />
      {children}
    </span>
  );
}

function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="mb-14 lg:mb-20 text-center max-w-3xl mx-auto lg:max-w-none lg:text-left lg:grid lg:grid-cols-12 lg:gap-12 lg:items-end">
      <div className="lg:col-span-7">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-4 text-3xl md:text-4xl lg:text-[3.25rem] font-semibold leading-[1.05] text-foreground text-balance">{title}</h2>
      </div>
      {intro && <p className="mt-4 lg:mt-0 lg:col-span-5 text-lg text-muted-foreground leading-relaxed">{intro}</p>}
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    const fired = new Set<number>();
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      setShowSticky(scrollTop > 700);
      const height = doc.scrollHeight - doc.clientHeight;
      if (height <= 0) return;
      const pct = Math.min(100, Math.round((scrollTop / height) * 100));
      for (const t of [25, 50, 75, 100]) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          trackEvent(`scroll_${t}`, { percent: t });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main>
        <HeroSection />
        <NumbersSection />
        <ProblemSection />
        <SolutionSection />
        <EmailsSection />
        <HowItWorksSection />
        <SafeguardsSection />
        <ComparisonSection />
        <CalculatorSection />
        <PricingSection />
        <FounderSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur p-3 transition-transform ${
          showSticky ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <DemoLink location="mobile_sticky" className="w-full h-12 text-base">
          Book a 20-minute demo <ArrowRight className="h-4 w-4" />
        </DemoLink>
      </div>
    </div>
  );
}

const navLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#emails", label: "The emails" },
  { href: "#pricing", label: "Pricing" },
  { href: "#calculator", label: "ROI" },
  { href: "#faq", label: "FAQ" },
];

function Header({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (o: boolean) => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo.url} alt="Wynback" className="h-8 w-auto object-contain" />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
          <Link to="/contact" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Contact
          </Link>
          <DemoLink location="header_nav" size="sm" className="ml-2">Book a demo</DemoLink>
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
        <div className="md:hidden border-t border-border bg-card px-4 py-4 flex flex-col gap-1">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block px-3 py-3 rounded-md text-base font-medium hover:bg-accent">
              {l.label}
            </a>
          ))}
          <Link to="/contact" onClick={() => setMobileOpen(false)} className="block px-3 py-3 rounded-md text-base font-medium hover:bg-accent">
            Contact
          </Link>
          <DemoLink location="mobile_nav" className="w-full mt-2" onClick={() => setMobileOpen(false)}>Book a demo</DemoLink>
        </div>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-[42vh] bottom-0 md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[60%]">
        <img src={dealerImg.url} alt="Dealership forecourt at sunset" className="h-full w-full object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 via-45% to-transparent md:bg-gradient-to-r md:via-background/30 md:via-50%" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-14 pb-12 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs md:text-sm font-medium tracking-[0.25em] uppercase text-muted-foreground">For UK independent car dealers</p>
          <h1 className="mt-5 text-[2.35rem] sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[0.98] text-foreground">
            <span className="block">Sell more cars.</span>
            <span className="block">Make more profit<span className="text-primary">.</span></span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            The buyers are already in your customer list. Wynback emails each one at the moments they&apos;re most likely to change car, from 12 to 60 months after they bought, and puts their replies in your inbox. No marketplace fees. No cold leads. Under 10 minutes a month.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <DemoLink location="hero" className="h-14 px-7 text-base rounded-xl shadow-lg">
              Book a 20-minute demo <ArrowRight className="h-5 w-5" />
            </DemoLink>
            <Button asChild size="lg" variant="outline" className="h-14 px-7 text-base rounded-xl bg-background/80">
              <a href="#emails">See the emails</a>
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {["Free setup, done for you", "Starts from a CSV", "Cancel anytime"].map((t) => (
              <li key={t} className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />{t}
              </li>
            ))}
          </ul>
        </div>
        <HeroEmail />
      </div>
    </section>
  );
}

function HeroEmail() {
  return (
    <div className="relative max-w-md w-full md:ml-auto space-y-3">
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-2xl p-5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Sent automatically · 36 months after purchase</span>
          <span className="rounded-full bg-muted px-2 py-0.5">Example</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">From <span className="text-foreground font-medium">James at Whitfield Motors</span> to <span className="text-foreground font-medium">Emma Clarke</span></p>
        <p className="mt-2 font-semibold text-foreground">Checking in — how&apos;s the 3 Series?</p>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>Hi Emma,</p>
          <p>It&apos;s been three years since you drove away in your BMW 3 Series, so I wanted to see how you&apos;re getting on with it.</p>
          <p>We&apos;ve had a lot of interest in 3 Series part-exchanges lately. No pitch, just keeping in touch.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur shadow-xl p-5 md:ml-8">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground"><Reply className="inline h-3.5 w-3.5 mr-1" />Emma replied · 2 hours later</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold"><Flame className="h-3 w-3" />Hot lead</span>
        </div>
        <p className="mt-2 text-sm text-foreground">&ldquo;Funny timing. It&apos;s on 41,000 miles and we were thinking about changing. What would you give me for it?&rdquo;</p>
      </div>
    </div>
  );
}

function NumbersSection() {
  const [cars, setCars] = useState(20);
  const clamp = (n: number) => Math.max(1, Math.min(500, n));
  return (
    <section className="py-16 bg-secondary/30 border-y border-border/60">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <p className="text-lg font-medium text-foreground">How many cars do you sell a month?</p>
        <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-border bg-card p-1.5">
          <button aria-label="Fewer" onClick={() => setCars((c) => clamp(c - 1))} className="h-10 w-10 rounded-full grid place-items-center hover:bg-accent"><Minus className="h-4 w-4" /></button>
          <span className="w-12 text-2xl font-semibold tabular-nums">{cars}</span>
          <button aria-label="More" onClick={() => setCars((c) => clamp(c + 1))} className="h-10 w-10 rounded-full grid place-items-center hover:bg-accent"><Plus className="h-4 w-4" /></button>
        </div>
        <p className="mt-6 text-2xl md:text-3xl font-semibold tracking-tight">
          <span className="text-primary">{(cars * 6).toLocaleString()}</span> of your past customers hit a buying milestone every month.
        </p>
        <p className="mt-3 text-lg text-muted-foreground">
          That&apos;s <span className="font-semibold text-foreground">{(cars * 72).toLocaleString()}</span> a year. Who&apos;s emailing them?
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Six milestones from 12 to 60 months after purchase, once you have five years of sales history.</p>
      </div>
    </section>
  );
}

function ProblemSection() {
  const pains = [
    { t: "The list never gets worked", b: "nobody has two spare days to go through it." },
    { t: "Milestones pass unseen", b: "the finance ends and the life change happens without you." },
    { t: "Every marketplace lead costs more", b: "and they're comparing you with every dealer nearby." },
    { t: "Happy customers buy elsewhere", b: "because nobody got in touch when they were ready." },
  ];
  return (
    <section className="py-16 md:py-24 lg:py-32 bg-ink text-ink-foreground">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-12 gap-10 lg:gap-16">
        <div className="lg:col-span-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">The problem</p>
          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.08] text-balance">You know you should be in touch when past customers are ready to change car. <span className="mt-3 block italic text-ink-muted">You don&apos;t have two days a month to do it consistently.</span></h2>
        </div>
        <div className="lg:col-span-6 lg:pt-10">
          <ol className="border-t border-ink-border">
            {pains.map((p, i) => (
              <li key={p.t} className="flex gap-5 border-b border-ink-border py-5">
                <span className="font-display text-sm text-ink-muted tabular-nums pt-0.5">0{i + 1}</span>
                <p className="leading-snug"><span className="font-semibold">{p.t}</span> <span className="text-ink-muted">{p.b}</span></p>
              </li>
            ))}
          </ol>
          <p className="mt-8 font-display text-xl lg:text-2xl leading-snug">
            Two days a month, every month — <span className="italic text-ink-muted">and that&apos;s only if you never miss one.</span>{" "}
            Wynback does the lot in under 10 minutes.
          </p>
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  const ms = [
    { m: 12, t: "Check-in", why: "the new-car shine has worn off and they've started noticing what else is out there." },
    { m: 18, t: "Life changes", why: "a new job, a baby or a move, and the car they bought stops fitting the life they've got." },
    { m: 24, t: "2-year deal ends", why: "the agreement is up, and part-exchange looks easier than another payment." },
    { m: 36, t: "PCP ends", hi: true, why: "the balloon payment lands. They settle it or hand the car back, and either way they're buying again." },
    { m: 48, t: "4-year deal ends", why: "the warranty is gone, repair bills start to loom and a newer car looks cheaper to run." },
    { m: 60, t: "Ready for newer", why: "five years of servicing and tax are climbing, while the car still trades well enough to put towards something newer." },
  ];
  return (
    <section className="py-16 md:py-24 lg:py-32 bg-paper">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 lg:gap-16">
        <div className="text-center lg:text-left lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>The solution</Eyebrow>
          <h2 className="mt-4 text-2xl md:text-4xl lg:text-[2.9rem] font-semibold leading-[1.08] text-balance">
            Wynback uses AI to work out when your customers are most likely to change car.
          </h2>
          <p className="mx-auto lg:mx-0 mt-5 max-w-2xl text-base lg:text-lg text-muted-foreground text-balance">
            Then it writes each one a personalised email at the milestones that matter &mdash; checked
            automatically every month, across your whole customer list.
          </p>
          <div className="hidden lg:block mt-10">
            <DemoLink location="solution" className="h-12 px-8 text-base rounded-full">
              Book a demo <ArrowRight className="h-4 w-4" />
            </DemoLink>
          </div>
        </div>

        <div className="lg:col-span-7">
          {/* Mobile / tablet: compact grid + reasons */}
          <div className="lg:hidden text-center">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              {ms.map((x) => (
                <div key={x.m} className={`rounded-xl border p-3 ${x.hi ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card"}`}>
                  <div className="text-2xl font-bold text-primary leading-none">{x.m}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">months</div>
                  <div className="mt-1.5 text-xs font-medium text-foreground leading-tight">{x.t}</div>
                </div>
              ))}
            </div>
            <p className="mt-10 text-sm font-semibold text-foreground">Why they move at each one</p>
            <div className="mx-auto mt-3 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card text-left">
              {ms.map((x) => (
                <div key={x.m} className="flex items-start gap-3 border-b border-border/70 p-4 last:border-b-0">
                  <span className={`mt-0.5 inline-flex h-7 shrink-0 items-center justify-center rounded-full px-2.5 text-[11px] font-bold ${x.hi ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                    {x.m} mo
                  </span>
                  <p className="text-sm leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground">{x.t}</span> &mdash; {x.why}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <DemoLink location="solution" className="h-12 px-8 text-base">
                Book a demo <ArrowRight className="h-4 w-4" />
              </DemoLink>
            </div>
          </div>

          {/* Desktop: editorial timeline */}
          <div className="hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Why they move at each one</p>
            <ol className="mt-6 border-t border-foreground/15">
              {ms.map((x) => (
                <li key={x.m} className={`grid grid-cols-[7rem_1fr] gap-6 border-b border-foreground/10 py-6 ${x.hi ? "relative" : ""}`}>
                  {x.hi && <span className="absolute -left-6 top-6 bottom-6 w-1 rounded-full bg-primary" />}
                  <div>
                    <span className={`font-display text-5xl leading-none tabular-nums ${x.hi ? "text-primary" : "text-foreground"}`}>{x.m}</span>
                    <span className="block mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">months</span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{x.t}{x.hi && <span className="ml-3 align-middle rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">Biggest moment</span>}</p>
                    <p className="mt-1.5 text-muted-foreground leading-relaxed">{x.why.charAt(0).toUpperCase() + x.why.slice(1)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { tag: "Step 1 · Once", t: "Wynback finds your customers in your existing sales data", b: "Everyone who's bought from you is already in your records. A simple export from your DMS or spreadsheet is all it needs: name, email, car and sale date. Setup is done for you.", img: stepCustomersCropped, alt: "Customers page" },
    { tag: "Step 2 · 1st of every month", t: "Your prospect list builds itself", b: "Wynback finds every customer hitting a milestone and lists them by how long they've owned the car. You get a notification when it's ready.", img: stepLeadsCropped, alt: "Monthly leads page" },
    { tag: "Step 3 · 10 minutes", t: "Approve the emails. Take the calls.", b: "Three short emails per customer, written about their exact car and signed by you. Read them, tweak anything, approve. Replies land in your inbox.", img: stepSequencesCropped, alt: "Email sequence page" },
  ];
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead
          eyebrow="How it works"
          title="Set up once. A fresh list of prospects every month."
          intro="Wynback does the setup. After that, your part takes under 10 minutes a month."
        />
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.tag} className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-8 pb-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">{s.tag}</span>
                <h3 className="mt-3 text-xl font-semibold">{s.t}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{s.b}</p>
              </div>
              <div className="mt-auto p-6 pt-0">
                <div className="rounded-xl border border-border overflow-hidden aspect-[16/11]">
                  <img src={s.img} alt={s.alt} loading="lazy" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


type EmailSet = { subject: string; body: string[] }[];
const exampleCustomers: { id: string; name: string; car: string; emails: EmailSet }[] = [
  {
    id: "emma",
    name: "Emma Clarke",
    car: "BMW 3 Series M Sport · owned 3 years",
    emails: [
      {
        subject: "Three years with the 3 Series",
        body: [
          "Hi Emma,",
          "Hard to believe it's three years since you collected your 3 Series M Sport. I hope it's still putting a smile on your face.",
          "Three years is when a lot of owners start thinking about what's next, so I wanted you to hear from us first.",
          "No rush at all.",
        ],
      },
      {
        subject: "What's next after the 3 Series?",
        body: [
          "Hi Emma,",
          "Quick one. When the time comes to change, would you stay with a 3 Series, step up to something bigger, or try a hybrid?",
          "Tell me what you're after and I'll keep an eye out for the right car.",
        ],
      },
      {
        subject: "A figure for your 3 Series?",
        body: [
          "Hi Emma,",
          "Last one from me. 3 Series are in demand at the moment, so if you reply with your current mileage I'll come back with a part-exchange figure.",
          "No obligation.",
        ],
      },
    ],
  },
  {
    id: "ben",
    name: "Ben Hughes",
    car: "Ford Kuga Titanium · owned 1 year",
    emails: [
      {
        subject: "A year with the Kuga",
        body: [
          "Hi Ben,",
          "It's a year since you picked up your Kuga Titanium, so I wanted to say thanks again for buying from us. I hope you're enjoying it.",
          "And if any friends or family are looking for a car, we'd love to help them too.",
        ],
      },
      {
        subject: "Still the right car?",
        body: [
          "Hi Ben,",
          "A lot can change in a year. If the Kuga's still perfect, great. If you need more space, or something cheaper to run for a new commute, I'm always happy to chat.",
        ],
      },
      {
        subject: "Here if you need us",
        body: [
          "Hi Ben,",
          "I won't fill up your inbox. If you ever want to know what the Kuga's worth, reply with the mileage and I'll send you a figure.",
        ],
      },
    ],
  },
  {
    id: "grace",
    name: "Grace Lloyd",
    car: "Vauxhall Corsa SRi · owned 5 years",
    emails: [
      {
        subject: "Five years with the Corsa",
        body: [
          "Hi Grace,",
          "Five years ago you drove away in your Corsa SRi. I hope it's served you well.",
          "Around now a lot of owners start thinking about something newer, with lower running costs and the latest safety kit.",
          "Worth a look if you've been wondering.",
        ],
      },
      {
        subject: "Something newer for you?",
        body: [
          "Hi Grace,",
          "If you did fancy a change, what matters most this time? Lower running costs, an automatic, a bit more room?",
          "Let me know and I'll pick out a few that fit.",
        ],
      },
      {
        subject: "What's the Corsa worth?",
        body: [
          "Hi Grace,",
          "Last one from me. Reply with the Corsa's mileage and I'll tell you what it's worth against something newer.",
        ],
      },
    ],
  },
];
const emailTabs = [
  { day: "Day 0", name: "Check-in", desc: "Warm hello, no selling" },
  { day: "Day 4", name: "What's next?", desc: "Opens the upgrade conversation" },
  { day: "Day 10", name: "Easy yes", desc: "One-line reply to get a figure" },
];

function EmailsSection() {
  const [cust, setCust] = useState(0);
  const [tab, setTab] = useState(0);
  const c = exampleCustomers[cust];
  const e = c.emails[tab];
  return (
    <section id="emails" className="py-24 lg:py-32 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead
          eyebrow="The emails"
          title="Emails designed to start conversations — and replies from customers ready to change or sell their car."
          intro={`No templates, no mail merge, no "Dear Valued Customer". Every email is written for one customer: the car they bought, how long they've had it and where they are in ownership. No two customers get the same email.`}
        />
        <p className="text-center text-sm text-muted-foreground mb-4">Pick an example customer to see how the emails change</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {exampleCustomers.map((x, i) => (
            <button
              key={x.id}
              onClick={() => setCust(i)}
              className={`rounded-xl border p-4 text-left transition-all ${i === cust ? "border-primary bg-card ring-1 ring-primary/30" : "border-border bg-card/60 hover:border-primary/30"}`}
            >
              <p className="font-semibold text-foreground">{x.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{x.car}</p>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-3 border-b border-border">
            {emailTabs.map((t, i) => (
              <button
                key={t.day}
                onClick={() => setTab(i)}
                className={`p-3 md:p-4 text-left border-b-2 transition-colors ${i === tab ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent/50"}`}
              >
                <p className="text-xs font-semibold text-primary">{t.day} — {t.name}</p>
                <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-foreground">{e.subject}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Example</span>
            </div>
            <div className="mt-4 space-y-3 text-muted-foreground leading-relaxed">
              {e.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="mt-6 text-foreground">James, Whitfield Motors</p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground max-w-3xl mx-auto">
          These are examples. Your emails are written fresh from each customer&apos;s own record, signed by you, and wait for your approval before anything sends. If a customer replies, the rest of their sequence stops straight away.
        </p>
      </div>
    </section>
  );
}

function SafeguardsSection() {
  const items = [
    { icon: Reply, t: "A reply stops everything", b: "The moment a customer replies, their remaining emails are cancelled. No awkward follow-ups." },
    { icon: Ban, t: "Sold the car? Removed for good", b: "If someone replies that they no longer own it, they're taken off every future list." },
    { icon: MailX, t: "Unsubscribes handled for you", b: "Every email has a one-click unsubscribe, and opt-outs are never emailed again." },
    { icon: CalendarClock, t: "No over-contacting", b: "Anyone contacted in the last six months is skipped, so nobody hears from you too often." },
    { icon: ShieldCheck, t: "No made-up numbers", b: "The AI never invents prices, discounts or finance figures. Facts come from your own records." },
    { icon: Eye, t: "You see everything first", b: "Every email waits for your approval. Edit, rewrite or skip anyone before it sends." },
  ];
  return (
    <section className="py-24 lg:py-32 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Built in" title="Designed so it never embarrasses you." intro="Automated doesn't mean careless. These rules are built into every sequence." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-foreground/15">
          {items.map((x, i) => (
            <div key={x.t} className="border-b border-foreground/10 py-8 sm:px-6 sm:[&:nth-child(odd)]:pl-0 lg:[&:nth-child(odd)]:pl-6 lg:[&:nth-child(3n+1)]:pl-0">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm text-muted-foreground tabular-nums">0{i + 1}</span>
                <x.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{x.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{x.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const rows: { label: string; w: ReactNode; p: ReactNode; d: ReactNode }[] = [
    { label: "Who you reach", w: "People who've already bought from you", p: "Anyone browsing", d: "Whoever you remember" },
    { label: "Who you're up against", w: "Nobody. It's your customer.", p: "Every dealer nearby", d: "Nobody" },
    { label: "Timing", w: "Automatic, at each ownership milestone", p: "When they're already shopping", d: "When you get round to it" },
    {
      label: "Monthly cost",
      w: <>From £75<span className="block text-xs text-muted-foreground">Free setup</span></>,
      p: <>Listing fees, ad spend or cost per lead<span className="block text-xs text-muted-foreground">Paid again for every buyer</span></>,
      d: "Hours of staff time",
    },
    { label: "Your time", w: "Under 10 minutes a month", p: "Managing listings and leads", d: "Two days a month" },
  ];
  return (
    <section className="py-24 lg:py-32 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Compared" title="The warm leads the marketplaces can't sell you." />
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-left font-medium text-muted-foreground" />
                <th className="p-4 text-left font-semibold text-primary bg-primary/5">Wynback</th>
                <th className="p-4 text-left font-semibold text-foreground">Marketplaces and paid ads</th>
                <th className="p-4 text-left font-semibold text-foreground">Doing it yourself</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium text-foreground">{r.label}</td>
                  <td className="p-4 bg-primary/5 font-medium text-foreground">{r.w}</td>
                  <td className="p-4 text-muted-foreground">{r.p}</td>
                  <td className="p-4 text-muted-foreground">{r.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CalculatorSection() {
  const [cars, setCars] = useState(20);
  const [profit, setProfit] = useState(2000);
  const [plan, setPlan] = useState(75);
  const plans = [
    { name: "Forecourt", price: 75 },
    { name: "Showroom", price: 125 },
    { name: "Supersite", price: 175 },
  ];
  const s = useMemo(() => {
    const contacted = cars * 6;
    const sales = contacted * 0.005 * 12;
    const gross = sales * profit;
    const net = gross - plan * 12;
    const cover = (plan * 12) / profit;
    return { contacted, sales, gross, net, cover };
  }, [cars, profit, plan]);
  const fmt = (n: number) => (n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString());

  return (
    <section id="calculator" className="py-24 lg:py-32 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide"><Calculator className="h-4 w-4" />ROI calculator</span>
          <h2 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">What could your customer list be worth?</h2>
          <p className="mt-4 text-lg text-muted-foreground">Move the sliders to match your dealership. The figures update as you go.</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 md:p-12 shadow-xl shadow-primary/5">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between text-sm mb-3"><span className="text-muted-foreground">Cars you sell per month</span><span className="font-semibold">{cars}</span></div>
              <Slider value={[cars]} onValueChange={(v) => setCars(v[0])} min={1} max={200} step={1} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-3"><span className="text-muted-foreground">Average profit per sale</span><span className="font-semibold">£{profit.toLocaleString()}</span></div>
              <Slider value={[profit]} onValueChange={(v) => setProfit(v[0])} min={500} max={5000} step={100} />
            </div>
          </div>
          <div className="mt-8">
            <p className="text-sm text-muted-foreground mb-3">Your Wynback plan</p>
            <div className="flex flex-wrap gap-3">
              {plans.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPlan(p.price)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${plan === p.price ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/30"}`}
                >
                  {p.name} £{p.price}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-10 rounded-2xl bg-primary/10 border border-primary/20 p-6 text-center">
            <p className="text-sm text-muted-foreground">Extra profit a year, after Wynback</p>
            <p className="mt-1 text-4xl md:text-5xl font-bold text-primary">£{Math.round(s.net).toLocaleString()}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatBox label="Past customers contacted a month" value={s.contacted.toLocaleString()} />
            <StatBox label="Extra sales a year" value={fmt(s.sales)} />
            <StatBox label="Profit from those sales" value={`£${Math.round(s.gross).toLocaleString()}`} />
            <StatBox label="Sales a year to cover the plan" value={s.cover.toFixed(1)} />
          </div>
          <p className="mt-6 text-xs text-muted-foreground text-center">
            Assumes six milestone groups a month (cars sold × 6 people contacted) and 0.5% of them buying again. An illustration, not a guarantee. Your demo uses your real numbers.
          </p>
        </div>
        <div className="mt-10 flex justify-center">
          <DemoLink location="calculator" className={ctaClass}>Get these numbers for your list <ArrowRight className="h-4 w-4" /></DemoLink>
        </div>
      </div>
    </section>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 text-center border border-border bg-background/50">
      <div className="text-2xl md:text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}

function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const tiers = [
    { name: "Forecourt", monthly: 75, limit: "Up to 125 previous customers a month", stock: "Est. up to 40 cars in stock" },
    { name: "Showroom", monthly: 125, limit: "Up to 250 previous customers a month", stock: "Est. up to 80 cars in stock" },
    { name: "Supersite", monthly: 175, limit: "Over 250 previous customers a month", stock: "Est. over 150 cars in stock" },
  ];
  const features = [
    "Free setup. Wynback imports your data and configures everything",
    "Replies go straight to your own inbox",
    "Milestones at 12, 18, 24, 36, 48 and 60 months",
    "AI-written emails about each customer's exact car",
    "Approve, edit or skip any email before it sends",
    "Simple dashboard: sent, replies and hot leads",
    "Unsubscribes handled automatically",
    "Export your data anytime. No lock-in",
    "Cancel anytime. No long contract",
  ];
  const coverLine = (yearly: number) => {
    const months = Math.floor(24000 / yearly);
    return `One £2,000 sale covers ${months} month${months === 1 ? "" : "s"}`;
  };

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Pricing" title="One extra sale pays for the year." intro="Simple monthly plans based on how many past customers Wynback contacts for you each month. Setup is free on every plan." />
        <div className="flex justify-center mb-12 -mt-4">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-full text-sm font-medium ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              Annually <span className="text-[10px] font-semibold uppercase">Save 20%</span>
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((t) => {
            const price = annual ? Math.round(t.monthly * 0.8) : t.monthly;
            const yearly = annual ? price * 12 : t.monthly * 12;
            return (
              <div key={t.name} className="relative flex flex-col rounded-2xl border border-border bg-card p-8">
                <h3 className="text-xl font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.limit}</p>
                <p className="mt-0.5 text-xs font-medium text-foreground/70">{t.stock}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">£{price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground h-4">{annual ? `£${(price * 12).toLocaleString()} billed yearly` : "\u00A0"}</p>
                <DemoLink location={`pricing_${t.name.toLowerCase()}`} variant="default" className="mt-8 w-full h-12">Book a demo</DemoLink>
                <p className="mt-3 text-center text-xs text-muted-foreground">{coverLine(yearly)}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-16 max-w-4xl mx-auto rounded-2xl border border-border bg-card p-8 md:p-10">
          <h3 className="text-center text-lg font-semibold mb-8">Every plan includes</h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0"><Check className="h-3 w-3" /></span>
                <span className="text-sm text-foreground/90">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FounderSection() {
  return (
    <section className="py-24 lg:py-36 bg-paper border-y border-border/60">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3">
          <Eyebrow>Why I built Wynback</Eyebrow>
          <Quote className="mt-6 h-10 w-10 text-primary/50" />
        </div>
        <div className="lg:col-span-9">
          <blockquote className="font-display text-2xl md:text-3xl lg:text-[2.6rem] leading-[1.25] text-foreground">
            &ldquo;I spent 14 years in the motor trade, from sales exec to running my own dealership. The easiest deals were always the customers who came back. But following them all up never happened, because there was always something more urgent. <span className="italic text-primary">Wynback does the follow-up I never had time for.</span>&rdquo;
          </blockquote>
          <p className="mt-8 text-sm font-medium tracking-wide text-muted-foreground">— Chris, founder of Wynback</p>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    { q: "How quickly can we get started?", a: "Wynback works from the sales data you already have, and setup is done for you: importing your records, choosing milestones and adding your email signature. You'll review your first month's list and emails with us before anything goes out." },
    { q: "What data do I need?", a: "A spreadsheet of past sales with the customer's name, email, the car they bought and the sale date. Extras like the reg, trim and price help the emails get more specific, but they're optional. No DMS integration needed." },
    { q: "Will the emails sound like a robot wrote them?", a: "No. They're short, plain and written in British English in your name, the way a good salesperson would write to a customer they remember. You can edit any email, or ask for it to be rewritten, before it sends." },
    { q: "What about GDPR and unsubscribes?", a: "Every email includes a one-click unsubscribe, and anyone who opts out is never emailed again. Customers who sold the car, or were contacted in the last six months, are skipped automatically. We'll go through how your data is used on the demo." },
    { q: "What happens when someone replies?", a: "The reply comes straight to your inbox and their remaining emails stop immediately. Wynback reads the reply and flags it: hot lead, interested, no longer owns the car, or unsubscribe. So you know who to call first." },
    { q: "What results can I expect?", a: "It depends on how many cars you've sold and how far back your records go. You're contacting people who already chose you once, at the point they're likely to change car. Use the calculator above for a rough idea, and we'll run your real numbers on the demo." },
    { q: "Is there a contract?", a: "No. Plans are monthly and you can cancel anytime. Annual billing saves 20% if you'd rather pay upfront. Your data is yours and you can export it whenever you like." },
  ];
  return (
    <section id="faq" className="py-24 lg:py-32 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Questions" title="Everything dealers ask us." />
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card divide-y divide-border">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} className="border-0 px-6">
              <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="bg-ink text-ink-foreground py-24 lg:py-36">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-end">
        <div className="lg:col-span-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">One last thing</p>
          <h2 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.02]">Someone&apos;s going to sell your customer their next car. <span className="italic text-ink-muted">Make sure it&apos;s you.</span></h2>
        </div>
        <div className="lg:col-span-4 lg:pb-2">
          <p className="text-lg text-ink-muted">Book a 20-minute demo. We&apos;ll show you how many of your past customers hit a milestone this month.</p>
          <DemoLink location="final_cta" className="mt-7 h-14 px-8 text-base rounded-full">Book a demo <ArrowRight className="h-4 w-4" /></DemoLink>
          <p className="mt-4 text-sm text-ink-muted">Free setup · No contract · Your data stays yours</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10 pb-24 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center">
          <img src={logo.url} alt="Wynback" className="h-7 w-auto object-contain" />
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground">How it works</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
        </nav>
        <div className="text-center md:text-right text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Wynback. Built for UK independent car dealers.</p>
          <p className="text-xs mt-1">Example emails and customers are illustrative.</p>
        </div>
      </div>
    </footer>
  );
}
