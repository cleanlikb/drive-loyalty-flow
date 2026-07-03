import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EMAIL_RE = /^[^\s<>@"]+@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

type DomainsResult =
  | { ok: true; domains: string[]; restricted?: false }
  | { ok: true; domains: []; restricted: true; message: string }
  | { ok: false; domains: []; error: string; status?: number };

async function fetchVerifiedDomains(): Promise<DomainsResult> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    return { ok: false, domains: [], error: "Email provider is not configured yet. Please contact support." };
  }
  const res = await fetch("https://connector-gateway.lovable.dev/resend/domains", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
  });
  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch {}

  // Resend "sending-only" API keys cannot list domains. Treat this as a
  // known-benign case: we can't auto-verify, but the user can still save an
  // address they've manually verified in Resend.
  if (res.status === 401 && String(json?.name ?? "").toLowerCase() === "restricted_api_key") {
    return {
      ok: true,
      domains: [],
      restricted: true,
      message: "We can't auto-check verified domains with the current provider key — saving without an automated check.",
    };
  }

  if (!res.ok) {
    return { ok: false, domains: [], error: `Could not reach email provider (${res.status})`, status: res.status };
  }
  const arr: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const verified = arr
    .filter((d) => String(d?.status ?? "").toLowerCase() === "verified")
    .map((d) => String(d?.name ?? "").toLowerCase())
    .filter(Boolean);
  return { ok: true, domains: verified };
}

export const listVerifiedSenderDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return await fetchVerifiedDomains();
  });

export const verifySenderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().trim().toLowerCase().max(200) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const email = data.email;
    if (!EMAIL_RE.test(email)) {
      return { ok: false as const, reason: "invalid_format", message: "Enter a valid email address (e.g. hello@yourdomain.com)." };
    }
    const domain = email.split("@")[1];
    const result = await fetchVerifiedDomains();
    if (!result.ok) {
      return { ok: false as const, reason: "provider_error", message: result.error };
    }

    // When the provider key can't list domains (restricted key), trust the
    // user's input — sends will surface any Resend-side error clearly.
    const skippedCheck = "restricted" in result && result.restricted === true;

    if (!skippedCheck) {
      const matched = result.domains.some((d) => d === domain);
      if (!matched) {
        return {
          ok: false as const,
          reason: "domain_not_verified",
          message: `The domain "${domain}" is not verified with the email provider. Add and verify it before you can send from this address.`,
          verifiedDomains: result.domains,
        };
      }
    }

    const { error } = await context.supabase
      .from("dealers")
      .update({
        sender_email: email,
        sender_verified: true,
        sender_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);
    if (error) throw error;

    return { ok: true as const, email, domain, autoVerified: !skippedCheck };
  });

export const clearSenderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("dealers")
      .update({
        sender_email: null,
        sender_verified: false,
        sender_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
