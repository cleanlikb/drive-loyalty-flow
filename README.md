# Car Connect

Build "Soldbook" — a SaaS tool for UK car dealerships that re-engages their previous customers by email, personalised to what the customer bought and what the dealer currently has in stock.

CORE CONCEPT — MONTHLY ANNIVERSARY COHORTS: on the 1st of each month the system finds every customer whose purchase was exactly 12, 18, 24, 36, 48 or 60 months ago. These form that month's lead list. The dealer gets notified, opens the list, selects all or individual customers, and starts email sequences for them with one click. Each selected customer gets a personalised 3-email sequence referencing their exact car/purchase and the closest-matching car currently in stock.

Full-stack with Supabase (auth + database). Build:

1. AUTH + ONBOARDING: signup, then a wizard: dealership name, salesperson name to sign emails from, website URL, upload sales history CSV (columns: customer name, email, vehicle reg, make, model, trim, sale date, sale price, finance type, finance term months — include a column-mapping step and handle missing columns gracefully).

2. MONTHLY LEADS PAGE (the home screen): shows the current month's cohort grouped by milestone (12 / 18 / 24 / 36 / 48 / 60 months since purchase). Each row: customer, their car, purchase date, milestone badge, best stock match with score, status. Checkbox selection with "select all" and per-milestone select. One primary button: "Start sequences for selected (n)". A scheduled edge function rebuilds cohorts on the 1st of each month and creates an in-app notification plus a notification email placeholder ("Your March leads are ready: 41 customers"). Exclude customers who are unsubscribed, marked "no longer owns car", currently in an active sequence, or contacted within the last 6 months.

3. STOCK INGESTION: (a) paste website stock-page URL — edge function fetches server-side and parses listings (make, model, year, trim, price, image URL, listing URL) into a stock table with daily scheduled refresh; (b) CSV upload fallback. Stock page with table and last-synced timestamp.

4. MATCHING: edge function scores each cohort customer against live stock: same make+model newer year scores highest, then same make similar model type, then similar price band vs original purchase. Store best match, score 0–100, and human-readable reasons.

5. SEQUENCE GENERATION: when the dealer starts sequences, Lovable AI writes 3 emails per selected customer: Email 1 (day 0) warm check-in referencing their exact car and time since purchase, mentioning part-ex demand for their model, no hard sell; Email 2 (day 4) introduces the matched stock car with its real price; Email 3 (day 10) low-friction close: "reply with your mileage and we'll send a part-exchange figure." Signed by the salesperson name from settings. Tone: personal, British English, short, no marketing fluff. Hard rule enforced in code: prices, specs and dates are injected verbatim from the database — the AI never invents numbers, discounts or finance figures.

6. SEQUENCE LIFECYCLE + REPLY HANDLING: email statuses drafted → scheduled → sent → stopped. Sends spaced day 0/4/10 via scheduled jobs; v1 marks emails sent with timestamps behind one abstracted dispatch function ready to connect to Resend or the dealer's inbox later. CRITICAL RULES: (a) any reply from a customer immediately cancels their remaining emails in the sequence; (b) if a reply indicates they no longer own the car, the customer is flagged "no longer owns car" and permanently removed from all future cohorts. For v1, replies are recorded via a "log reply" action on the customer where the dealer pastes or summarises the reply — include an AI classification step that reads the logged reply and automatically sets the right flag (replied / no longer owns / unsubscribe request / interested), with the customer's sequence updated accordingly. Structure this so inbound email webhooks can replace manual logging later. Unsubscribe flag also cancels everything and suppresses permanently. If the matched stock car leaves the feed mid-sequence, pause remaining emails and flag for re-match.

7. SEQUENCES PAGE: all active/completed sequences with per-email status timeline, plus per-customer view showing the 3 drafts (editable before each is sent).

8. DASHBOARD: this month's cohort size, sequences started, emails sent, replies, "no longer owns" removals, and a recent activity feed.

DESIGN: clean, professional, light-theme B2B SaaS aimed at dealership owners. Trustworthy, modern, strong data tables, no gimmicky motifs.

Seed realistic UK demo data: ~20 customers with purchase dates that land across the 12/18/24/36/48/60-month milestones for the current month (real UK models — Qashqai, Golf, Kuga, 3 Series, Sportage etc.), ~10 stock vehicles giving a spread of match scores, one active sequence, and one customer flagged "no longer owns car" so every state is visible.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://drive-loyalty-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1bdd85d3-118c-4c58-a924-6c8cee875ad8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
