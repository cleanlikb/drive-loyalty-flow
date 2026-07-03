// Shared reply-processing logic used by the in-app logReply server fn,
// the public inbound-email webhook, and the daily rescan job. Server-only.

import { classifyReply, type ReplyClass, type ReplyClassification } from "./ai.server";

interface InboundMeta {
  subject?: string | null;
  fromEmail?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
}

const SOLD_RX = /\b(sold|got rid of|traded (it |in)|scrapped|written off|write[- ]off|no longer (have|own)|don'?t (have|own) (it|the car)|gave (it )?(to|away)|part[- ]exchanged?|part ex)\b/i;
const UNSUB_RX = /\b(unsubscribe|stop emailing|remove me|opt[- ]?out|don'?t (email|contact) me)\b/i;
const HOT_RX = /\b(valuation|part[- ]exchange (figure|price|quote)|book a viewing|come (and )?see|test drive|how much|price|mileage is|currently on \d|when can i|available to view)\b/i;

function keywordOverride(text: string, ai: ReplyClassification): ReplyClassification {
  const out = { ...ai };
  if (SOLD_RX.test(text)) out.classification = "no_longer_owns";
  else if (UNSUB_RX.test(text)) out.classification = "unsubscribe";
  else if (out.classification === "interested" && HOT_RX.test(text)) out.classification = "hot_lead";
  return out;
}

export async function classifyText(text: string): Promise<ReplyClassification> {
  let ai: ReplyClassification = { classification: "replied", confidence: 0.4, summary: text.slice(0, 100), next_car_notes: null };
  try { ai = await classifyReply(text); } catch (e) { console.error("classify failed", e); }
  return keywordOverride(text, ai);
}

export async function processReply(
  supabase: any,
  args: { sequenceId: string; text: string; source?: "manual" | "inbound_email"; meta?: InboundMeta },
) {
  const { sequenceId, text, source = "manual", meta = {} } = args;

  const { data: seq } = await supabase
    .from("sequences")
    .select("*, customer:customers(id,name,email,make,model), dealer:dealers(id,notification_email,forward_replies,dealership_name)")
    .eq("id", sequenceId).single();
  if (!seq) throw new Error("Sequence not found");

  const classification = await classifyText(text);

  const { data: replyRow } = await supabase.from("replies").insert({
    dealer_id: seq.dealer_id,
    sequence_id: seq.id,
    customer_id: seq.customer_id,
    raw_text: text,
    classification: classification.classification,
    confidence: classification.confidence,
    summary: classification.summary,
    next_car_notes: classification.next_car_notes ?? null,
    subject: meta.subject ?? null,
    from_email: meta.fromEmail ?? null,
    message_id: meta.messageId ?? null,
    in_reply_to: meta.inReplyTo ?? null,
  }).select("id").single();

  // Immediately cancel all pending emails for this sequence.
  await supabase.from("sequence_emails")
    .update({ status: "cancelled" })
    .eq("sequence_id", seq.id)
    .in("status", ["draft", "scheduled"]);

  // Customer + sequence status updates by classification.
  let stoppedReason = source === "inbound_email" ? "Customer replied via email" : "Customer replied";
  const custPatch: {
    status?: "active" | "no_longer_owns" | "unsubscribed";
    is_hot_lead?: boolean;
    hot_lead_at?: string;
    next_car_notes?: string;
  } = {};
  if (classification.next_car_notes) custPatch.next_car_notes = classification.next_car_notes;

  switch (classification.classification) {
    case "no_longer_owns":
      custPatch.status = "no_longer_owns";
      stoppedReason = "No longer owns car — permanently excluded";
      break;
    case "unsubscribe":
      custPatch.status = "unsubscribed";
      stoppedReason = "Unsubscribed";
      break;
    case "hot_lead":
      custPatch.is_hot_lead = true;
      custPatch.hot_lead_at = new Date().toISOString();
      stoppedReason = "Hot lead — take over manually";
      break;
    case "interested":
      stoppedReason = "Interested — take over manually";
      break;
  }
  if (Object.keys(custPatch).length > 0) {
    await supabase.from("customers").update(custPatch).eq("id", seq.customer_id);
  }

  await supabase.from("sequences")
    .update({ status: "stopped", stopped_reason: stoppedReason, updated_at: new Date().toISOString() })
    .eq("id", seq.id);

  // Notify the dealer (in-app notification bell).
  const title =
    classification.classification === "hot_lead" ? `🔥 Hot lead from ${seq.customer?.name}` :
    classification.classification === "no_longer_owns" ? `${seq.customer?.name} no longer owns the car` :
    classification.classification === "unsubscribe" ? `${seq.customer?.name} unsubscribed` :
    `New reply from ${seq.customer?.name}`;
  try {
    await supabase.from("notifications").insert({
      dealer_id: seq.dealer_id,
      title,
      body: classification.summary?.slice(0, 200) ?? null,
      kind: "reply",
    });
  } catch (e) {
    console.error("notification insert failed", e);
  }

  // Best-effort forward to the dealer's inbox.
  if (source === "inbound_email" && seq.dealer?.forward_replies && seq.dealer?.notification_email) {
    try {
      await forwardReply({
        to: seq.dealer.notification_email,
        fromLabel: `${seq.customer?.name ?? "Customer"} via Wynback`,
        subject: `[${labelFor(classification.classification)}] ${meta.subject ?? "New reply"} — ${seq.customer?.name ?? ""}`,
        text: [
          `New inbound reply from ${seq.customer?.name ?? "customer"} <${meta.fromEmail ?? seq.customer?.email ?? ""}>`,
          `Classified as: ${labelFor(classification.classification)} (${Math.round((classification.confidence ?? 0) * 100)}%)`,
          classification.next_car_notes ? `Next-car notes: ${classification.next_car_notes}` : "",
          "",
          "— Original reply —",
          text,
        ].filter(Boolean).join("\n"),
      });
      if (replyRow?.id) {
        await supabase.from("replies").update({ forwarded_at: new Date().toISOString() }).eq("id", replyRow.id);
      }
    } catch (e) {
      console.error("forward failed", e);
    }
  }

  await supabase.from("activity_log").insert({
    dealer_id: seq.dealer_id,
    kind: source === "inbound_email" ? "reply_received" : "reply_logged",
    payload: { sequence_id: seq.id, classification: classification.classification, source, confidence: classification.confidence },
  });

  return { classification, sequenceId: seq.id, dealerId: seq.dealer_id, replyId: replyRow?.id };
}

function labelFor(c: ReplyClass): string {
  return c.replaceAll("_", " ");
}

/**
 * Look up the active sequence for an inbound reply.
 * Preference order:
 *  1. In-Reply-To header matches a sent sequence_email.message_id (bulletproof threading).
 *  2. Fall back to matching by sender email.
 */
export async function findSequenceForInbound(
  supabase: any,
  args: { fromEmail: string; inReplyTo?: string | null; references?: string | null },
): Promise<{ id: string } | null> {
  const candidates = [args.inReplyTo, ...(args.references?.split(/\s+/) ?? [])].filter(Boolean) as string[];
  for (const mid of candidates) {
    const clean = mid.replace(/^<|>$/g, "");
    const { data: em } = await supabase
      .from("sequence_emails")
      .select("sequence_id")
      .eq("message_id", clean)
      .maybeSingle();
    if (em?.sequence_id) return { id: em.sequence_id };
  }

  const email = args.fromEmail?.trim().toLowerCase();
  if (!email) return null;
  const { data: customers } = await supabase
    .from("customers")
    .select("id")
    .ilike("email", email)
    .limit(50);
  if (!customers?.length) return null;
  const { data: seqs } = await supabase
    .from("sequences")
    .select("id")
    .in("customer_id", customers.map((c: any) => c.id))
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1);
  return seqs?.[0] ?? null;
}

// Backwards compat.
export const findActiveSequenceByEmail = async (supabase: any, email: string) =>
  findSequenceForInbound(supabase, { fromEmail: email });

// -----------------------------------------------------------------------------
// Forwarding — best-effort. Uses Resend if RESEND_API_KEY + a sender are set.
// -----------------------------------------------------------------------------
function sanitizeLabel(s: string): string {
  return s.replace(/[<>"\r\n]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "Wynback";
}

async function forwardReply(args: {
  to: string;
  fromLabel: string;
  fromAddress: string;
  subject: string;
  text: string;
  replyTo?: string | null;
}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    console.log("[forwardReply] skipped — missing API keys");
    return;
  }
  if (!args.fromAddress) {
    console.log("[forwardReply] skipped — no verified sender configured");
    return;
  }
  const label = sanitizeLabel(args.fromLabel);
  const from = `${label} <${args.fromAddress}>`;
  const body: any = {
    from,
    to: [args.to],
    subject: args.subject.replace(/[\r\n]/g, " ").slice(0, 300),
    text: args.text,
  };
  if (args.replyTo) body.reply_to = args.replyTo;

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
