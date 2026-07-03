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

    const now = new Date();
    for (const e of seq.sequence_emails ?? []) {
      if (e.status !== "draft") continue;
      await context.supabase.from("sequence_emails").update({
        status: "scheduled",
        scheduled_for: addDays(now, e.send_offset_days).toISOString(),
      }).eq("id", e.id);
    }
    await context.supabase.from("sequences").update({
      status: "active",
      started_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("id", data.id);

    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (dealer) {
      await context.supabase.from("activity_log").insert({
        dealer_id: dealer.id, kind: "sequence_started", payload: { sequence_id: data.id },
      });
    }
    return { ok: true };
  });

export const startSequencesBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: seqs, error } = await context.supabase
      .from("sequences")
      .select("id, status, sequence_emails(id, send_offset_days, status)")
      .in("id", data.ids)
      .eq("status", "drafting");
    if (error) throw error;
    const now = new Date();
    let started = 0;
    for (const seq of seqs ?? []) {
      for (const e of seq.sequence_emails ?? []) {
        if (e.status !== "draft") continue;
        await context.supabase.from("sequence_emails").update({
          status: "scheduled",
          scheduled_for: addDays(now, e.send_offset_days).toISOString(),
        }).eq("id", e.id);
      }
      await context.supabase.from("sequences").update({
        status: "active",
        started_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq("id", seq.id);
      started++;
    }
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (dealer && started > 0) {
      await context.supabase.from("activity_log").insert({
        dealer_id: dealer.id, kind: "sequences_started_bulk", payload: { count: started },
      });
    }
    return { started };
  });




const dispatchEmail = async (supabase: any, email: any) => {
  // ABSTRACTED DISPATCH — v1 marks sent. Replace with Resend/SMTP later.
  await supabase.from("sequence_emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", email.id);
};

export const dispatchDueEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date().toISOString();
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) throw new Error("Dealer not found");
    const { data: due } = await context.supabase
      .from("sequence_emails")
      .select("*")
      .eq("dealer_id", dealer.id)
      .eq("status", "scheduled")
      .lte("scheduled_for", now);
    let sent = 0;
    for (const e of due ?? []) {
      await dispatchEmail(context.supabase, e);
      sent++;
    }
    if (sent > 0) {
      await context.supabase.from("activity_log").insert({
        dealer_id: dealer.id, kind: "emails_sent", payload: { count: sent },
      });
    }
    return { sent };
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
