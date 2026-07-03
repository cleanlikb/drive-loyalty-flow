import { createFileRoute } from "@tanstack/react-router";

// Called every 15 minutes by pg_cron. Sends all scheduled emails whose time is due.
export const Route = createFileRoute("/api/public/cron/dispatch-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = request.headers.get("x-cron-secret");
        if (!cronSecret || !process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();
        const { data: due } = await supabaseAdmin
          .from("sequence_emails")
          .select("id, sequence_id, dealer_id")
          .eq("status", "scheduled")
          .lte("scheduled_for", now)
          .limit(500);

        const sentByDealer = new Map<string, number>();
        for (const e of due ?? []) {
          // Abstracted dispatch — v1 marks sent. Replace with Resend later.
          await supabaseAdmin.from("sequence_emails").update({ status: "sent", sent_at: now }).eq("id", e.id);
          sentByDealer.set(e.dealer_id, (sentByDealer.get(e.dealer_id) ?? 0) + 1);
        }

        for (const [dealerId, count] of sentByDealer.entries()) {
          await supabaseAdmin.from("activity_log").insert({
            dealer_id: dealerId, kind: "emails_sent", payload: { count },
          });
        }

        // Auto-complete sequences with all emails sent/cancelled
        const seqIds = Array.from(new Set((due ?? []).map((e) => e.sequence_id)));
        for (const sid of seqIds) {
          const { data: remaining } = await supabaseAdmin.from("sequence_emails").select("id").eq("sequence_id", sid).in("status", ["draft", "scheduled"]);
          if (!remaining || remaining.length === 0) {
            await supabaseAdmin.from("sequences").update({ status: "completed", updated_at: now }).eq("id", sid).eq("status", "active");
          }
        }

        return Response.json({ ok: true, sent: due?.length ?? 0 });

      },
    },
  },
});
