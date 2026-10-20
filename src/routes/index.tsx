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
  Sparkles,
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
      { title: "Wynback — Your next sale is already in your customer list" },
      {
        name: "description",
        content:
          "Wynback emails every past buyer at the moments they're most likely to change car and puts their replies in your inbox. Built for UK independent car dealers.",
      },
      { property: "og:title", content: "Wynback — Your next sale is already in your customer list" },
      {
        property: "og:description",
        content: "Automatic, personal emails to past customers at 12–60 month ownership milestones. From £75/month, free setup.",
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
  return <span className="text-sm font-semibold text-primary uppercase tracking-wide">{children}</span>;
}

function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-14">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-foreground">{title}</h2>
      {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}
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
        <TimingSection />
        <HowItWorksSection />
        <EmailsSection />
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
          <h1 className="mt-5 text-[2.6rem] sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.95] text-foreground">
            Your next sale is already in your customer list<span className="text-primary">.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Wynback emails every past buyer at the moments they&apos;re most likely to change car, from 12 to 60 months after they bought, and puts their replies in your inbox. No portal fees. No cold leads. Under 10 minutes a month.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <DemoLink location="hero" className="h-14 px-7 text-base rounded-xl shadow-lg">
              Book a 20-minute demo <ArrowRight className="h-5 w-5" />
            </DemoLink>
            <Button asChild size="lg" variant="outline" className="h-14 px-7 text-base rounded-xl bg-background/80">
              <a href="#emails">See the emails</a>
            </Button>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-primary">
            {["Free setup, done for you", "Starts from a CSV", "Cancel anytime"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4" />{t}</li>
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
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Hi Emma, it&apos;s been three years since you drove away in your BMW 3 Series [AB23 DGL], so I wanted to see how you&apos;re getting on with it. We&apos;ve had a lot of interest in 3 Series part-exchanges lately. No pitch, just keeping in touch.
        </p>
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
    { t: "Every lead costs more, and none of them know you.", b: "Portals and ads put you in front of buyers who are comparing you with every dealer in the postcode. You pay again for every sale, and you win on price or not at all." },
    { t: "Happy customers buy their next car elsewhere.", b: "They liked you. But three years on, nobody's been in touch. So when they're ready to change, they open Autotrader like everyone else, and your name never comes up." },
    { t: "Follow-up never makes it to the top of the list.", b: "Between the phones, the prep and the test drives, nobody has a spare afternoon to write forty personal emails. So the customer database just sits there." },
    { t: "Their part-exchange goes to the car-buying sites.", b: "When an old customer changes car without you, you lose the sale and the trade-in. A car you sold, know and could retail again goes to an instant-offer site instead." },
  ];
  return (
    <section className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead
          eyebrow="The problem"
          title="You're paying to chase strangers while your best prospects go quiet."
          intro="The people most likely to buy from you are the ones who already have. Most dealers never speak to them again."
        />
        <div className="grid md:grid-cols-2 gap-6">
          {pains.map((p, i) => (
            <div key={p.t} className="rounded-2xl border border-border bg-card p-8">
              <span className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">{i + 1}</span>
              <h3 className="mt-4 text-xl font-semibold">{p.t}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{p.b}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-primary text-primary-foreground p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 justify-between">
          <p className="text-lg md:text-xl font-medium max-w-2xl">Wynback turns your past sales into a monthly list of warm prospects, and writes to every one of them for you.</p>
          <DemoLink location="problem_banner" variant="secondary" className="h-12 px-8 text-base shrink-0">
            Book a demo <ArrowRight className="h-4 w-4" />
          </DemoLink>
        </div>
      </div>
    </section>
  );
}

function TimingSection() {
  const ms = [
    { m: 12, t: "First year done", b: "A friendly check-in. Builds the relationship before they need anything." },
    { m: 18, t: "Settled in", b: "Life changes: a new job, a new baby, a longer commute." },
    { m: 24, t: "Two years in", b: "Shorter finance deals start to finish. Some are ready to upgrade." },
    { m: 36, t: "Classic change point", b: "Many PCP agreements run three years. Prime time to talk.", hi: true },
    { m: 48, t: "Four years in", b: "Longer agreements end. Mileage and bills start to climb." },
    { m: 60, t: "Five years on", b: "Plenty of owners are ready for something newer." },
  ];
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead
          eyebrow="The timing"
          title="Every buyer reaches a point where they start looking again."
          intro="Wynback watches the date each customer bought and gets in touch at six points in their ownership, so you're the first dealer they hear from."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ms.map((x) => (
            <div key={x.m} className={`rounded-2xl border p-6 ${x.hi ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card"}`}>
              <div className="text-3xl font-bold text-primary">{x.m} <span className="text-base font-medium text-muted-foreground">months</span></div>
              <h3 className="mt-2 font-semibold text-foreground">{x.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{x.b}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground max-w-3xl mx-auto">
          You choose which milestones to use. Customers who don&apos;t own the car any more, have unsubscribed, or were contacted in the last six months are left out automatically.
        </p>
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
    <section id="how-it-works" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead
          eyebrow="How it works"
          title="Set up once. A fresh list of prospects every month."
          intro="We do the setup. After that, your part takes under 10 minutes a month."
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


type EmailSet = { subject: string; body: string }[];
const exampleCustomers: { id: string; name: string; car: string; emails: EmailSet }[] = [
  {
    id: "emma",
    name: "Emma Clarke",
    car: "BMW 3 Series M Sport · owned 3 years",
    emails: [
      { subject: "Three years with the 3 Series", body: "Hi Emma, Hard to believe it's three years since you collected your 3 Series M Sport. I hope it's still putting a smile on your face. Three years is when a lot of owners start thinking about what's next, so I wanted you to hear from us first. No rush at all." },
      { subject: "What's next after the 3 Series?", body: "Hi Emma, Quick one. When the time comes to change, would you stay with a 3 Series, step up to something bigger, or try a hybrid? Tell me what you're after and I'll keep an eye out for the right car." },
      { subject: "A figure for your 3 Series?", body: "Hi Emma, Last one from me. 3 Series are in demand at the moment, so if you reply with your current mileage I'll come back with a part-exchange figure. No obligation." },
    ],
  },
  {
    id: "ben",
    name: "Ben Hughes",
    car: "Ford Kuga Titanium · owned 1 year",
    emails: [
      { subject: "A year with the Kuga", body: "Hi Ben, It's a year since you picked up your Kuga Titanium, so I wanted to say thanks again for buying from us. I hope you're enjoying it. And if any friends or family are looking for a car, we'd love to help them too." },
      { subject: "Still the right car?", body: "Hi Ben, A lot can change in a year. If the Kuga's still perfect, great. If you need more space, or something cheaper to run for a new commute, I'm always happy to chat." },
      { subject: "Here if you need us", body: "Hi Ben, I won't fill up your inbox. If you ever want to know what the Kuga's worth, reply with the mileage and I'll send you a figure." },
    ],
  },
  {
    id: "grace",
    name: "Grace Lloyd",
    car: "Vauxhall Corsa SRi · owned 5 years",
    emails: [
      { subject: "Five years with the Corsa", body: "Hi Grace, Five years ago you drove away in your Corsa SRi. I hope it's served you well. Around now a lot of owners start thinking about something newer, with lower running costs and the latest safety kit. Worth a look if you've been wondering." },
      { subject: "Something newer for you?", body: "Hi Grace, If you did fancy a change, what matters most this time? Lower running costs, an automatic, a bit more room? Let me know and I'll pick out a few that fit." },
      { subject: "What's the Corsa worth?", body: "Hi Grace, Last one from me. Reply with the Corsa's mileage and I'll tell you what it's worth against something newer." },
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
    <section id="emails" className="py-24 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead
          eyebrow="The emails"
          title="Short, personal emails that read like they came from you."
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
            <p className="mt-4 text-muted-foreground leading-relaxed">{e.body}</p>
            <p className="mt-4 text-foreground">James, Whitfield Motors</p>
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
    <section className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Built in" title="Designed so it never embarrasses you." intro="Automated doesn't mean careless. These rules are built into every sequence." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((x) => (
            <div key={x.t} className="rounded-2xl border border-border bg-card p-6">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><x.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold text-foreground">{x.t}</h3>
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
    { label: "Your time", w: "Under 10 minutes a month", p: "Managing listings and leads", d: "An afternoon a month, minimum" },
  ];
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Compared" title="The cheapest warm leads you'll ever get." />
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-left font-medium text-muted-foreground" />
                <th className="p-4 text-left font-semibold text-primary bg-primary/5">Wynback</th>
                <th className="p-4 text-left font-semibold text-foreground">Portals and paid ads</th>
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
    <section id="calculator" className="py-24 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide"><Calculator className="h-4 w-4" />ROI calculator</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">What could your customer list be worth?</h2>
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
    { name: "Forecourt", monthly: 75, limit: "Up to 125 previous customers a month", popular: false },
    { name: "Showroom", monthly: 125, limit: "Up to 250 previous customers a month", popular: true },
    { name: "Supersite", monthly: 175, limit: "Over 250 previous customers a month", popular: false },
  ];
  const features = [
    "Free setup. We import your data and configure everything",
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
    <section id="pricing" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Pricing" title="One extra sale pays for the year." intro="Simple monthly plans based on how many past customers we contact for you each month. Setup is free on every plan." />
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
              <div key={t.name} className={`relative flex flex-col rounded-2xl border bg-card p-8 ${t.popular ? "border-primary/40 shadow-xl shadow-primary/20 ring-1 ring-primary/30" : "border-border"}`}>
                {t.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Sparkles className="h-3 w-3" />Most popular
                  </span>
                )}
                <h3 className="text-xl font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.limit}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">£{price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground h-4">{annual ? `£${(price * 12).toLocaleString()} billed yearly` : "\u00A0"}</p>
                <DemoLink location={`pricing_${t.name.toLowerCase()}`} variant={t.popular ? "default" : "outline"} className="mt-8 w-full h-12">Book a demo</DemoLink>
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
    <section className="py-24 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Eyebrow>Why I built Wynback</Eyebrow>
        <Quote className="mx-auto mt-6 h-8 w-8 text-primary/40" />
        <blockquote className="mt-4 text-xl md:text-2xl text-foreground leading-relaxed">
          &ldquo;I spent 14 years in the motor trade, from sales exec to running my own dealership. The easiest deals were always the customers who came back. But following them all up never happened, because there was always something more urgent. Wynback does the follow-up I never had time for.&rdquo;
        </blockquote>
        <p className="mt-6 text-sm text-muted-foreground">— Kit Barrett, founder of Wynback</p>
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
    <section id="faq" className="py-24 bg-secondary/30">
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
    <section className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-10 md:p-16 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">Someone&apos;s going to sell your customer their next car. Make sure it&apos;s you.</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Book a 20-minute demo. We&apos;ll show you how many of your past customers hit a milestone this month.</p>
            <div className="mt-9 flex justify-center">
              <DemoLink location="final_cta" className={ctaClass}>Book a demo <ArrowRight className="h-4 w-4" /></DemoLink>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Free setup · No contract · Your data stays yours</p>
          </div>
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
