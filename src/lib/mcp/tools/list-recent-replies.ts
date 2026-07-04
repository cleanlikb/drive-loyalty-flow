import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_recent_replies",
  title: "List recent replies",
  description: "List recent customer replies with AI classification (hot_lead, interested, no_longer_owns, unsubscribe, replied).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 25)."),
    classification: z
      .enum(["replied", "no_longer_owns", "unsubscribe", "interested", "hot_lead"])
      .optional()
      .describe("Optional filter on the reply classification."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, classification }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("replies")
      .select("id,classification,summary,created_at,customer:customers(name,email,make,model)")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (classification) q = q.eq("classification", classification);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { replies: data ?? [] },
    };
  },
});
