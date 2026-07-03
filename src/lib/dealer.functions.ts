import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureDealerId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("dealers").select("id").eq("user_id", userId).maybeSingle();
  if (data?.id) return data.id;
  const { data: created, error } = await supabase.from("dealers").insert({ user_id: userId }).select("id").single();
  if (error) throw error;
  return created.id;
}

export const getMyDealer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureDealerId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("dealers")
      .select("*")
      .eq("user_id", context.userId)
      .single();
    if (error) throw error;
    return data;
  });

const OnboardSchema = z.object({
  dealership_name: z.string().trim().min(1).max(120),
  salesperson_name: z.string().trim().min(1).max(120),
  website_url: z.string().trim().max(500).optional().nullable(),
  notification_email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  forward_replies: z.boolean().optional(),
  milestone_months: z.array(z.number().int().min(1).max(240)).max(24).optional(),
});


export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OnboardSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureDealerId(context.supabase, context.userId);
    const { data: dealer, error } = await context.supabase
      .from("dealers")
      .update({
        dealership_name: data.dealership_name,
        salesperson_name: data.salesperson_name,
        website_url: data.website_url ?? null,
        onboarded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return { ok: true, dealer };
  });

export const updateDealerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OnboardSchema.partial().parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dealers")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
