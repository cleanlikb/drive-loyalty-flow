import { createFileRoute } from "@tanstack/react-router";

// Inbound-email webhook. Providers supported (auto-detected):
//   Postmark:  { From, TextBody, StrippedTextReply, Subject, MessageID, Headers }
//   SendGrid:  { from, text, subject, headers }
//   Mailgun:   { sender, "stripped-text", "body-plain", subject, "Message-Id", "In-Reply-To" }
//   Resend:    { from: { address }, text, subject, headers }
//   Generic:   { from, text, subject?, messageId?, inReplyTo?, sequenceId? }
//
// Auth: ?token=<INBOUND_WEBHOOK_SECRET> or header x-webhook-secret.

export const Route = createFileRoute("/api/public/webhooks/inbound-reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INBOUND_WEBHOOK_SECRET;
        if (!secret) return json({ error: "Webhook not configured" }, 500);

        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? request.headers.get("x-webhook-secret");
        if (token !== secret) return json({ error: "Unauthorized" }, 401);

        const ct = request.headers.get("content-type") ?? "";
        let payload: any = {};
        try {
          if (ct.includes("application/json")) payload = await request.json();
          else if (ct.includes("form")) {
            const fd = await request.formData();
            payload = Object.fromEntries(fd.entries());
          } else {
            const raw = await request.text();
            try { payload = JSON.parse(raw); } catch { payload = { text: raw }; }
          }
        } catch {
          return json({ error: "Invalid body" }, 400);
        }

        const fromEmail = extractEmail(
          payload.From ?? payload.from ?? payload.sender ??
          payload.From?.address ?? payload.from?.address ?? "",
        );
        const text: string =
          payload.StrippedTextReply || payload.TextBody ||
          payload["stripped-text"] || payload["body-plain"] ||
          payload.text || payload.body || "";
        const subject: string = payload.Subject ?? payload.subject ?? null;
        const messageId = cleanId(payload.MessageID ?? payload.messageId ?? payload["Message-Id"] ?? payload.message_id);
        const inReplyTo = cleanId(
          payload.inReplyTo ?? payload["In-Reply-To"] ?? payload.in_reply_to ??
          headerVal(payload.Headers, "In-Reply-To") ?? headerVal(payload.headers, "In-Reply-To"),
        );
        const references = payload.References ?? payload.references ??
          headerVal(payload.Headers, "References") ?? headerVal(payload.headers, "References") ?? null;
        const explicitSeqId: string | undefined = payload.sequenceId ?? payload.sequence_id;

        if (!text || (!fromEmail && !explicitSeqId && !inReplyTo)) {
          return json({ error: "Missing from/text" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processReply, findSequenceForInbound } = await import("@/lib/replies.server");

        let sequenceId = explicitSeqId;
        if (!sequenceId) {
          const seq = await findSequenceForInbound(supabaseAdmin, { fromEmail, inReplyTo, references });
          if (!seq) return json({ ok: true, skipped: "no_active_sequence", fromEmail }, 200);
          sequenceId = seq.id;
        }

        try {
          const result = await processReply(supabaseAdmin, {
            sequenceId: sequenceId!,
            text: text.slice(0, 5000),
            source: "inbound_email",
            meta: { subject, fromEmail, messageId, inReplyTo },
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
function cleanId(v: any): string | null {
  if (!v || typeof v !== "string") return null;
  return v.replace(/^<|>$/g, "").trim() || null;
}
function headerVal(headers: any, name: string): string | null {
  if (!headers) return null;
  if (Array.isArray(headers)) {
    const h = headers.find((h: any) => (h?.Name ?? h?.name)?.toLowerCase() === name.toLowerCase());
    return h?.Value ?? h?.value ?? null;
  }
  if (typeof headers === "object") return headers[name] ?? headers[name.toLowerCase()] ?? null;
  return null;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
