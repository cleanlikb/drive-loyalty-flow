import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const StockRow = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  year: z.number().int().min(1980).max(2100).optional().nullable(),
  trim: z.string().trim().max(80).optional().nullable(),
  price: z.number().optional().nullable(),
  image_url: z.string().trim().max(2000).optional().nullable(),
  listing_url: z.string().trim().max(2000).optional().nullable(),
});

export const listStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: items } = await context.supabase.from("stock").select("*").order("last_seen_at", { ascending: false }).limit(500);
    const { data: syncs } = await context.supabase.from("stock_syncs").select("*").order("ran_at", { ascending: false }).limit(1);
    return { items: items ?? [], lastSync: syncs?.[0] ?? null };
  });

export const addStockManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StockRow.parse(d))
  .handler(async ({ data, context }) => {
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) throw new Error("Dealer not found");
    const { error } = await context.supabase.from("stock").insert({ ...data, dealer_id: dealer.id, source: "csv" });
    if (error) throw error;
    return { ok: true };
  });

export const bulkInsertStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(StockRow).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) throw new Error("Dealer not found");
    const rows = data.rows.map((r) => ({ ...r, dealer_id: dealer.id, source: "csv" as const }));
    const { error } = await context.supabase.from("stock").insert(rows);
    if (error) throw error;
    return { inserted: rows.length };
  });

export const syncStockFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: dealer } = await context.supabase.from("dealers").select("id").eq("user_id", context.userId).single();
    if (!dealer) throw new Error("Dealer not found");

    const { scrapeStockUrl } = await import("./stock-scrape.server");
    let items: any[] = [];
    let error: string | null = null;
    try {
      items = await scrapeStockUrl(data.url);
    } catch (e: any) {
      error = e?.message ?? "Scrape failed";
    }

    await context.supabase.from("dealers").update({ stock_page_url: data.url }).eq("id", dealer.id);

    if (items.length > 0) {
      // Mark all existing scrape stock as inactive first
      await context.supabase.from("stock").update({ active: false }).eq("dealer_id", dealer.id).eq("source", "scrape");
      const rows = items.map((i) => ({ ...i, dealer_id: dealer.id, source: "scrape" as const, active: true, last_seen_at: new Date().toISOString() }));
      await context.supabase.from("stock").insert(rows);
    }

    await context.supabase.from("stock_syncs").insert({
      dealer_id: dealer.id,
      source_url: data.url,
      items_found: items.length,
      status: error ? "error" : "ok",
      error,
    });

    return { itemsFound: items.length, error };
  });
