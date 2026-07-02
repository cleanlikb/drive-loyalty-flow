import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) return null;
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const [
      cohort,
      seqStarted,
      emailsSent,
      replies,
      nloRemovals,
      activity,
    ] = await Promise.all([
      context.supabase.from("cohorts").select("id, cohort_customers(count)").eq("dealer_id", dealer.id).eq("month", firstOfMonth).maybeSingle(),
      context.supabase.from("sequences").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).gte("started_at", firstOfMonth),
      context.supabase.from("sequence_emails").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).eq("status", "sent").gte("sent_at", firstOfMonth),
      context.supabase.from("replies").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).gte("created_at", firstOfMonth),
      context.supabase.from("replies").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).eq("classification", "no_longer_owns"),
      context.supabase.from("activity_log").select("*").eq("dealer_id", dealer.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const cohortSize = (cohort.data as any)?.cohort_customers?.[0]?.count ?? 0;

    return {
      cohortSize,
      sequencesStarted: seqStarted.count ?? 0,
      emailsSent: emailsSent.count ?? 0,
      replies: replies.count ?? 0,
      noLongerOwns: nloRemovals.count ?? 0,
      activity: activity.data ?? [],
    };
  });
