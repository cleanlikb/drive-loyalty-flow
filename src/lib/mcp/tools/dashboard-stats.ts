import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, getDealerId } from "../supabase";

export default defineTool({
  name: "dashboard_stats",
  title: "Dashboard stats",
  description: "Return this month's key metrics for the signed-in dealer: leads surfaced, sequences started, emails sent, replies, hot leads.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const dealerId = await getDealerId(ctx);
    if (!dealerId) {
      return { content: [{ type: "text", text: "No dealer profile found for this user." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const [cohort, seqStarted, emailsSent, replyLog] = await Promise.all([
      supabase
        .from("cohorts")
        .select("id, cohort_customers(count)")
        .eq("dealer_id", dealerId)
        .eq("month", firstOfMonth)
        .maybeSingle(),
      supabase
        .from("sequences")
        .select("id", { count: "exact", head: true })
        .eq("dealer_id", dealerId)
        .gte("started_at", firstOfMonth),
      supabase
        .from("sequence_emails")
        .select("id", { count: "exact", head: true })
        .eq("dealer_id", dealerId)
        .eq("status", "sent")
        .gte("sent_at", firstOfMonth),
      supabase
        .from("activity_log")
        .select("payload")
        .eq("dealer_id", dealerId)
        .in("kind", ["reply_logged", "reply_received"])
        .gte("created_at", firstOfMonth),
    ]);

    const leads = ((cohort.data as { cohort_customers?: { count: number }[] } | null)?.cohort_customers?.[0]?.count) ?? 0;
    const rows = (replyLog.data ?? []) as { payload: { classification?: string } | null }[];
    let replies = 0;
    let hotLeads = 0;
    let interested = 0;
    for (const r of rows) {
      replies += 1;
      const c = r.payload?.classification;
      if (c === "hot_lead") hotLeads += 1;
      else if (c === "interested") interested += 1;
    }

    const stats = {
      month: firstOfMonth,
      leads,
      sequencesStarted: seqStarted.count ?? 0,
      emailsSent: emailsSent.count ?? 0,
      replies,
      hotLeads,
      interested,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(stats) }],
      structuredContent: stats,
    };
  },
});
