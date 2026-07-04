import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

// Build a per-request Supabase client authenticated as the connected MCP user.
// RLS runs as that user, matching how the app's server functions behave.
export function supabaseForUser(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getDealerId(ctx: ToolContext): Promise<string | null> {
  const supabase = supabaseForUser(ctx);
  const { data } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", ctx.getUserId())
    .single();
  return (data as { id: string } | null)?.id ?? null;
}
