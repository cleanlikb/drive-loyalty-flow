import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { makeDealerSlug } from "./resend.server";

async function ensureDealerId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("dealers").select("id").eq("user_id", userId).maybeSingle();
  if (data?.id) return data.id;
  const { data: created, error } = await supabase.from("dealers").insert({ user_id: userId }).select("id").single();
  if (error) throw error;
  return created.id;
}

async function uniqueSlug(supabase: any, base: string): Promise<string> {
  let slug = base;
  let attempt = 1;
  while (true) {
    const { data } = await supabase.from("dealers").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${base}-${suffix}`;
    attempt++;
    if (attempt > 10) {
      // Fallback to a UUID-based slug if collisions persist.
      return `${base}-${crypto.randomUUID().slice(0, 8)}`;
    }
  }
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
  daily_send_cap: z.number().int().min(1).max(500).optional(),
  send_window_start_hour: z.number().int().min(0).max(23).optional(),
  send_window_end_hour: z.number().int().min(1).max(24).optional(),
});



export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OnboardSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureDealerId(context.supabase, context.userId);
    const baseSlug = makeDealerSlug(data.dealership_name);
    const slug = await uniqueSlug(context.supabase, baseSlug);
    const { data: dealer, error } = await context.supabase
      .from("dealers")
      .update({
        dealership_name: data.dealership_name,
        salesperson_name: data.salesperson_name,
        website_url: data.website_url ?? null,
        slug,
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
