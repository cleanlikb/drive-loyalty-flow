import { chatJson } from "./ai-gateway.server";
import { formatDate, formatGbp } from "./format";

export interface SequenceInputs {
  dealership: string;
  salesperson: string;
  customerName: string;
  customerCarYearMakeModelTrim: string;
  purchaseDate: string;
  monthsSincePurchase: number;
  stock?: {
    year: number | null;
    make: string;
    model: string;
    trim: string | null;
    price: number | null;
  } | null;
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
- Never invent prices, mileage, finance figures, model years, specs or discounts. Only use values provided.
- Keep each email between 70 and 130 words.
- No hard sell in emails 1 or 2. Email 3 is a soft close.
- Sign off with only the salesperson's first name and the dealership on the next line.
Return strict JSON: { "email1": {"subject","body"}, "email2": {"subject","body"}, "email3": {"subject","body"} }.`;

function firstName(s: string): string { return (s.split(/\s+/)[0] ?? s).trim(); }

export async function generateSequence(input: SequenceInputs): Promise<GeneratedSequence> {
  const stockLine = input.stock
    ? `Best current stock match: ${input.stock.year ?? ""} ${input.stock.make} ${input.stock.model}${input.stock.trim ? " " + input.stock.trim : ""} at ${formatGbp(input.stock.price)}.`
    : `Best current stock match: none — mention part-exchange demand only, no specific vehicle.`;

  const user = `Dealership: ${input.dealership}
Salesperson: ${input.salesperson} (sign as "${firstName(input.salesperson)}")
Customer: ${input.customerName} (address as "${firstName(input.customerName)}")
Their car: ${input.customerCarYearMakeModelTrim}
Purchased: ${formatDate(input.purchaseDate)} (${input.monthsSincePurchase} months ago)
${stockLine}

Write three emails:
- Email 1 (day 0): warm check-in referencing their exact car and how long they've had it. Mention that we've had strong part-exchange demand for their model recently. No pitch.
- Email 2 (day 4): introduce the matched stock car verbatim (year, make, model, trim, price). Two short lines on why it might suit them (upgrade, similar price band, newer year). No urgency.
- Email 3 (day 10): low-friction close — ask them to reply with current mileage so we can send a personalised part-exchange figure. One line.

If no stock match was provided, email 2 should ask what they'd want in their next car and email 3 should offer to keep an eye on incoming stock.`;

  const parsed = await chatJson<GeneratedSequence>({ system: SYSTEM, user });

  if (input.stock?.price) {
    const priceStr = formatGbp(input.stock.price);
    const priceDigits = String(Math.round(Number(input.stock.price)));
    const body2 = parsed.email2?.body ?? "";
    if (!body2.includes(priceStr) && !body2.includes(priceDigits)) {
      parsed.email2.body = body2.trimEnd() + `\n\nThe car is ${input.stock.year ?? ""} ${input.stock.make} ${input.stock.model}${input.stock.trim ? " " + input.stock.trim : ""}, priced at ${priceStr}.`;
    }
  }
  return parsed;
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
