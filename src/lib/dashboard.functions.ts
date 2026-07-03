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

const MetricSchema = z.enum([
  "leads",
  "sequencesStarted",
  "emailsSent",
  "replies",
  "interested",
  "noLongerOwns",
]);

export const getMetricDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ metric: MetricSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: dealer } = await context.supabase
      .from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) return [];
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const supabase = context.supabase;

    switch (data.metric) {
      case "leads": {
        const { data: cohort } = await supabase
          .from("cohorts")
          .select("id, cohort_customers(customer:customers(id,name,email,make,model,milestone_months))")
          .eq("dealer_id", dealer.id).eq("month", firstOfMonth).maybeSingle();
        const rows = ((cohort as any)?.cohort_customers ?? [])
          .map((cc: any) => cc.customer).filter(Boolean);
        return rows.map((c: any) => ({
          id: c.id,
          primary: c.name,
          secondary: `${c.make ?? ""} ${c.model ?? ""}`.trim(),
          meta: c.email,
          timestamp: null,
          href: "/leads",
        }));
      }
      case "sequencesStarted": {
        const { data: seqs } = await supabase
          .from("sequences")
          .select("id, started_at, status, customer:customers(name,make,model)")
          .eq("dealer_id", dealer.id).gte("started_at", firstOfMonth)
          .order("started_at", { ascending: false }).limit(100);
        return (seqs ?? []).map((s: any) => ({
          id: s.id,
          primary: s.customer?.name ?? "Unknown",
          secondary: `${s.customer?.make ?? ""} ${s.customer?.model ?? ""}`.trim(),
          meta: s.status,
          timestamp: s.started_at,
          href: `/sequences/${s.id}`,
        }));
      }
      case "emailsSent": {
        const { data: emails } = await supabase
          .from("sequence_emails")
          .select("id, subject, sent_at, sequence_id, customer:customers(name,email)")
          .eq("dealer_id", dealer.id).eq("status", "sent")
          .gte("sent_at", firstOfMonth)
          .order("sent_at", { ascending: false }).limit(100);
        return (emails ?? []).map((e: any) => ({
          id: e.id,
          primary: e.customer?.name ?? e.customer?.email ?? "Unknown",
          secondary: e.subject,
          meta: e.customer?.email,
          timestamp: e.sent_at,
          href: `/sequences/${e.sequence_id}`,
        }));
      }
      case "replies":
      case "interested":
      case "noLongerOwns": {
        const classFilter =
          data.metric === "interested" ? ["interested", "hot_lead"] :
          data.metric === "noLongerOwns" ? ["no_longer_owns"] :
          null;
        let q = supabase
          .from("replies")
          .select("id, classification, summary, created_at, sequence_id, customer:customers(name,email,make,model)")
          .eq("dealer_id", dealer.id)
          .gte("created_at", firstOfMonth)
          .order("created_at", { ascending: false }).limit(100);
        if (classFilter) q = q.in("classification", classFilter);
        const { data: replies } = await q;
        return (replies ?? []).map((r: any) => ({
          id: r.id,
          primary: r.customer?.name ?? "Unknown",
          secondary: r.summary ?? `${r.customer?.make ?? ""} ${r.customer?.model ?? ""}`.trim(),
          meta: r.classification?.replaceAll("_", " "),
          timestamp: r.created_at,
          href: `/replies`,
        }));
      }
    }
  });

