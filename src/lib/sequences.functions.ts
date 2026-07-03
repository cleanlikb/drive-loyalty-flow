import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { monthsAgo } from "./format";

async function getDealerFull(supabase: any, userId: string) {
  const { data } = await supabase.from("dealers").select("*").eq("user_id", userId).single();
  return data;
}

export const listSequences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sequences")
      .select("*, customer:customers(id,name,email,make,model,sale_date), sequence_emails(id,step,status,subject,body,send_offset_days,scheduled_for,sent_at)")
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data;
  });

export const getSequence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: seq, error } = await context.supabase
      .from("sequences")
      .select("*, customer:customers(*), sequence_emails(*), replies(*)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    if (seq.sequence_emails) seq.sequence_emails.sort((a: any, b: any) => a.step - b.step);
    return seq;
  });

export const updateEmailDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sequence_emails")
      .update({ subject: data.subject, body: data.body })
      .eq("id", data.id)
      .in("status", ["draft", "scheduled"]);
    if (error) throw error;
    return { ok: true };
  });

export const stopSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), reason: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("sequence_emails")
      .update({ status: "cancelled" })
      .eq("sequence_id", data.id)
      .in("status", ["draft", "scheduled"]);
    await context.supabase.from("sequences")
      .update({ status: "stopped", stopped_reason: data.reason ?? "Stopped manually", updated_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true };
  });

export const regenerateSequenceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    instruction: z.string().max(300).optional(),
    sequenceType: z.enum(["trade_in", "buy_back"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: email, error } = await context.supabase
      .from("sequence_emails")
      .select("*, sequence:sequences(*, customer:customers(*))")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    if (!["draft", "scheduled"].includes(email.status)) throw new Error("Cannot regenerate a sent email");

    const dealer = await getDealerFull(context.supabase, context.userId);
    if (!dealer) throw new Error("Dealer not found");
    const c = email.sequence.customer;

    const effectiveType = (data.sequenceType ?? email.sequence?.sequence_type ?? "trade_in") as "trade_in" | "buy_back";

    const { regenerateEmail } = await import("./ai.server");
    const fresh = await regenerateEmail({
      dealership: dealer.dealership_name,
      salesperson: dealer.salesperson_name,
      customerName: c.name,
      customerCarYearMakeModelTrim: [c.make, c.model, c.trim].filter(Boolean).join(" "),
      purchaseDate: c.sale_date ?? new Date().toISOString(),
      monthsSincePurchase: c.sale_date ? monthsAgo(c.sale_date) : 12,
      sequenceType: effectiveType,
      step: email.step as 1 | 2 | 3,
      currentSubject: email.subject,
      currentBody: email.body,
      instruction: data.instruction,
    });

    if (data.sequenceType && data.sequenceType !== email.sequence?.sequence_type) {
      await context.supabase.from("sequences")
        .update({ sequence_type: data.sequenceType, updated_at: new Date().toISOString() })
        .eq("id", email.sequence_id);
    }



    const { error: updErr } = await context.supabase
      .from("sequence_emails")
      .update({ subject: fresh.subject, body: fresh.body })
      .eq("id", data.id);
    if (updErr) throw updErr;
    return fresh;
  });

function addDays(base: Date, days: number): Date {
  const d = new Date(base); d.setDate(d.getDate() + days); return d;
}

export const startSequencesForSelected = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    cohortCustomerIds: z.array(z.string().uuid()).min(1).max(200),
    sequenceType: z.enum(["trade_in", "buy_back"]).default("trade_in"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const dealer = await getDealerFull(context.supabase, context.userId);
    if (!dealer) throw new Error("Dealer not found");
    if (!dealer.salesperson_name || !dealer.dealership_name) throw new Error("Complete onboarding first");

    const { data: rows, error } = await context.supabase
      .from("cohort_customers")
      .select("*, customer:customers(*)")
      .in("id", data.cohortCustomerIds);
    if (error) throw error;

    const { generateSequence } = await import("./ai.server");
    let created = 0;
    let failed = 0;
    const now = new Date();

    for (const row of rows ?? []) {
      if (row.sequence_id) continue;
      const c = row.customer;
      try {
        const seq = await generateSequence({
          dealership: dealer.dealership_name,
          salesperson: dealer.salesperson_name,
          customerName: c.name,
          customerCarYearMakeModelTrim: [c.make, c.model, c.trim].filter(Boolean).join(" "),
          purchaseDate: c.sale_date ?? new Date().toISOString(),
          monthsSincePurchase: c.sale_date ? monthsAgo(c.sale_date) : row.milestone_months,
          sequenceType: data.sequenceType,
        });

        const { data: seqRow, error: seqErr } = await context.supabase.from("sequences").insert({
          dealer_id: dealer.id,
          customer_id: c.id,
          cohort_customer_id: row.id,
          status: "drafting",
          sequence_type: data.sequenceType,
          started_at: now.toISOString(),
        }).select("id").single();
        if (seqErr) throw seqErr;

        const emails = [
          { step: 1, offset: 1, subject: seq.email1.subject, body: seq.email1.body },
          { step: 2, offset: 5, subject: seq.email2.subject, body: seq.email2.body },
          { step: 3, offset: 11, subject: seq.email3.subject, body: seq.email3.body },
        ];

        const emailRows = emails.map((e) => ({
          sequence_id: seqRow.id,
          dealer_id: dealer.id,
          step: e.step,
          send_offset_days: e.offset,
          subject: e.subject,
          body: e.body,
          status: "draft" as const,
          scheduled_for: null,
        }));
        await context.supabase.from("sequence_emails").insert(emailRows);
        await context.supabase.from("cohort_customers").update({ sequence_id: seqRow.id, selected: false }).eq("id", row.id);
        created++;
      } catch (e) {
        console.error("Sequence gen failed", e);
        failed++;
      }
    }

    await context.supabase.from("activity_log").insert({
      dealer_id: dealer.id, kind: "sequences_generated", payload: { created, failed, type: data.sequenceType },
    });
    return { created, failed };
  });


// Pick a UTC send timestamp for a given local day, randomised within the dealer's window.
function pickSendTimeUTC(dayUTC: Date, startHour: number, endHour: number): string {
  const spanHours = Math.max(1, endHour - startHour);
  const minute = Math.floor(Math.random() * spanHours * 60);
  const d = new Date(dayUTC);
  d.setUTCHours(startHour, 0, 0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + minute);
  return d.toISOString();
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Given an ordered list of step-1 offsets already assigned today/future, find the next
// day (starting from `from`) that has fewer than `cap` step-1 sends. Uses in-memory tally
// merged with existing DB tallies.
async function pickStep1Day(
  supabase: any,
  dealerId: string,
  cap: number,
  earliest: Date,
  memoryTally: Map<string, number>,
): Promise<Date> {
  // Load existing step-1 email counts per day for the next 60 days.
  const horizon = new Date(earliest);
  horizon.setUTCDate(horizon.getUTCDate() + 60);
  const { data: existing } = await supabase
    .from("sequence_emails")
    .select("scheduled_for")
    .eq("dealer_id", dealerId)
    .eq("step", 1)
    .in("status", ["scheduled", "sent"])
    .gte("scheduled_for", earliest.toISOString())
    .lte("scheduled_for", horizon.toISOString());
  const dbTally = new Map<string, number>();
  for (const row of existing ?? []) {
    if (!row.scheduled_for) continue;
    const k = utcDayKey(new Date(row.scheduled_for));
    dbTally.set(k, (dbTally.get(k) ?? 0) + 1);
  }
  const day = new Date(earliest);
  for (let i = 0; i < 60; i++) {
    const k = utcDayKey(day);
    const total = (dbTally.get(k) ?? 0) + (memoryTally.get(k) ?? 0);
    if (total < cap) {
      memoryTally.set(k, (memoryTally.get(k) ?? 0) + 1);
      return new Date(day);
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  // Fallback: 60 days out.
  return day;
}

async function scheduleSequenceEmails(
  supabase: any,
  seq: { id: string; sequence_emails: any[] },
  dealer: { id: string; daily_send_cap: number; send_window_start_hour: number; send_window_end_hour: number },
  memoryTally: Map<string, number>,
) {
  const now = new Date();
  // Earliest step 1 candidate = tomorrow (start of UTC day).
  const earliest = new Date(now);
  earliest.setUTCDate(earliest.getUTCDate() + 1);
  earliest.setUTCHours(0, 0, 0, 0);

  const step1Day = await pickStep1Day(supabase, dealer.id, dealer.daily_send_cap, earliest, memoryTally);
  const step1At = pickSendTimeUTC(step1Day, dealer.send_window_start_hour, dealer.send_window_end_hour);

  // Steps 2 and 3 are anchored to step-1's actual day, offsets from original values.
  const byStep = new Map<number, any>();
  for (const e of seq.sequence_emails ?? []) byStep.set(e.step, e);
  const step1 = byStep.get(1);
  const step2 = byStep.get(2);
  const step3 = byStep.get(3);
  const step1Offset = step1?.send_offset_days ?? 1;

  const updates: Array<{ id: string; scheduled_for: string }> = [];
  if (step1 && step1.status === "draft") updates.push({ id: step1.id, scheduled_for: step1At });
  if (step2 && step2.status === "draft") {
    const gap = (step2.send_offset_days ?? 5) - step1Offset;
    const d = new Date(step1Day); d.setUTCDate(d.getUTCDate() + Math.max(1, gap));
    updates.push({ id: step2.id, scheduled_for: pickSendTimeUTC(d, dealer.send_window_start_hour, dealer.send_window_end_hour) });
  }
  if (step3 && step3.status === "draft") {
    const gap = (step3.send_offset_days ?? 11) - step1Offset;
    const d = new Date(step1Day); d.setUTCDate(d.getUTCDate() + Math.max(2, gap));
    updates.push({ id: step3.id, scheduled_for: pickSendTimeUTC(d, dealer.send_window_start_hour, dealer.send_window_end_hour) });
  }

  for (const u of updates) {
    await supabase.from("sequence_emails")
      .update({ status: "scheduled", scheduled_for: u.scheduled_for })
      .eq("id", u.id);
  }
  await supabase.from("sequences").update({
    status: "active",
    started_at: now.toISOString(),
    updated_at: now.toISOString(),
  }).eq("id", seq.id);
}

async function loadDealerSchedulingConfig(supabase: any, userId: string) {
  const { data, error } = await supabase.from("dealers")
    .select("id, daily_send_cap, send_window_start_hour, send_window_end_hour")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Dealer not found");
  return {
    id: data.id,
    daily_send_cap: data.daily_send_cap ?? 50,
    send_window_start_hour: data.send_window_start_hour ?? 9,
    send_window_end_hour: data.send_window_end_hour ?? 16,
  };
}

export const startSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: seq, error } = await context.supabase
      .from("sequences")
      .select("id, status, sequence_emails(id, step, send_offset_days, status)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    if (seq.status !== "drafting") throw new Error("Sequence already started");

    const dealer = await loadDealerSchedulingConfig(context.supabase, context.userId);
    await scheduleSequenceEmails(context.supabase, seq, dealer, new Map());

    await context.supabase.from("activity_log").insert({
      dealer_id: dealer.id, kind: "sequence_started", payload: { sequence_id: data.id },
    });
    return { ok: true };
  });

export const startSequencesBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const dealer = await loadDealerSchedulingConfig(context.supabase, context.userId);
    const { data: seqs, error } = await context.supabase
      .from("sequences")
      .select("id, status, sequence_emails(id, step, send_offset_days, status)")
      .in("id", data.ids)
      .eq("status", "drafting");
    if (error) throw error;

    const tally = new Map<string, number>();
    let started = 0;
    for (const seq of seqs ?? []) {
      await scheduleSequenceEmails(context.supabase, seq, dealer, tally);
      started++;
    }
    if (started > 0) {
      await context.supabase.from("activity_log").insert({
        dealer_id: dealer.id, kind: "sequences_started_bulk", payload: { count: started, cap: dealer.daily_send_cap },
      });
    }
    return { started, dailyCap: dealer.daily_send_cap };
  });






const dispatchEmailViaResend = async (supabase: any, email: any) => {
  const { generateReplyAlias, plainTextToHtml, replyToAddress, sendResendEmail } = await import("./resend.server");

  const { data: full } = await (supabase as any)
    .from("sequence_emails")
    .select("*, dealer:dealers(id, slug, dealership_name, sender_email, sender_verified, notification_email), customer:customers(id, name, email)")
    .eq("id", email.id)
    .single();

  if (!full) throw new Error("Email not found");
  if (!full.customer?.email) throw new Error("Customer has no email");

  const dealerSender = full.dealer?.sender_verified ? (full.dealer?.sender_email as string | null) : null;
  const fromAddress = dealerSender ?? process.env.RESEND_FROM ?? null;
  if (!fromAddress) throw new Error("No verified sender email configured. Set one in Settings before sending.");

  // Reply-to is a single shared inbound address; we identify the customer
  // from the From email (and sequence from thread headers) when the reply
  // hits our inbound webhook.
  const replyTo = replyToAddress("sales");

  const { resendEmailId, messageId } = await sendResendEmail({
    to: full.customer.email,
    from: `${full.dealer?.dealership_name ?? "Wynback"} <${fromAddress}>`,
    subject: full.subject,
    text: full.body,
    html: plainTextToHtml(full.body),
    replyTo,
  });

  await supabase.from("sequence_emails").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    message_id: messageId,
    resend_email_id: resendEmailId,
  }).eq("id", email.id);
};

export const dispatchDueEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date().toISOString();
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) throw new Error("Dealer not found");
    const { data: due } = await context.supabase
      .from("sequence_emails")
      .select("id, sequence_id, dealer_id")
      .eq("dealer_id", dealer.id)
      .eq("status", "scheduled")
      .lte("scheduled_for", now);
    let sent = 0;
    let failed = 0;
    for (const e of due ?? []) {
      try {
        await dispatchEmailViaResend(context.supabase, e);
        sent++;
      } catch (err: any) {
        console.error("Manual dispatch failed", e.id, err?.message);
        await (context.supabase as any).from("sequence_emails").update({ status: "failed", updated_at: now }).eq("id", e.id);
        failed++;
      }

    }
    if (sent > 0) {
      await context.supabase.from("activity_log").insert({
        dealer_id: dealer.id, kind: "emails_sent", payload: { count: sent },
      });
    }
    return { sent, failed };
  });



export const logReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sequenceId: z.string().uuid(), text: z.string().min(1).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { processReply } = await import("./replies.server");
    const result = await processReply(context.supabase, {
      sequenceId: data.sequenceId,
      text: data.text,
      source: "manual",
    });
    return { classification: result.classification };
  });
