import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Clock, ArrowLeft, CheckCircle2 } from "lucide-react";
import logo from "@/assets/wynback-logo.jpg.asset.json";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Wynback — Talk to the team" },
      {
        name: "description",
        content:
          "Get in touch with the Wynback team. Questions about pricing, onboarding or how Wynback works for your dealership — we usually reply within one working day.",
      },
      { property: "og:title", content: "Contact Wynback" },
      {
        property: "og:description",
        content:
          "Talk to the Wynback team about pricing, onboarding or how it works for UK independent dealerships.",
      },
    ],
  }),
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    dealership: "",
    message: "",
  });

  const mailto = () => {
    const subject = encodeURIComponent(`Wynback enquiry from ${form.name || "a dealer"}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nDealership: ${form.dealership}\nEmail: ${form.email}\n\n${form.message}`,
    );
    window.location.href = `mailto:hello@wynback.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-foreground font-sans">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo.url} alt="Wynback" className="h-8 w-auto object-contain" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">Contact</span>
          <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
            Talk to the team
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Questions about pricing, onboarding, or whether Wynback is right for your
            dealership? Drop us a line — we usually reply within one working day.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <InfoCard
              icon={<Mail className="h-5 w-5" />}
              title="Email"
              body="hello@wynback.com"
              href="mailto:hello@wynback.com"
            />
            <InfoCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="Sales & demos"
              body="Book a 15-minute walkthrough tailored to your dealership."
            />
            <InfoCard
              icon={<Clock className="h-5 w-5" />}
              title="Response time"
              body="Mon–Fri, within one working day."
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            {submitted ? (
              <div className="text-center py-10">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <h2 className="mt-4 text-xl font-semibold">Thanks — your email client is open</h2>
                <p className="mt-2 text-muted-foreground">
                  If nothing happened, email us directly at{" "}
                  <a href="mailto:hello@wynback.com" className="text-primary underline">
                    hello@wynback.com
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mailto();
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Your name" id="name">
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Dealership" id="dealership">
                    <Input
                      id="dealership"
                      value={form.dealership}
                      onChange={(e) => setForm({ ...form, dealership: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Email" id="email">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label="How can we help?" id="message">
                  <Textarea
                    id="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </Field>
                <Button type="submit" size="lg" className="w-full">
                  Send message
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  This opens your email app with the message pre-filled.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{body}</div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block">
      {inner}
    </a>
  ) : (
    inner
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
