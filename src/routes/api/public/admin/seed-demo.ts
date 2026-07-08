import { createFileRoute } from "@tanstack/react-router";
import Papa from "papaparse";

// One-shot demo seeder. POST with header x-cron-secret and CSV body (text/csv).
// Query params: ?email=&password=&dealership=&salesperson=
export const Route = createFileRoute("/api/public/admin/seed-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-cron-secret");
        if (!secret || !process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }
        const url = new URL(request.url);
        const email = url.searchParams.get("email") ?? "demo@wynback.co.uk";
        const password = url.searchParams.get("password") ?? "Admin123!";
        const dealership = url.searchParams.get("dealership") ?? "Wynback Demo Motors";
        const salesperson = url.searchParams.get("salesperson") ?? "Alex Wynn";

        const csvText = await request.text();
        if (!csvText.trim()) return new Response("Missing CSV body", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find or create the auth user
        let userId: string | null = null;
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (existing) {
          userId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, { password, email_confirm: true });
        } else {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true,
          });
          if (error || !created.user) return new Response(`createUser: ${error?.message}`, { status: 500 });
          userId = created.user.id;
        }

        // Ensure dealer row (trigger creates it, but be safe)
        await supabaseAdmin.from("dealers").upsert(
          { user_id: userId },
          { onConflict: "user_id", ignoreDuplicates: true },
        );
        const { data: dealer } = await supabaseAdmin.from("dealers").select("*").eq("user_id", userId).single();
        if (!dealer) return new Response("Dealer not found", { status: 500 });

        await supabaseAdmin.from("dealers").update({
          dealership_name: dealership,
          salesperson_name: salesperson,
          website_url: "https://wynback.co.uk",
          onboarded_at: new Date().toISOString(),
        }).eq("id", dealer.id);

        // Wipe existing dealer data (cascades handle children)
        await supabaseAdmin.from("sequence_emails").delete().eq("dealer_id", dealer.id);
        await supabaseAdmin.from("replies").delete().eq("dealer_id", dealer.id);
        await supabaseAdmin.from("sequences").delete().eq("dealer_id", dealer.id);
        await supabaseAdmin.from("cohort_customers").delete().eq("dealer_id", dealer.id);
        await supabaseAdmin.from("cohorts").delete().eq("dealer_id", dealer.id);
        await supabaseAdmin.from("customers").delete().eq("dealer_id", dealer.id);
        await supabaseAdmin.from("notifications").delete().eq("dealer_id", dealer.id);
        await supabaseAdmin.from("activity_log").delete().eq("dealer_id", dealer.id);

        // Parse CSV
        const parsed = Papa.parse<Record<string, string>>(csvText, {
          header: true, skipEmptyLines: true,
        });
        const rows = parsed.data.filter((r) => r["Customer name"]?.trim());

        const norm = (s: string | undefined) => (s ?? "").trim();
        const priceNum = (s: string | undefined) => {
          const n = parseFloat(norm(s).replace(/[£,]/g, ""));
          return isNaN(n) ? null : n;
        };
        const dateStr = (s: string | undefined) => {
          const t = norm(s);
          if (!t) return null;
          const d = new Date(t);
          return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
        };

        const customers = rows.map((r) => ({
          dealer_id: dealer.id,
          name: norm(r["Customer name"]),
          email: norm(r["Email"]) || null,
          vehicle_reg: norm(r["Vehicle registration"]) || null,
          make: norm(r["Make"]) || null,
          model: norm(r["Model"]) || null,
          trim: norm(r["Trim"]) || null,
          sale_date: dateStr(r["Sale date"]),
          sale_price: priceNum(r["Sale price"]),
          status: "active" as const,
        }));

        // Batch insert
        let inserted = 0;
        const chunk = 500;
        for (let i = 0; i < customers.length; i += chunk) {
          const slice = customers.slice(i, i + chunk);
          const { error } = await supabaseAdmin.from("customers").insert(slice);
          if (error) return new Response(`insert: ${error.message}`, { status: 500 });
          inserted += slice.length;
        }

        await supabaseAdmin.from("activity_log").insert({
          dealer_id: dealer.id, kind: "demo_loaded", payload: { customers: inserted },
        });
        await supabaseAdmin.from("notifications").insert({
          dealer_id: dealer.id, kind: "monthly_cohort",
          title: "Demo data loaded",
          body: `${inserted} past customers imported. Explore leads, sequences and replies.`,
        });

        return Response.json({ ok: true, userId, dealerId: dealer.id, customers: inserted });
      },
    },
  },
});
