# Soldbook — Build Plan

A UK dealership re-engagement SaaS. Full-stack on TanStack Start + Lovable Cloud (Supabase) + Lovable AI. Below is the shipping plan for v1.

## Assumptions
- Single-tenant per dealer account (one dealership per user, no team seats in v1).
- Emails are "dispatched" via an abstracted function that just marks sent + timestamp (no Resend wired yet); dispatch function is structured so a provider can be plugged in later.
- Stock URL scraping uses a generic HTML parser (cheerio-style regex + JSON-LD detection) inside a server function. Best-effort; CSV fallback always available.
- Reply handling in v1 = manual "log reply" action, AI-classified. Structured so an inbound webhook route can replace it.
- British English throughout, GBP.

## Design system
- Light B2B SaaS. Deep navy primary (`oklch(0.28 0.08 255)`), warm off-white background, subtle borders, one accent (amber for milestone badges by tier). Inter for body, tighter tracking on headings. No gradients, no purple. Strong tables with zebra + sticky headers.
- Update `src/styles.css` tokens; add milestone badge variants (12/18/24/36/48/60) with distinct muted hues.

## Data model (Supabase)
Tables (all with RLS scoped to `auth.uid()` via `dealer_id` FK → `dealers.user_id`; GRANTs to authenticated + service_role):

- `dealers` — user_id, dealership_name, salesperson_name, website_url, onboarded_at.
- `customers` — dealer_id, name, email, vehicle_reg, make, model, trim, sale_date, sale_price, finance_type, finance_term_months, status enum (`active`, `no_longer_owns`, `unsubscribed`), last_contacted_at.
- `stock` — dealer_id, make, model, year, trim, price, image_url, listing_url, source (`scrape`/`csv`), first_seen_at, last_seen_at, active.
- `stock_syncs` — dealer_id, source_url, ran_at, items_found, status, error.
- `cohorts` — dealer_id, month (date, 1st of month), created_at.
- `cohort_customers` — cohort_id, customer_id, milestone_months, best_stock_id, match_score, match_reasons (jsonb), selected, sequence_id nullable.
- `sequences` — dealer_id, customer_id, cohort_customer_id, stock_id, status (`drafting`, `scheduled`, `active`, `completed`, `stopped`, `paused_rematch`), started_at, stopped_reason.
- `sequence_emails` — sequence_id, step (1/2/3), send_offset_days, subject, body, status (`draft`, `scheduled`, `sent`, `cancelled`), scheduled_for, sent_at.
- `replies` — sequence_id, customer_id, raw_text, classification (`replied`, `no_longer_owns`, `unsubscribe`, `interested`), created_at.
- `notifications` — dealer_id, kind, title, body, read_at, created_at.
- `activity_log` — dealer_id, kind, payload jsonb, created_at.

Trigger: on `auth.users` insert → create `dealers` row.

## Server functions & routes
Client-safe `.functions.ts` under `src/lib/`:
- `onboarding.functions.ts` — save wizard, ingest customers CSV with column mapping.
- `stock.functions.ts` — save stock URL, trigger scrape, upload CSV, list stock.
- `cohorts.functions.ts` — build current cohort, list cohorts, toggle selection.
- `sequences.functions.ts` — start sequences for selected (calls AI), list, get, update draft, stop, log reply (with AI classification).
- `dashboard.functions.ts` — stats + activity feed.
- `notifications.functions.ts` — list, mark read.

Public/cron server routes under `src/routes/api/public/`:
- `cron/monthly-cohort.ts` — HMAC-verified; runs 1st of month, rebuilds cohorts + notifications for every dealer.
- `cron/stock-refresh.ts` — daily; re-scrapes each dealer's saved stock URL.
- `cron/dispatch-emails.ts` — every 15 min; sends `scheduled` emails whose time is due (marks sent).
- `webhooks/inbound-reply.ts` — placeholder route for future email provider webhooks.

AI (Lovable AI Gateway, `google/gemini-3-flash-preview`) in a `.server.ts` helper:
- `generateSequence(customer, stockMatch, dealer)` → 3 emails with strict rule: prices/specs/dates injected verbatim as template placeholders the AI must copy, validated post-generation (regex-check that quoted price matches stock price).
- `classifyReply(text)` → one of the 4 classes + confidence.

## UI routes (under `_authenticated/`)
- `/onboarding` — 4-step wizard (dealership → salesperson/site → CSV upload → column mapping preview → confirm).
- `/` (dashboard) — stats cards + activity feed + "View this month's leads" CTA.
- `/leads` — current cohort grouped by milestone; select-all, per-milestone select, bulk start.
- `/stock` — table + "Sync now", add URL, upload CSV.
- `/sequences` — list active + completed; row → detail.
- `/sequences/$id` — 3-email timeline, editable drafts, stop button, log-reply action.
- `/customers` — full list, filter, per-customer detail with history + flags.
- `/settings` — dealership + salesperson + website.
- `/auth` — email/password sign in + sign up (public route).

## Seed data
Migration inserts, for a special demo dealer created on first signup OR via a "Load demo data" button on empty dashboard (button preferred so it's per-user):
- 20 UK customers spanning the 6 milestone anchors for current month.
- 10 stock vehicles (mix of exact upgrades, similar models, mismatches).
- 1 active sequence mid-flight (email 1 sent, email 2 scheduled).
- 1 customer flagged `no_longer_owns`.
- 1 unread notification.

## Build order (single pass)
1. Enable Lovable Cloud.
2. Migration: enums, all tables, GRANTs, RLS, signup trigger.
3. Design tokens in `styles.css`, shared layout shell (sidebar nav, top bar with notifications bell).
4. Auth pages + `_authenticated` gate is integration-managed.
5. Onboarding wizard + CSV parsing (papaparse) + column mapping.
6. Stock ingestion (URL + CSV) + stock page.
7. Cohort builder logic + Leads page.
8. Matching algorithm (pure TS in `.server.ts`).
9. AI sequence generation + Sequences pages + reply logging with AI classify.
10. Dashboard + notifications.
11. Cron routes + `CRON_SECRET`.
12. "Load demo data" server fn + button.

## Out of scope for v1 (explicit)
- Real email sending (Resend hookup) — abstracted dispatcher only.
- Real inbound email webhook — route stub only.
- Multi-user teams, billing, custom domains.

Shall I proceed with this plan?
