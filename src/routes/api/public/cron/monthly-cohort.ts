import { createFileRoute } from "@tanstack/react-router";

// Called monthly (1st of month) by pg_cron. Rebuilds cohorts and creates
// notifications for every dealer. Auth via Supabase anon key in `apikey` header.
export const Route = createFileRoute("/api/public/cron/monthly-cohort")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: dealers } = await supabaseAdmin.from("dealers").select("id").not("onboarded_at", "is", null);
        const { MILESTONES } = await import("@/lib/format");
        const { findBestMatch } = await import("@/lib/matching.server");

        const now = new Date();
        const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        let total = 0;

        for (const d of dealers ?? []) {
          const { data: cohort } = await supabaseAdmin.from("cohorts").upsert({ dealer_id: d.id, month: monthDate }, { onConflict: "dealer_id,month" }).select().single();
          if (!cohort) continue;

          const { data: stock } = await supabaseAdmin.from("stock").select("*").eq("dealer_id", d.id).eq("active", true);
          const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          const { data: recent } = await supabaseAdmin.from("sequences").select("customer_id, sequence_emails!inner(sent_at)").eq("dealer_id", d.id).gte("sequence_emails.sent_at", sixMonthsAgo.toISOString());
          const recentSet = new Set((recent ?? []).map((r: any) => r.customer_id));
          const { data: active } = await supabaseAdmin.from("sequences").select("customer_id").eq("dealer_id", d.id).in("status", ["drafting", "scheduled", "active"]);
          const activeSet = new Set((active ?? []).map((r: any) => r.customer_id));

          const inserts: any[] = [];
          for (const months of MILESTONES) {
            const target = new Date(now.getFullYear(), now.getMonth() - months, 1);
            const start = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-01`;
            const end = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()}`;
            const { data: custs } = await supabaseAdmin.from("customers").select("id,make,model,sale_price,sale_date,status").eq("dealer_id", d.id).eq("status", "active").gte("sale_date", start).lte("sale_date", end);
            for (const c of custs ?? []) {
              if (recentSet.has(c.id) || activeSet.has(c.id)) continue;
              const m = findBestMatch(c as any, (stock ?? []) as any, months);
              inserts.push({ cohort_id: cohort.id, dealer_id: d.id, customer_id: c.id, milestone_months: months, best_stock_id: m.stockId, match_score: m.score, match_reasons: m.reasons });
            }
          }

          await supabaseAdmin.from("cohort_customers").delete().eq("cohort_id", cohort.id).is("sequence_id", null);
          if (inserts.length > 0) {
            await supabaseAdmin.from("cohort_customers").upsert(inserts, { onConflict: "cohort_id,customer_id", ignoreDuplicates: true });
            await supabaseAdmin.from("notifications").insert({
              dealer_id: d.id, kind: "monthly_cohort",
              title: `Your ${now.toLocaleString("en-GB", { month: "long" })} leads are ready`,
              body: `${inserts.length} customers hit an anniversary this month.`,
            });
            total += inserts.length;
          }
        }
        return Response.json({ ok: true, dealers: dealers?.length ?? 0, leads: total });
      },
    },
  },
});
