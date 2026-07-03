## Problem

Right now, once a domain is verified in Resend (for any dealer), *any* dealer using Wynback could enter a sender address on that domain in Settings and start sending as it. Since all dealers share one Resend account, there's nothing tying the domain they claim to the domain they actually own.

## Safety measure

Tie the sender domain to the domain of the dealer's own Wynback login email. A dealer signed in as `sarah@bbb.co.uk` can only save a sender address whose domain is `bbb.co.uk` or a subdomain of it (e.g. `sales@bbb.co.uk`, `noreply@mail.bbb.co.uk`). Any other domain is rejected up front, before we even check Resend.

This works because the login email is verified by Lovable Cloud auth (via magic link / OAuth), so we know the person controls that inbox. Free-mail domains (gmail, outlook, hotmail, yahoo, icloud, etc.) are blocked entirely — a `@gmail.com` dealer can't claim any domain this way and would need a manual/admin override.

### Rules

1. Get the dealer's auth email from the session (`context.claims.email` — server-side, not client input).
2. Reject if that email is on a public/free-mail domain from a small blocklist.
3. Extract the dealer domain (e.g. `bbb.co.uk`).
4. Accept the sender address only if its domain equals the dealer domain or ends with `.<dealer domain>`.
5. Only after that passes, run the existing Resend "is this domain verified?" check and save.

### Where the check goes

- **`src/lib/sender.functions.ts` → `verifySenderEmail`**: add the new check before the existing `fetchVerifiedDomains()` call. Return a clear error like *"You can only send from an address on bbb.co.uk — sarah@bbb.co.uk isn't allowed to send as @ccc.co.uk."*
- **`src/routes/_authenticated/settings.tsx`**: surface the same rule as helper text under the sender-email field ("Must be on your own domain, e.g. …@bbb.co.uk") and show the server error inline.
- **Optional hardening**: same check in the cron dispatcher before sending, so an already-saved-but-now-invalid `sender_email` can't sneak through if we ever loosen things later.

### Edge cases

- Dealer signs up with `@gmail.com` → we tell them they need to sign in with a business email before connecting a sender domain, or contact support for a manual override.
- Dealer legitimately owns multiple brands on different domains → out of scope for this change; they'd need a manual override / admin flag.
- Subdomains like `notify.bbb.co.uk` are allowed because they're under the same registered domain.

## Not in scope

- Full public-suffix-list parsing (e.g. distinguishing `bbb.co.uk` from `co.uk`). A simple "same domain or ends with `.<domain>`" check plus the free-mail blocklist covers ~all real cases and is much simpler. If needed later we can add `psl` as a dependency.
- Multi-tenant Resend accounts (one Resend account per dealer). That's a bigger architectural change; this domain check is the lightweight safeguard for the current shared setup.
