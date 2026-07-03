import { chatJson } from "./ai-gateway.server";
import { formatDate } from "./format";

export type SequenceType = "trade_in" | "buy_back";

export const SEQUENCE_TYPES: { value: SequenceType; label: string; description: string }[] = [
  { value: "trade_in", label: "Trade-in / Upgrade", description: "Part-ex valuation and a newer model on similar monthlies." },
  { value: "buy_back", label: "Buy-back offer", description: "We'll buy the car back directly — skip WeBuyAnyCar and auctions." },
];

export interface SequenceInputs {
  dealership: string;
  salesperson: string;
  customerName: string;
  customerCarYearMakeModelTrim: string;
  purchaseDate: string;
  monthsSincePurchase: number;
  sequenceType?: SequenceType;
}

export interface GeneratedEmail { subject: string; body: string; }
export interface GeneratedSequence {
  email1: GeneratedEmail;
  email2: GeneratedEmail;
  email3: GeneratedEmail;
}

const FORMAT_RULES = `- British English, first person, warm, conversational — like a real salesperson typing a quick note.
- No marketing fluff, no exclamation stacks, no emojis, no hype.
- Never invent prices, mileage, finance figures, model years, specs or discounts.
- Every email MUST be under 100 words total (including greeting and sign-off). Aim for 55-90.
- The greeting MUST be on its own line, followed by a BLANK line, then the body. Example: "Hi James,\\n\\nHope the Qashqai's been treating you well..." — NEVER "Hi James, hope the Qashqai...".
- Structure the body as 2 to 4 SHORT paragraphs separated by a blank line (\\n\\n). Never one wall of text.
- Keep each paragraph to 1-2 sentences.
- End with a SOFT call-to-action on its own line — an easy no-pressure question or invite (e.g. "Worth a quick chat?", "Want me to keep an eye out?", "Reply with your mileage and I'll ping a ballpark over."). Never a hard sell, never a deadline.
- Sign off with only the salesperson's first name on its own line, then the dealership on the next line.`;


const SYSTEM = `You write short, warm, plain-text sales emails for a UK independent car dealership re-engaging previous customers.
${FORMAT_RULES}
Return strict JSON: { "email1": {"subject","body"}, "email2": {"subject","body"}, "email3": {"subject","body"} }.`;

const SINGLE_SYSTEM = `You rewrite one short, warm, plain-text sales email for a UK independent car dealership re-engaging a previous customer.
${FORMAT_RULES}
Return strict JSON: {"subject","body"}.`;

function firstName(s: string): string { return (s.split(/\s+/)[0] ?? s).trim(); }

function briefsFor(type: SequenceType): { one: string; two: string; three: string; overall: string } {
  if (type === "buy_back") {
    return {
      overall: "Angle: BUY-BACK. We want to buy their car back directly for our forecourt — no auction fees, no WeBuyAnyCar haggle, quick and simple.",
      one: "Day 0: warm check-in referencing their exact car and how long they've had it. Mention we're actively looking to buy back this exact model for stock and would offer directly. Soft CTA.",
      two: "Day 4: emphasise the benefit — direct offer, no auction fees, no admin, they don't need to be buying anything else to sell to us. Soft CTA inviting them to share current mileage for a ballpark.",
      three: "Day 10: low-friction soft close — invite them to reply with mileage or send a couple of photos so we can put a firm offer together. No pressure.",
    };
  }
  return {
    overall: "Angle: TRADE-IN / UPGRADE. Values on their model are still strong, and swapping into a newer version on similar monthlies is often more affordable than they'd expect.",
    one: "Day 0: warm check-in referencing their exact car and how long they've had it. Mention we've had strong part-exchange demand for their model recently. Soft CTA.",
    two: "Day 4: ask what they'd want in their next car — same make, an upgrade, or something different. Offer to keep an eye out. Soft CTA.",
    three: "Day 10: low-friction soft close — invite them to reply with current mileage so we can share a ballpark part-exchange figure. Soft CTA, no pressure.",
  };
}

export async function generateSequence(input: SequenceInputs): Promise<GeneratedSequence> {
  const type = input.sequenceType ?? "trade_in";
  const b = briefsFor(type);
  const user = `Dealership: ${input.dealership}
Salesperson: ${input.salesperson} (sign as "${firstName(input.salesperson)}")
Customer: ${input.customerName} (address as "${firstName(input.customerName)}")
Their car: ${input.customerCarYearMakeModelTrim}
Purchased: ${formatDate(input.purchaseDate)} (${input.monthsSincePurchase} months ago)

${b.overall}

Write three emails in this angle:
- Email 1 — ${b.one}
- Email 2 — ${b.two}
- Email 3 — ${b.three}

Remember: under 100 words each, 2-4 short paragraphs separated by blank lines, soft CTA on its own line.`;

  return await chatJson<GeneratedSequence>({ system: SYSTEM, user });
}

export interface RegenerateEmailInput extends SequenceInputs {
  step: 1 | 2 | 3;
  currentSubject?: string;
  currentBody?: string;
  instruction?: string;
}

export async function regenerateEmail(input: RegenerateEmailInput): Promise<GeneratedEmail> {
  const type = input.sequenceType ?? "trade_in";
  const b = briefsFor(type);
  const stepBrief = input.step === 1 ? b.one : input.step === 2 ? b.two : b.three;

  const user = `Dealership: ${input.dealership}
Salesperson: ${input.salesperson} (sign as "${firstName(input.salesperson)}")
Customer: ${input.customerName} (address as "${firstName(input.customerName)}")
Their car: ${input.customerCarYearMakeModelTrim}
Purchased: ${formatDate(input.purchaseDate)} (${input.monthsSincePurchase} months ago)

${b.overall}

Rewrite email step ${input.step}. Brief: ${stepBrief}
${input.currentSubject ? `Current subject (avoid repeating verbatim): ${input.currentSubject}` : ""}
${input.instruction ? `Extra instruction from the dealer: ${input.instruction}` : "Produce a fresh variation with different wording and angle."}

Remember: under 100 words, 2-4 short paragraphs separated by blank lines, soft CTA on its own line.`;

  return await chatJson<GeneratedEmail>({ system: SINGLE_SYSTEM, user });
}

export type ReplyClass = "replied" | "no_longer_owns" | "unsubscribe" | "interested" | "hot_lead";

export interface ReplyClassification {
  classification: ReplyClass;
  confidence: number;
  summary: string;
  next_car_notes?: string | null;
}

const CLASSIFY_SYSTEM = `You classify UK car dealership customer email replies. Return ONE classification:
- "no_longer_owns": they no longer own the car they bought from us (sold, written off, scrapped, gifted, part-exchanged elsewhere). Often mentions what they got instead.
- "unsubscribe": they explicitly want to stop receiving emails from us.
- "hot_lead": they express clear buying intent — ask for a valuation, ask to view a car, ask a specific question about a car, share their current mileage, propose a visit, or ask for prices.
- "interested": mild positive interest without clear intent (e.g. "keep me posted", "maybe later this year").
- "replied": anything else (questions unrelated to buying, small talk, out-of-office, negative tone that isn't unsubscribe).

Also extract "next_car_notes": if the reply mentions what car they currently drive or plan to buy next (make, model, year, budget, wish list), summarise it in <=25 words. Otherwise null.

Return strict JSON: {"classification","confidence" (0-1),"summary" (max 25 words),"next_car_notes"}.`;

export async function classifyReply(text: string): Promise<ReplyClassification> {
  const out = await chatJson<ReplyClassification>({
    system: CLASSIFY_SYSTEM,
    user: `Reply text:\n"""${text.slice(0, 2500)}"""`,
  });
  if (!out.next_car_notes) out.next_car_notes = null;
  return out;
}
