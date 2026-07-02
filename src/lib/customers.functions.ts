import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CustomerRow = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  vehicle_reg: z.string().trim().max(20).optional().nullable(),
  make: z.string().trim().max(60).optional().nullable(),
  model: z.string().trim().max(80).optional().nullable(),
  trim: z.string().trim().max(80).optional().nullable(),
  sale_date: z.string().trim().optional().nullable(),
  sale_price: z.number().optional().nullable(),
  finance_type: z.string().trim().max(40).optional().nullable(),
  finance_term_months: z.number().int().optional().nullable(),
});

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("customers")
      .select("*")
      .order("sale_date", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return data;
  });

export const bulkInsertCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(CustomerRow).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) throw new Error("Dealer not found");
    const rows = data.rows.map((r) => ({
      ...r,
      email: r.email || null,
      dealer_id: dealer.id,
    }));
    const { error } = await context.supabase.from("customers").insert(rows);
    if (error) throw error;
    return { inserted: rows.length };
  });

export const setCustomerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["active", "no_longer_owns", "unsubscribed"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("customers").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
