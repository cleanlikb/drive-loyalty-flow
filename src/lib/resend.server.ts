import { createHmac, randomBytes } from "crypto";

const REPLY_DOMAIN = "reply.wynback.co.uk";
const EMAIL_RE = /^[^\s<>@"]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function extractEmailAddress(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = match?.[0]?.trim().toLowerCase() ?? null;
  return email && EMAIL_RE.test(email) ? email : null;
}

export function generateReplyAlias(dealerSlug: string): string {
  const rand = randomBytes(4).toString("hex"); // 8 chars
  return `${dealerSlug}-${rand}`;
}

export function replyToAddress(alias: string): string {
  return `${alias}@${REPLY_DOMAIN}`;
}

export function makeDealerSlug(dealershipName: string): string {
  return dealershipName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export async function sendResendEmail(args: {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}): Promise<{ resendEmailId: string; messageId: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey) throw new Error("Missing LOVABLE_API_KEY");
  if (!resendKey) throw new Error("Missing RESEND_API_KEY");
  const from = extractEmailAddress(args.from);
  if (!from) throw new Error("Invalid sender email configured");
  const replyTo = extractEmailAddress(args.replyTo);

  const body: any = {
    from,
    to: [args.to],
    subject: args.subject,
    text: args.text,
    ...(args.html ? { html: args.html } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(args.tags ? { tags: args.tags } : {}),
  };

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Resend send failed ${res.status}: ${text.slice(0, 300)}`);
  }

  let json: any;
  try { json = JSON.parse(text); } catch { json = {}; }
  const resendEmailId = json?.id;
  if (!resendEmailId) {
    throw new Error(`Resend returned no email id: ${text.slice(0, 200)}`);
  }

  // Resend's send response gives the Resend id, while mailbox replies thread
  // against the RFC Message-ID. Fetch it immediately so inbound replies can be
  // matched exactly by In-Reply-To/References instead of guessing by sender.
  const sentDetails = await fetchSentEmailDetails(resendEmailId, lovableKey, resendKey);
  const messageId = sentDetails?.message_id ?? json?.message_id ?? resendEmailId;
  return { resendEmailId, messageId };
}

async function fetchSentEmailDetails(id: string, lovableKey: string, resendKey: string): Promise<any | null> {
  try {
    const res = await fetch(`https://connector-gateway.lovable.dev/resend/emails/${id}`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
    });
    if (!res.ok) {
      console.warn(`Resend sent-email lookup ${res.status}:`, await res.text());
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn("Resend sent-email lookup failed", e);
    return null;
  }
}

export function plainTextToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/**
 * Verify a Resend webhook signature using the signing secret.
 * Returns the parsed payload if valid, otherwise throws.
 */
export async function verifyResendWebhook(request: Request, secret: string): Promise<any> {
  // Prefer Svix if available; otherwise fall back to a manual HMAC verification.
  let svix;
  try {
    svix = (await import("svix")).Webhook;
  } catch {
    svix = null;
  }

  const payload = await request.text();
  const signature = request.headers.get("svix-signature") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  const id = request.headers.get("svix-id") ?? "";

  if (!signature || !timestamp || !id) {
    throw new Error("Missing Svix headers");
  }

  if (svix) {
    const wh = new svix(secret);
    return wh.verify(payload, {
      "svix-signature": signature,
      "svix-timestamp": timestamp,
      "svix-id": id,
    });
  }

  // Manual verification fallback.
  const signedPayload = `${id}.${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const signatures = signature.split(" ").map((s) => s.split(",").pop()?.trim()).filter(Boolean) as string[];
  const valid = signatures.some((sig) => timingSafeCompare(sig, expected));
  if (!valid) throw new Error("Invalid webhook signature");
  return JSON.parse(payload);
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  let result = 0;
  for (let i = 0; i < aBuf.length; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}
