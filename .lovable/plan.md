## Goal

Stand up a US version of Wynback at **wynback.com** with its own backend and US-tuned content, while **wynback.co.uk** keeps running exactly as it does today.

You picked "Same app, region-aware content" **and** "Separate backends". A single Lovable project only has one backend, so the only way to get separate backends is to **fork this project into a second Lovable project** dedicated to the US. Both projects share the same codebase style (a "same app"), just deployed to different domains against different databases.

## Approach

```text
   ┌─────────────────────────────┐        ┌─────────────────────────────┐
   │   Wynback UK (this project) │        │   Wynback US (new project)  │
   │   wynback.co.uk             │        │   wynback.com               │
   │   GBP £ / UK spelling       │        │   USD $ / US spelling       │
   │   Calendly: kit-wynback     │        │   Calendly: US link (TBC)   │
   │   Backend: current Cloud    │        │   Backend: new Cloud        │
   └─────────────────────────────┘        └─────────────────────────────┘
```

## Steps

### 1. Create the US project (you, ~2 min)
- In the Lovable dashboard, use **Remix / Duplicate** on this project to create a new one called something like **wynback-us**.
- Open the new project and tell me you're inside it — I can only work on the project I'm currently connected to. From that point on, this UK project stays untouched.

### 2. Regionalise the copy inside the US project (me)
Inside the new US project I'll:
- Replace every `£` price on the landing page (pricing cards, ROI calculator inputs/outputs, FAQ) with USD equivalents. **Confirm the USD prices you want** — e.g. £99 → $129, £199 → $259, or just a straight FX conversion?
- Swap UK spelling / terminology for US throughout the marketing pages: *dealership* (kept), *colour → color*, *number plate → license plate*, *organisation → organization*, *whilst → while*, "petrol" → "gas", plus any UK-only phrasing in the FAQ and how-it-works copy.
- Replace the Calendly link `calendly.com/kit-wynback/30min` with your US booking link (mobile new-tab + desktop modal behaviour stays identical). **Send me the US Calendly URL** when you have it — if you don't yet, I'll leave the UK link in as a placeholder and swap it later.
- Update the root `<head>` title, meta description, OG tags, and any hard-coded `wynback.co.uk` strings to `wynback.com`.
- Update `robots.txt` / sitemap `BASE_URL` to `https://wynback.com`.

Everything backend-facing (dealer signup, sequences, replies inbox, Resend sender-domain rule, MCP) is kept identical — the US project just talks to its own new backend.

### 3. Connect wynback.com (you)
- In the US project: **Project Settings → Domains → Connect Domain → wynback.com** (and add `www.wynback.com`).
- Add the DNS records Lovable shows you at your registrar for wynback.com. SSL provisions automatically.
- The UK project keeps its existing custom domains (`wynback.co.uk`, `www.wynback.co.uk`, `wynback.com` is **not** currently connected to UK so there's no conflict to resolve).

### 4. US backend setup (me, in the US project)
- Lovable Cloud is enabled automatically on the new project (fresh database, fresh users — no US dealer data mixes with UK).
- Reconnect **Resend** in the US project so US replies flow through your Resend account (same account is fine; the connector just needs re-linking per project).
- Re-add these secrets in the US project's env: `CRON_SECRET`, `RESEND_FROM` (US sender if different), `RESEND_WEBHOOK_SECRET`, `INBOUND_WEBHOOK_SECRET`. **Confirm whether US replies should use the same `reply.wynback.co.uk` inbound domain or a new `reply.wynback.com`** — a `.com` reply address is more trustworthy to US dealers but needs a fresh Resend inbound domain + MX records.
- Point Resend's inbound webhook at the US project's stable URL: `https://project--{us-project-id}.lovable.app/api/public/webhooks/resend`.

### 5. Analytics separation (me, in the US project)
- Replace GA4 `G-HW40JP52ZD` with a **new US GA4 measurement ID**. **Create a new GA4 property for wynback.com and send me the ID** (or say "reuse the same one and I'll filter by hostname in GA4" — cheaper but less clean).
- Same choice for Microsoft Clarity — new project ID or reuse `xh6l2de07l`.

### 6. Keeping the two in sync going forward
Any future landing-page/product change you want on both sites means asking me to make it in each project. If that becomes painful later we can revisit and consolidate to one project with locale routing, but that would mean merging backends — not what you asked for.

## What I need from you before I start

1. Confirm you want me to proceed on this plan (and switch me to the newly-created US Lovable project).
2. USD prices for the pricing cards + ROI calculator defaults.
3. US Calendly URL (or "use UK link for now").
4. Whether US inbound replies use `reply.wynback.co.uk` or a new `reply.wynback.com`.
5. New GA4 + Clarity IDs, or "reuse UK ones".

## Technical notes

- Forking is done in the Lovable dashboard, not by me; I can't create a second project from inside this one.
- The `_authenticated` dealer app (dashboard, leads, sequences, replies inbox, MCP) ships to the US project unchanged — US dealers just sign up fresh against the US backend.
- All CTAs already route through the shared `BookDemoButton`, so a single URL swap covers every "Book a demo" on the page.
- The `wynback.com` custom domain currently listed on this UK project would need to be **removed here first** if you want it live on the US project — Lovable won't let the same domain be active on two projects. Say the word and I'll list the exact steps when we get there.
