import { createFileRoute } from "@tanstack/react-router";

// Resend inbound email webhook.
// Reply-to addresses use `{dealer-slug}+{customer-id}@ezeotolion.resend.app`
// (Resend's auto-provisioned test inbound domain) so we can route replies back
// to the right dealer + customer without any MX setup.
//
// TODO: swap ezeotolion.resend.app -> reply.wynback.co.uk once MX is verified.

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
        console.log("[inbound-reply] raw payload:", JSON.stringify(payload).slice(0, 4000));

        if (payload?.type !== "email.received") {
          return json({ received: true, skipped: "unhandled_type" }, 200);
        }


        const data = payload.data ?? {};
        const toAddresses: string[] = (Array.isArray(data.to) ? data.to : [data.to])
          .filter(Boolean)
          .map((v: any) => (typeof v === "string" ? v : v?.address ?? ""))
          .filter(Boolean);

        let dealerSlug: string | null = null;
        let customerId: string | null = null;
        for (const addr of toAddresses) {
          const parsed = parseSubAddress(addr);
          if (parsed) {
            dealerSlug = parsed.dealerSlug;
            customerId = parsed.customerId;
            break;
          }
        }

        if (!dealerSlug || !customerId) {
          return json({ received: true, skipped: "no_sub_address" }, 200);
        }

        const fromEmail = extractEmail(
          typeof data.from === "string" ? data.from : data.from?.address ?? "",
        );
        const subject: string | null = data.subject ?? null;
        const text: string = (data.text && String(data.text).trim())
          ? String(data.text)
          : String(data.html ?? "");
        const messageId = data.id ?? data.message_id ?? null;
        const inReplyTo = headerVal(data.headers, "In-Reply-To");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const { data: dealer } = await db.from("dealers")
          .select("id").eq("slug", dealerSlug).maybeSingle();
        if (!dealer) return json({ received: true, skipped: "dealer_not_found" }, 200);

        const { data: customer } = await db.from("customers")
          .select("id, dealer_id").eq("id", customerId).maybeSingle();
        if (!customer || customer.dealer_id !== dealer.id) {
          return json({ received: true, skipped: "customer_not_found" }, 200);
        }

        // Find the most recent active sequence for this customer; fall back to the latest.
        const { data: activeSeq } = await db.from("sequences")
          .select("id")
          .eq("customer_id", customer.id)
          .eq("dealer_id", dealer.id)
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .limit(1);
        let sequenceId = activeSeq?.[0]?.id as string | undefined;
        if (!sequenceId) {
          const { data: anySeq } = await db.from("sequences")
            .select("id")
            .eq("customer_id", customer.id)
            .eq("dealer_id", dealer.id)
            .order("started_at", { ascending: false })
            .limit(1);
          sequenceId = anySeq?.[0]?.id;
        }
        if (!sequenceId) {
          return json({ received: true, skipped: "no_sequence" }, 200);
        }

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
