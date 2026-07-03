import { createFileRoute } from "@tanstack/react-router";
import { generateReplyAlias, plainTextToHtml, replyToAddress, sendResendEmail } from "@/lib/resend.server";

// Called every 15 minutes by pg_cron. Sends all scheduled emails whose time is due.
export const Route = createFileRoute("/api/public/cron/dispatch-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = request.headers.get("x-cron-secret");
        if (!cronSecret || !process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        let forceEmailIds: string[] = [];
        try {
          const body = await request.json();
          if (Array.isArray(body?.sequenceEmailIds)) {
            forceEmailIds = body.sequenceEmailIds.filter((id: unknown) => typeof id === "string");
          }
        } catch {
          // Cron calls do not need a JSON body.
        }

        const fromAddress = process.env.RESEND_FROM;
        if (!fromAddress) {
          return new Response("RESEND_FROM not configured", { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const now = new Date().toISOString();

        let dueQuery = db
          .from("sequence_emails")
          .select(`
            id,
            sequence_id,
            dealer_id,
            step,
            subject,
            body,
            reply_alias,
            dealer:dealers(id, slug, dealership_name, notification_email),
            customer:customers(id, name, email)
          `)
          .eq("status", "scheduled")
          .order("scheduled_for", { ascending: true })
          .limit(500);

        dueQuery = forceEmailIds.length > 0
          ? dueQuery.in("id", forceEmailIds)
          : dueQuery.lte("scheduled_for", now);

        const { data: due } = await dueQuery;

        const sentByDealer = new Map<string, number>();
        let sent = 0;
        let failed = 0;

        for (const e of due ?? []) {
          const customer = e.customer as any;
          const dealer = e.dealer as any;
          if (!customer?.email) {
            await db.from("sequence_emails").update({ status: "failed" }).eq("id", e.id);
            failed++;
            continue;
          }

          let alias: string = e.reply_alias;
          if (!alias) {
            if (!dealer?.slug) {
              await db.from("sequence_emails").update({ status: "failed" }).eq("id", e.id);
              failed++;
              continue;
            }
            alias = generateReplyAlias(dealer.slug);
            // Reserve the alias immediately so the next email doesn't collide.
            const { error: aliasErr } = await db.from("sequence_emails")
              .update({ reply_alias: alias })
              .eq("id", e.id)
              .is("reply_alias", null);
            if (aliasErr) {
              console.error("Failed to reserve reply alias", aliasErr);
              failed++;
              continue;
            }
          }

          try {
            const replyTo = replyToAddress(alias);
            const { resendEmailId, messageId } = await sendResendEmail({
              to: customer.email,
              from: `${dealer?.dealership_name ?? "Wynback"} <${fromAddress}>`,
              subject: e.subject,
              text: e.body,
              html: plainTextToHtml(e.body),
              replyTo,
              tags: [
                { name: "dealer_id", value: String(dealer?.id ?? "") },
                { name: "customer_id", value: String(customer?.id ?? "") },
                { name: "sequence_email_id", value: String(e.id) },
                { name: "step", value: String(e.step) },
              ],
            });

            await db.from("sequence_emails").update({
              status: "sent",
              sent_at: now,
              message_id: messageId,
              resend_email_id: resendEmailId,
            }).eq("id", e.id);

            sentByDealer.set(e.dealer_id, (sentByDealer.get(e.dealer_id) ?? 0) + 1);
            sent++;
          } catch (err: any) {
            console.error("Resend send failed for sequence_email", e.id, err?.message);
            await db.from("sequence_emails").update({
              status: "failed",
            }).eq("id", e.id);
            failed++;
          }
        }

        for (const [dealerId, count] of sentByDealer.entries()) {
          await db.from("activity_log").insert({
            dealer_id: dealerId, kind: "emails_sent", payload: { count },
          });
        }

        // Auto-complete sequences with all emails sent/cancelled/failed
        const seqIds = Array.from(new Set((due ?? []).map((e: any) => e.sequence_id)));
        for (const sid of seqIds) {
          const { data: remaining } = await db.from("sequence_emails").select("id").eq("sequence_id", sid).in("status", ["draft", "scheduled"]);
          if (!remaining || remaining.length === 0) {
            await db.from("sequences").update({ status: "completed", updated_at: now }).eq("id", sid).eq("status", "active");
          }
        }

        return Response.json({ ok: true, sent, failed });
      },
    },
  },
});
