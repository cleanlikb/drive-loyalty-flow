import { createFileRoute } from "@tanstack/react-router";

// Placeholder for future inbound-email provider webhooks (e.g. Resend, Postmark).
// v1: replies are logged manually through the app. When we plug in an inbox,
// this handler should look up the sequence via message ID header, call
// logReply's underlying logic, and return 200.
export const Route = createFileRoute("/api/public/webhooks/inbound-reply")({
  server: {
    handlers: {
      POST: async () => new Response("Not implemented — reply-via-app for v1", { status: 501 }),
    },
  },
});
