import { createFileRoute } from "@tanstack/react-router";

// Inbound-email webhook. Configure your inbound-email provider (Postmark,
// SendGrid Inbound Parse, Resend Inbound, Mailgun Routes, CloudMailin, etc.)
// to POST replies here. All providers include From + text body; we look up
// the customer by From email, find their active sequence, and process the
// reply automatically — stopping the sequence and (if they say they've sold
// the car or want to unsubscribe) permanently excluding them from future
// cohorts.
//
// Auth: pass ?token=<INBOUND_WEBHOOK_SECRET> OR header `x-webhook-secret`.
//
// Accepted payload shapes (auto-detected):
//   Postmark:   { From, TextBody, StrippedTextReply, Subject }
//   SendGrid:   { from, text, subject }          (form-encoded also OK)
//   Mailgun:    { sender, "stripped-text", "body-plain", subject }
//   Resend:     { from: { address }, text, subject }
//   Generic:    { from, text, sequenceId? }      (sequenceId is optional)

export const Route = createFileRoute("/api/public/webhooks/inbound-reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INBOUND_WEBHOOK_SECRET;
        if (!secret) return json({ error: "Webhook not configured" }, 500);

        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? request.headers.get("x-webhook-secret");
        if (token !== secret) return json({ error: "Unauthorized" }, 401);

        // Parse body (JSON or form-encoded from some providers)
        const ct = request.headers.get("content-type") ?? "";
        let payload: any = {};
        try {
          if (ct.includes("application/json")) {
            payload = await request.json();
          } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
            const fd = await request.formData();
            payload = Object.fromEntries(fd.entries());
          } else {
            const raw = await request.text();
            try { payload = JSON.parse(raw); } catch { payload = { text: raw }; }
          }
        } catch (e) {
          return json({ error: "Invalid body" }, 400);
        }

        const fromEmail = extractEmail(
          payload.From ?? payload.from ?? payload.sender ??
          payload.From?.address ?? payload.from?.address ?? ""
        );
        const text: string =
          payload.StrippedTextReply || payload.TextBody ||
          payload["stripped-text"] || payload["body-plain"] ||
          payload.text || payload.body || "";
        const explicitSeqId: string | undefined = payload.sequenceId ?? payload.sequence_id;

        if (!text || (!fromEmail && !explicitSeqId)) {
          return json({ error: "Missing from/text" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processReply, findActiveSequenceByEmail } = await import("@/lib/replies.server");

        let sequenceId = explicitSeqId;
        if (!sequenceId) {
          const seq = await findActiveSequenceByEmail(supabaseAdmin, fromEmail);
          if (!seq) return json({ ok: true, skipped: "no_active_sequence", fromEmail }, 200);
          sequenceId = seq.id;
        }

        try {
          const result = await processReply(supabaseAdmin, {
            sequenceId: sequenceId!,
            text: text.slice(0, 5000),
            source: "inbound_email",
          });
          return json({ ok: true, classification: result.classification.classification }, 200);
        } catch (e: any) {
          console.error("inbound reply failed", e);
          return json({ error: e?.message ?? "Failed" }, 500);
        }
      },
    },
  },
});

function extractEmail(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
