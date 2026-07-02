import { chatJson } from "./ai-gateway.server";
import { formatDate, formatGbp } from "./format";

export interface SequenceInputs {
  dealership: string;
  salesperson: string;
  customerName: string;
  customerCarYearMakeModelTrim: string;
  purchaseDate: string; // ISO
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

  // Guardrail: if stock provided, verify body contains the exact price string
  if (input.stock?.price) {
    const priceStr = formatGbp(input.stock.price);
    const priceDigits = String(Math.round(Number(input.stock.price)));
    const body2 = parsed.email2?.body ?? "";
    if (!body2.includes(priceStr) && !body2.includes(priceDigits)) {
      // Append verbatim line so we never risk a wrong price
      parsed.email2.body = body2.trimEnd() + `\n\nThe car is ${input.stock.year ?? ""} ${input.stock.make} ${input.stock.model}${input.stock.trim ? " " + input.stock.trim : ""}, priced at ${priceStr}.`;
    }
  }
  return parsed;
}

export interface ReplyClassification {
  classification: "replied" | "no_longer_owns" | "unsubscribe" | "interested";
  confidence: number;
  summary: string;
}

const CLASSIFY_SYSTEM = `Classify a UK car dealership customer's reply into ONE of:
- "no_longer_owns": they no longer own the car (sold, written off, gave to family, etc.).
- "unsubscribe": they want to stop receiving emails.
- "interested": they express interest, ask for a valuation, ask to view a car, or share their mileage.
- "replied": any other reply (questions, small talk, out-of-office, negative reply that isn't unsubscribe).
Return strict JSON: {"classification","confidence" (0-1),"summary" (max 20 words)}.`;

export async function classifyReply(text: string): Promise<ReplyClassification> {
  return chatJson<ReplyClassification>({
    system: CLASSIFY_SYSTEM,
    user: `Reply text:\n"""${text.slice(0, 2000)}"""`,
  });
}
