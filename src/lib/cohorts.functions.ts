import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { MILESTONES } from "./format";

function firstOfMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthsAgoAt(months: number, ref: Date = new Date()): { start: string; end: string } {
  const target = new Date(ref.getFullYear(), ref.getMonth() - months, 1);
  const start = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-01`;
  const end = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()}`;
  return { start, end };
}

async function rebuildCohortInternal(supabase: any, dealerId: string) {
  const monthDate = firstOfMonth();
  const { data: existing } = await supabase.from("cohorts").select("id").eq("dealer_id", dealerId).eq("month", monthDate).maybeSingle();
  let cohortId = existing?.id;
  if (!cohortId) {
    const { data: created, error } = await supabase.from("cohorts").insert({ dealer_id: dealerId, month: monthDate }).select("id").single();
    if (error) throw error;
    cohortId = created.id;
  }

  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { data: recentSeq } = await supabase
    .from("sequences")
    .select("customer_id, sequence_emails!inner(sent_at)")
    .eq("dealer_id", dealerId)
    .gte("sequence_emails.sent_at", sixMonthsAgo.toISOString());
  const recentlyContacted = new Set<string>((recentSeq ?? []).map((s: any) => s.customer_id));

  const { data: activeSeq } = await supabase.from("sequences").select("customer_id").eq("dealer_id", dealerId).in("status", ["drafting", "scheduled", "active"]);
  const activeCustomers = new Set<string>((activeSeq ?? []).map((s: any) => s.customer_id));

  const inserts: any[] = [];
  for (const months of MILESTONES) {
    const { start, end } = monthsAgoAt(months);
    const { data: custs } = await supabase
      .from("customers")
      .select("id,name,make,model,sale_price,sale_date,status")
      .eq("dealer_id", dealerId)
      .eq("status", "active")
      .gte("sale_date", start)
      .lte("sale_date", end);
    for (const c of custs ?? []) {
      if (recentlyContacted.has(c.id) || activeCustomers.has(c.id)) continue;
      inserts.push({
        cohort_id: cohortId,
        dealer_id: dealerId,
        customer_id: c.id,
        milestone_months: months,
      });
    }
  }

  await supabase.from("cohort_customers").delete().eq("cohort_id", cohortId).is("sequence_id", null);
  if (inserts.length > 0) {
    await supabase.from("cohort_customers").upsert(inserts, { onConflict: "cohort_id,customer_id", ignoreDuplicates: true });
  }
  return { cohortId, added: inserts.length };
}

export const rebuildCurrentCohort = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) throw new Error("Dealer not found");
    const result = await rebuildCohortInternal(context.supabase, dealer.id);
    await context.supabase.from("activity_log").insert({
      dealer_id: dealer.id, kind: "cohort_rebuilt", payload: { added: result.added },
    });
    return result;
  });

export const getCurrentCohort = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const monthDate = firstOfMonth();
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) return { cohort: null, rows: [] };
    const { data: cohort } = await context.supabase.from("cohorts").select("*").eq("dealer_id", dealer.id).eq("month", monthDate).maybeSingle();
    if (!cohort) return { cohort: null, rows: [] };
    const { data: rows } = await context.supabase
      .from("cohort_customers")
      .select("*, customer:customers(*)")
      .eq("cohort_id", cohort.id)
      .order("milestone_months", { ascending: true });
    return { cohort, rows: rows ?? [] };
  });

export const toggleCohortSelection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()), selected: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cohort_customers").update({ selected: data.selected }).in("id", data.ids);
    if (error) throw error;
    return { ok: true };
  });
