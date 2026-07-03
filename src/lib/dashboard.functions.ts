import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";


export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) return null;
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Reply-related metrics come from activity_log so counts don't drop when
    // the user deletes replies from their inbox.
    const [
      cohort,
      seqStarted,
      emailsSent,
      replyLog,
      nloLog,
      activity,
    ] = await Promise.all([
      context.supabase.from("cohorts").select("id, cohort_customers(count)").eq("dealer_id", dealer.id).eq("month", firstOfMonth).maybeSingle(),
      context.supabase.from("sequences").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).gte("started_at", firstOfMonth),
      context.supabase.from("sequence_emails").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).eq("status", "sent").gte("sent_at", firstOfMonth),
      context.supabase.from("activity_log").select("payload").eq("dealer_id", dealer.id).in("kind", ["reply_logged", "reply_received"]).gte("created_at", firstOfMonth),
      context.supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).in("kind", ["reply_logged", "reply_received"]).contains("payload", { classification: "no_longer_owns" }),
      context.supabase.from("activity_log").select("*").eq("dealer_id", dealer.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const leads = (cohort.data as any)?.cohort_customers?.[0]?.count ?? 0;

    const replyRows = (replyLog.data ?? []) as { payload: any }[];
    let replies = 0;
    let hotLeads = 0;
    let interested = 0;
    for (const r of replyRows) {
      replies += 1;
      const c = r.payload?.classification;
      if (c === "hot_lead") hotLeads += 1;
      else if (c === "interested") interested += 1;
    }

    return {
      leads,
      sequencesStarted: seqStarted.count ?? 0,
      emailsSent: emailsSent.count ?? 0,
      replies,
      hotLeads,
      interested,
      noLongerOwns: nloLog.count ?? 0,
      activity: activity.data ?? [],
    };
  });
