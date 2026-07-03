import { createFileRoute } from "@tanstack/react-router";

// Inbound-email webhook. Providers supported (auto-detected):
//   Postmark:  { From, TextBody, StrippedTextReply, Subject, MessageID, Headers, To }
//   SendGrid:  { from, text, subject, headers, to }
//   Mailgun:   { sender, "stripped-text", "body-plain", subject, "Message-Id", "In-Reply-To", recipient }
//   Resend:    { from: { address }, text, subject, headers, to }
//   Generic:   { from, text, subject?, messageId?, inReplyTo?, sequenceId?, to? }
//
// Auth: ?token=<INBOUND_WEBHOOK_SECRET> or header x-webhook-secret.

export const Route = createFileRoute("/api/public/webhooks/inbound-reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INBOUND_WEBHOOK_SECRET;
        if (!secret) return json({ error: "Webhook not configured" }, 500);

        const token = request.headers.get("x-webhook-secret");
        if (!token || token !== secret) return json({ error: "Unauthorized" }, 401);

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

        // Collect all To / recipient addresses so we can try reply-alias matching first.
        const toAddresses: string[] = [
          payload.To, payload.to, payload.recipient,
          payload.To?.address, payload.to?.address,
          headerVal(payload.Headers, "To"),
          headerVal(payload.headers, "To"),
        ].filter(Boolean).flatMap((v) => (Array.isArray(v) ? v : [v]));

        if (!text || (!fromEmail && !explicitSeqId && !inReplyTo && toAddresses.length === 0)) {
          return json({ error: "Missing from/text" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const { processReply, findSequenceForInbound } = await import("@/lib/replies.server");

        let sequenceId = explicitSeqId;
        let sequenceEmailId: string | null = null;

        if (!sequenceId) {
          // 1. Exact match by reply_alias in the To address.
          for (const addr of toAddresses) {
            const alias = extractReplyAlias(addr);
            if (!alias) continue;
            const { data: rows } = await db.from("sequence_emails")
              .select("id, sequence_id")
              .eq("reply_alias", alias)
              .limit(1);
            if (rows?.[0]) {
              sequenceEmailId = rows[0].id;
              sequenceId = rows[0].sequence_id;
              break;
            }
          }

          // 2. Fallback: In-Reply-To / References threading, then sender email.
          if (!sequenceId) {
            const seq = await findSequenceForInbound(db, { fromEmail, inReplyTo, references });
            if (!seq) return json({ ok: true, skipped: "no_active_sequence", fromEmail }, 200);
            sequenceId = seq.id;
          }
        }

        try {
          const result = await processReply(db, {
            sequenceId: sequenceId!,
            text: text.slice(0, 5000),
            source: "inbound_email",
            meta: { subject, fromEmail, messageId, inReplyTo },
          });
          if (sequenceEmailId) {
            await db.from("sequence_emails")
              .update({ replied_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq("id", sequenceEmailId);
          }
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

function extractReplyAlias(email: string): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.trim().toLowerCase();
  if (!local) return null;
  // Alias format: {dealer_slug}-{hex}  e.g. smithmotors-a1b2c3d4
  if (!/^[a-z0-9-]+-[a-f0-9]{8}$/.test(local)) return null;
  return local;
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
