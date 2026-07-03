import { createFileRoute } from "@tanstack/react-router";

// Resend inbound email webhook.
// Reply-to is a single shared address like `sales@reply.wynback.co.uk`.
// We identify the customer from the From email (name is used only for logging)
// and find the sequence via In-Reply-To/References headers, falling back to
// the most recent active sequence for that customer.

export const Route = createFileRoute("/api/public/webhooks/inbound-reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid body" }, 400);
        }

        console.log("[inbound-reply] payload keys:", Object.keys(payload ?? {}), "data keys:", Object.keys(payload?.data ?? {}));

        if (payload?.type !== "email.received") {
          return json({ received: true, skipped: "unhandled_type" }, 200);
        }

        const data = payload.data ?? {};

        const fromRaw = typeof data.from === "string" ? data.from : data.from?.address ?? "";
        const fromEmail = extractEmail(fromRaw);
        if (!fromEmail) {
          return json({ received: true, skipped: "no_from" }, 200);
        }

        const subject: string | null = data.subject ?? null;
        const receivedId: string | null = data.id ?? data.email_id ?? null;

        // Resend inbound webhooks contain metadata only — fetch the body via API.
        let text = "";
        let fetchedHeaders: any = data.headers ?? null;
        let fetchedMessageId: string | null = data.message_id ?? null;
        if (receivedId) {
          try {
            const body = await fetchReceivedEmail(receivedId);
            if (body) {
              text = (body.text && String(body.text).trim())
                ? String(body.text)
                : stripHtml(String(body.html ?? ""));
              fetchedHeaders = body.headers ?? fetchedHeaders;
              fetchedMessageId = body.message_id ?? fetchedMessageId;
            }
          } catch (e) {
            console.error("[inbound-reply] fetch body failed", e);
          }
        }
        if (!text) {
          text = (data.text && String(data.text).trim())
            ? String(data.text)
            : stripHtml(String(data.html ?? ""));
        }
        const messageId = fetchedMessageId ?? receivedId;
        const inReplyTo = headerVal(fetchedHeaders, "In-Reply-To");
        const references = headerVal(fetchedHeaders, "References");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const { findSequenceForInbound } = await import("@/lib/replies.server");
        const seq = await findSequenceForInbound(db, { fromEmail, inReplyTo, references });
        if (!seq?.id) {
          return json({ received: true, skipped: "no_sequence_match", fromEmail }, 200);
        }
        const sequenceId = seq.id;


        try {
          const { processReply } = await import("@/lib/replies.server");
          await processReply(db, {
            sequenceId,
            text: (text || "(no body)").slice(0, 5000),
            source: "inbound_email",
            meta: { subject, fromEmail, messageId, inReplyTo },
          });
          return json({ received: true }, 200);
        } catch (e: any) {
          console.error("inbound reply failed", e);
          return json({ received: true, error: e?.message ?? "Failed" }, 500);
        }
      },
    },
  },
});

function parseSubAddress(email: string): { dealerSlug: string; customerId: string } | null {
  if (!email) return null;
  const clean = extractEmail(email);
  const [local] = clean.split("@");
  if (!local) return null;
  const plus = local.indexOf("+");
  if (plus <= 0) return null;
  const dealerSlug = local.slice(0, plus).trim().toLowerCase();
  const customerId = local.slice(plus + 1).trim();
  if (!dealerSlug || !customerId) return null;
  return { dealerSlug, customerId };
}

function extractEmail(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : "";
}

function headerVal(headers: any, name: string): string | null {
  if (!headers) return null;
  if (Array.isArray(headers)) {
    const h = headers.find((h: any) => (h?.Name ?? h?.name)?.toLowerCase() === name.toLowerCase());
    const v = h?.Value ?? h?.value ?? null;
    return typeof v === "string" ? v.replace(/^<|>$/g, "") : null;
  }
  if (typeof headers === "object") {
    const v = headers[name] ?? headers[name.toLowerCase()] ?? null;
    return typeof v === "string" ? v.replace(/^<|>$/g, "") : null;
  }
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function fetchReceivedEmail(id: string): Promise<any | null> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    console.warn("[inbound-reply] missing LOVABLE_API_KEY or RESEND_API_KEY");
    return null;
  }
  const res = await fetch(`https://connector-gateway.lovable.dev/resend/emails/receiving/${id}?html_format=data_uri`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
  });
  if (!res.ok) {
    console.error(`[inbound-reply] resend fetch ${res.status}:`, await res.text());
    return null;
  }
  return await res.json();
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

