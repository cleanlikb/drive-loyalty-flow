import { auth, defineMcp } from "@lovable.dev/mcp-js";
import dashboardStatsTool from "./tools/dashboard-stats";
import listCustomersTool from "./tools/list-customers";
import listHotLeadsTool from "./tools/list-hot-leads";
import listRecentRepliesTool from "./tools/list-recent-replies";

// The OAuth issuer MUST be the direct Supabase host. On publish, SUPABASE_URL
// is rewritten to a `.lovable.cloud` proxy, which mcp-js rejects (RFC 8414
// issuer mismatch). The project ref survives publish unchanged. The fallback
// keeps the issuer well-formed if this module is evaluated before the literal
// is inlined; a real token never verifies against the sentinel.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "wynback-mcp",
  title: "Wynback",
  version: "0.1.0",
  instructions:
    "Tools for a Wynback dealer account. Use `dashboard_stats` for this month's headline numbers, `list_hot_leads` for buyers showing intent, `list_recent_replies` to review customer replies, and `list_customers` to search past buyers.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [dashboardStatsTool, listHotLeadsTool, listRecentRepliesTool, listCustomersTool],
});
