import { chatJson } from "./ai-gateway.server";
import { formatDate } from "./format";

export interface SequenceInputs {
  dealership: string;
  salesperson: string;
  customerName: string;
  customerCarYearMakeModelTrim: string;
  purchaseDate: string;
  monthsSincePurchase: number;
}

export interface GeneratedEmail { subject: string; body: string; }
export interface GeneratedSequence {
  email1: GeneratedEmail;
  email2: GeneratedEmail;
  email3: GeneratedEmail;
}

const SYSTEM = `You write short, warm, plain-text sales emails for a UK independent car dealership re-engaging previous customers. Rules:
- British English, first person, conversational.
- No marketing fluff, no exclamation stacks, no emojis.
- Never invent prices, mileage, finance figures, model years, specs or discounts.
- Every email MUST be under 120 words total (including greeting and sign-off). Aim for 70-110.
- Every email ends with a SOFT call-to-action — an easy, no-pressure question or invitation (e.g. "worth a quick chat?", "want me to keep an eye out?", "happy to share a ballpark if useful — just reply with your mileage"). Never a hard sell, never a deadline.
- Sign off with only the salesperson's first name and the dealership on the next line.
Return strict JSON: { "email1": {"subject","body"}, "email2": {"subject","body"}, "email3": {"subject","body"} }.`;

const SINGLE_SYSTEM = `You rewrite one short, warm, plain-text sales email for a UK independent car dealership re-engaging a previous customer. Rules:
- British English, first person, conversational.
- No marketing fluff, no exclamation stacks, no emojis.
- Never invent prices, mileage, finance figures, model years, specs or discounts.
- MUST be under 120 words total (including greeting and sign-off). Aim for 70-110.
- End with a SOFT call-to-action — easy, no-pressure. Never a hard sell.
- Sign off with only the salesperson's first name and the dealership on the next line.
Return strict JSON: {"subject","body"}.`;

function firstName(s: string): string { return (s.split(/\s+/)[0] ?? s).trim(); }

export async function generateSequence(input: SequenceInputs): Promise<GeneratedSequence> {
  const user = `Dealership: ${input.dealership}
Salesperson: ${input.salesperson} (sign as "${firstName(input.salesperson)}")
Customer: ${input.customerName} (address as "${firstName(input.customerName)}")
Their car: ${input.customerCarYearMakeModelTrim}
Purchased: ${formatDate(input.purchaseDate)} (${input.monthsSincePurchase} months ago)

Write three emails:
- Email 1 (day 0): warm check-in referencing their exact car and how long they've had it. Mention that we've had strong part-exchange demand for their model recently. No pitch.
- Email 2 (day 4): ask what they'd want in their next car — same make, an upgrade, something different. Offer to keep an eye out. No specific vehicle.
- Email 3 (day 10): low-friction close — ask them to reply with current mileage so we can send a personalised part-exchange figure. One line.`;

  return await chatJson<GeneratedSequence>({ system: SYSTEM, user });
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
