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
      .select("*, customer:customers(id,name,email,make,model,sale_date), stock:stock(id,make,model,year,price), sequence_emails(step,status,scheduled_for,sent_at)")
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
      .select("*, customer:customers(*), stock:stock(*), sequence_emails(*), replies(*)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    // Sort emails by step
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

function addDays(base: Date, days: number): Date {
  const d = new Date(base); d.setDate(d.getDate() + days); return d;
}

export const startSequencesForSelected = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cohortCustomerIds: z.array(z.string().uuid()).min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const dealer = await getDealerFull(context.supabase, context.userId);
    if (!dealer) throw new Error("Dealer not found");
    if (!dealer.salesperson_name || !dealer.dealership_name) throw new Error("Complete onboarding first");

    const { data: rows, error } = await context.supabase
      .from("cohort_customers")
      .select("*, customer:customers(*), stock:stock(*)")
      .in("id", data.cohortCustomerIds);
    if (error) throw error;

    const { generateSequence } = await import("./ai.server");
    let created = 0;
    let failed = 0;
    const now = new Date();

    for (const row of rows ?? []) {
      if (row.sequence_id) continue;
      const c = row.customer;
      const s = row.stock;
      try {
        const seq = await generateSequence({
          dealership: dealer.dealership_name,
          salesperson: dealer.salesperson_name,
          customerName: c.name,
          customerCarYearMakeModelTrim: [c.make, c.model, c.trim].filter(Boolean).join(" "),
          purchaseDate: c.sale_date ?? new Date().toISOString(),
          monthsSincePurchase: c.sale_date ? monthsAgo(c.sale_date) : row.milestone_months,
          stock: s ? { year: s.year, make: s.make, model: s.model, trim: s.trim, price: s.price } : null,
        });

        const { data: seqRow, error: seqErr } = await context.supabase.from("sequences").insert({
          dealer_id: dealer.id,
          customer_id: c.id,
          cohort_customer_id: row.id,
          stock_id: s?.id ?? null,
          status: "active",
          started_at: now.toISOString(),
        }).select("id").single();
        if (seqErr) throw seqErr;

        const emails = [
          { step: 1, offset: 0, subject: seq.email1.subject, body: seq.email1.body },
          { step: 2, offset: 4, subject: seq.email2.subject, body: seq.email2.body },
          { step: 3, offset: 10, subject: seq.email3.subject, body: seq.email3.body },
        ];
        const emailRows = emails.map((e) => ({
          sequence_id: seqRow.id,
          dealer_id: dealer.id,
          step: e.step,
          send_offset_days: e.offset,
          subject: e.subject,
          body: e.body,
          status: e.step === 1 ? "scheduled" as const : "scheduled" as const,
          scheduled_for: addDays(now, e.offset).toISOString(),
        }));
        await context.supabase.from("sequence_emails").insert(emailRows);
        await context.supabase.from("cohort_customers").update({ sequence_id: seqRow.id, selected: false }).eq("id", row.id);
        await context.supabase.from("customers").update({ last_contacted_at: now.toISOString() }).eq("id", c.id);
        created++;
      } catch (e) {
        console.error("Sequence gen failed", e);
        failed++;
      }
    }

    await context.supabase.from("activity_log").insert({
      dealer_id: dealer.id, kind: "sequences_started", payload: { created, failed },
    });
    return { created, failed };
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
