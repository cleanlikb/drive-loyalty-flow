import { createFileRoute } from "@tanstack/react-router";

// Daily safety-net: re-classify any replies that came back with low confidence
// (<0.6) or the generic "replied" bucket, and haven't been manually overridden.
export const Route = createFileRoute("/api/public/cron/rescan-replies")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { classifyText } = await import("@/lib/replies.server");

        const { data: candidates } = await supabaseAdmin
          .from("replies")
          .select("id, raw_text, dealer_id, customer_id, classification, confidence, manual_override")
          .eq("manual_override", false)
          .or("confidence.lt.0.6,confidence.is.null,classification.eq.replied")
          .is("rescanned_at", null)
          .limit(50);

        let rescanned = 0, changed = 0;
        for (const r of candidates ?? []) {
          try {
            const next = await classifyText(r.raw_text);
            const patch: Record<string, unknown> = {
              rescanned_at: new Date().toISOString(),
              confidence: next.confidence,
              summary: next.summary,
            };
            if (next.classification !== r.classification && next.confidence > (r.confidence ?? 0)) {
              patch.classification = next.classification;
              if (next.next_car_notes) patch.next_car_notes = next.next_car_notes;
              changed++;
            }
            await supabaseAdmin.from("replies").update(patch).eq("id", r.id);
            rescanned++;
          } catch (e) {
            console.error("rescan failed", r.id, e);
          }
        }
        return Response.json({ ok: true, rescanned, changed });
      },
    },
  },
});
