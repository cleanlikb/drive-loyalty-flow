import { createFileRoute } from "@tanstack/react-router";

// Called every 15 minutes by pg_cron. Sends all scheduled emails whose time is due.
export const Route = createFileRoute("/api/public/cron/dispatch-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();
        const { data: due } = await supabaseAdmin
          .from("sequence_emails")
          .select("id, sequence_id")
          .eq("status", "scheduled")
          .lte("scheduled_for", now)
          .limit(500);

        let sent = 0;
        for (const e of due ?? []) {
          // Abstracted dispatch — v1 marks sent. Replace with Resend later.
          await supabaseAdmin.from("sequence_emails").update({ status: "sent", sent_at: now }).eq("id", e.id);
          sent++;
        }

        // Auto-complete sequences with all emails sent/cancelled
        const seqIds = Array.from(new Set((due ?? []).map((e) => e.sequence_id)));
        for (const sid of seqIds) {
          const { data: remaining } = await supabaseAdmin.from("sequence_emails").select("id").eq("sequence_id", sid).in("status", ["draft", "scheduled"]);
          if (!remaining || remaining.length === 0) {
            await supabaseAdmin.from("sequences").update({ status: "completed", updated_at: now }).eq("id", sid).eq("status", "active");
          }
        }

        return Response.json({ ok: true, sent });
      },
    },
  },
});
