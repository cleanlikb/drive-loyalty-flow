import { createFileRoute } from "@tanstack/react-router";
import { verifyResendWebhook } from "@/lib/resend.server";

export const Route = createFileRoute("/api/public/webhooks/resend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook secret not configured", { status: 500 });
        }

        let payload: any;
        try {
          payload = await verifyResendWebhook(request, secret);
        } catch (e: any) {
          console.error("Resend webhook verification failed", e?.message);
          return new Response("Invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const now = new Date().toISOString();
        const eventType = payload?.type;
        const data = payload?.data ?? {};

        // Opens / clicks / bounces / deliveries are keyed by the Resend email id.
        const resendEmailId = data?.email_id ?? data?.id;
        if (resendEmailId && ["email.opened", "email.clicked", "email.bounced", "email.delivered"].includes(eventType)) {
          const { data: rows } = await db.from("sequence_emails")
            .select("id, open_count, click_count, opened_at, first_clicked_at, status")
            .eq("resend_email_id", resendEmailId)
            .limit(1);
          const row = rows?.[0];
          if (!row) return Response.json({ ok: true, skipped: "email_not_found" }, { status: 200 });

          const update: any = { updated_at: now };
          if (eventType === "email.opened") {
            update.open_count = (row.open_count ?? 0) + 1;
            if (!row.opened_at) update.opened_at = now;
          } else if (eventType === "email.clicked") {
            update.click_count = (row.click_count ?? 0) + 1;
            if (!row.first_clicked_at) update.first_clicked_at = now;
          } else if (eventType === "email.bounced") {
            update.status = "bounced";
            update.bounced_at = now;
          } else if (eventType === "email.delivered") {
            update.delivered_at = now;
          }
          await db.from("sequence_emails").update(update).eq("id", row.id);
          return Response.json({ ok: true }, { status: 200 });
        }

        // Inbound reply: route via the reply alias in the To address, then fall back to In-Reply-To.
        if (eventType === "email.received") {
          const toAddresses: string[] = Array.isArray(data?.to) ? data.to : [data?.to].filter(Boolean);
          const fromEmail = extractEmail(data?.from ?? "");
          const subject = data?.subject ?? null;
          const text = data?.text ?? data?.html ?? "";
          const headers = data?.headers ?? [];
          const inReplyTo = headerVal(headers, "In-Reply-To") ?? cleanId(data?.in_reply_to);
          const messageId = data?.id ?? null;

          let sequenceEmailId: string | null = null;
          let sequenceId: string | null = null;

          // 1. Exact alias match from the To address.
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

          // 2. Fallback: In-Reply-To header points to a stored message_id.
          if (!sequenceEmailId && inReplyTo) {
            const { data: rows } = await db.from("sequence_emails")
              .select("id, sequence_id")
              .eq("message_id", inReplyTo)
              .limit(1);
            if (rows?.[0]) {
              sequenceEmailId = rows[0].id;
              sequenceId = rows[0].sequence_id;
            }
          }

          if (!sequenceId) {
            return Response.json({ ok: true, skipped: "no_sequence" }, { status: 200 });
          }

          // Process the reply through the existing classification/forwarding pipeline.
          const { processReply } = await import("@/lib/replies.server");
          try {
            await processReply(db, {
              sequenceId,
              text: text.slice(0, 5000),
              source: "inbound_email",
              meta: { subject, fromEmail, messageId, inReplyTo },
            });
            if (sequenceEmailId) {
              await db.from("sequence_emails")
                .update({ replied_at: now, updated_at: now })
                .eq("id", sequenceEmailId);
            }
            return Response.json({ ok: true }, { status: 200 });
          } catch (e: any) {
            console.error("Resend inbound reply processing failed", e?.message);
            return Response.json({ error: e?.message ?? "Failed" }, { status: 500 });
          }
        }

        return Response.json({ ok: true, skipped: "unhandled_type" }, { status: 200 });
      },
    },
  },
});

function extractReplyAlias(email: string): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.trim().toLowerCase();
  if (!local || local.includes("+") || local.includes("_")) return null;
  // Alias format: {dealer_slug}-{hex}  e.g. smithmotors-a1b2c3d4
  if (!/^[a-z0-9-]+-[a-f0-9]{8}$/.test(local)) return null;
  return local;
}

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
