import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("replies")
      .select("*, customer:customers(id,name,email,make,model), sequence:sequences(id,status)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data;
  });

const ClassSchema = z.enum(["replied", "no_longer_owns", "unsubscribe", "interested", "hot_lead"]);

export const overrideReplyClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    classification: ClassSchema,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: reply } = await context.supabase.from("replies")
      .select("*, sequence:sequences(id)").eq("id", data.id).single();
    if (!reply) throw new Error("Reply not found");

    await context.supabase.from("replies")
      .update({ classification: data.classification, manual_override: true, confidence: 1 })
      .eq("id", data.id);

    // Apply the side-effects of the new classification to the customer record.
    const patch: {
      status?: "active" | "no_longer_owns" | "unsubscribed";
      is_hot_lead?: boolean;
      hot_lead_at?: string;
    } = {};
    if (data.classification === "no_longer_owns") patch.status = "no_longer_owns";
    else if (data.classification === "unsubscribe") patch.status = "unsubscribed";
    else if (data.classification === "hot_lead") {
      patch.is_hot_lead = true;
      patch.hot_lead_at = new Date().toISOString();
    } else {
      // interested or replied — revert previous auto-stop side-effects
      patch.status = "active";
      patch.is_hot_lead = false;
    }
    await context.supabase.from("customers").update(patch).eq("id", reply.customer_id);
    return { ok: true };
  });

export const listHotLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("customers")
      .select("id,name,email,make,model,next_car_notes,hot_lead_at")
      .eq("is_hot_lead", true)
      .order("hot_lead_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  });

export const clearHotLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ customerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("customers")
      .update({ is_hot_lead: false })
      .eq("id", data.customerId);
    return { ok: true };
  });
