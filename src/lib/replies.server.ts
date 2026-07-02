// Shared reply-processing logic used by both the in-app logReply server fn
// and the public inbound-email webhook. Server-only.

export async function processReply(
  supabase: any,
  args: { sequenceId: string; text: string; source?: "manual" | "inbound_email" }
) {
  const { sequenceId, text, source = "manual" } = args;

  const { data: seq } = await supabase.from("sequences").select("*").eq("id", sequenceId).single();
  if (!seq) throw new Error("Sequence not found");

  // Already stopped? Idempotent — just record the reply and exit.
  const { classifyReply } = await import("./ai.server");
  let classification: any = { classification: "replied", confidence: 0.5, summary: text.slice(0, 100) };
  try { classification = await classifyReply(text); } catch (e) { console.error("classify failed", e); }

  const soldRegex = /\b(sold|got rid of|traded (it |in)|scrapped|written off|write[- ]off|no longer (have|own)|don'?t (have|own) (it|the car)|gave (it )?(to|away)|part[- ]exchanged?|part ex)\b/i;
  const unsubRegex = /\b(unsubscribe|stop emailing|remove me|opt[- ]?out|don'?t (email|contact) me)\b/i;
  if (classification.classification === "replied" || classification.classification === "interested") {
    if (soldRegex.test(text)) classification.classification = "no_longer_owns";
    else if (unsubRegex.test(text)) classification.classification = "unsubscribe";
  }

  await supabase.from("replies").insert({
    dealer_id: seq.dealer_id,
    sequence_id: seq.id,
    customer_id: seq.customer_id,
    raw_text: text,
    classification: classification.classification,
  });

  await supabase.from("sequence_emails")
    .update({ status: "cancelled" })
    .eq("sequence_id", seq.id)
    .in("status", ["draft", "scheduled"]);

  let stoppedReason = source === "inbound_email" ? "Customer replied via email" : "Customer replied";
  if (classification.classification === "no_longer_owns") {
    await supabase.from("customers").update({ status: "no_longer_owns" }).eq("id", seq.customer_id);
    stoppedReason = "No longer owns car — permanently excluded";
  } else if (classification.classification === "unsubscribe") {
    await supabase.from("customers").update({ status: "unsubscribed" }).eq("id", seq.customer_id);
    stoppedReason = "Unsubscribed";
  } else if (classification.classification === "interested") {
    stoppedReason = "Interested — take over manually";
  }

  await supabase.from("sequences")
    .update({ status: "stopped", stopped_reason: stoppedReason, updated_at: new Date().toISOString() })
    .eq("id", seq.id);

  await supabase.from("activity_log").insert({
    dealer_id: seq.dealer_id,
    kind: source === "inbound_email" ? "reply_received" : "reply_logged",
    payload: { sequence_id: seq.id, classification: classification.classification, source },
  });

  return { classification, sequenceId: seq.id, dealerId: seq.dealer_id };
}

// Look up the most recent active sequence for a given customer email within a dealer scope.
// If dealerId is omitted, we scan across dealers by email (inbound provider webhooks are global).
export async function findActiveSequenceByEmail(supabase: any, fromEmail: string) {
  const email = fromEmail.trim().toLowerCase();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, dealer_id")
    .ilike("email", email)
    .limit(50);
  if (!customers || customers.length === 0) return null;

  const customerIds = customers.map((c: any) => c.id);
  const { data: seqs } = await supabase
    .from("sequences")
    .select("id, customer_id, dealer_id, status, started_at")
    .in("customer_id", customerIds)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1);
  return seqs?.[0] ?? null;
}
