---
trigger: always_on
---

# Rule: Security & Compliance — Duesly

> Placement: `.agent/rules/`
> Non-negotiable. Payment software handling real money for residents paying a new platform — get this right.

## Input validation
- Validate and sanitize **all** inputs **server-side** with Zod — never trust the client.
- Reject malformed data before it reaches the DB: a collection needs a title and a positive integer amount (kobo); a unit selection must resolve to a real unit in a real zone.
- Validate **CSV imports** on the server: skip or flag rows with a blank zone/unit code; a unit code is unique within its zone.
- Enforce types and ranges: amount is a positive integer (kobo); email (where collected) is a valid email.

## Authentication & sessions
- Hash passwords with **bcrypt or argon2**. Never store or log plaintext passwords.
- Sessions via **HTTP-only, Secure, SameSite** cookies. No tokens in localStorage.
- Only the admin (treasurer) authenticates; residents never log in.
- Protect all `/dashboard/*` routes; an admin can only read/mutate data for their own estate (enforce estate-ownership checks on every query against zones, units, collections, and payments).
- Rate-limit auth endpoints (login, signup) to slow brute force.

## SQL injection prevention
- All database access goes through **Prisma**.
- Raw SQL is only permitted inside migration files using Prisma's QueryRaw method.

## Cross-site scripting (XSS) prevention
- Do not use dangerous DOM manipulation methods (e.g. raw `dangerouslySetInnerHTML`) unless the content has been properly sanitized.

## Cross-site request forgery (CSRF) protection
- SameSite cookies (above) are the baseline. State-changing admin requests must be protected against forgery.

## Payments (Paystack)
- **Never trust a client-side success callback.** Confirm every payment server-side via the Paystack verify endpoint (`GET /transaction/verify/{reference}`) **and** the webhook before marking a unit `paid`. (See `skills/payment-gateway/SKILL.md`.)
- **Verify the webhook signature** on every incoming webhook: compute HMAC-SHA512 of the **raw request body** using `PAYSTACK_SECRET_KEY` and compare it (timing-safe) to the `x-paystack-signature` header. Reject mismatches with `401` before parsing the body.
- On verify, confirm **all** of: `data.status` is `success`, the `reference` matches the payment, amount paid ≥ the collection amount, currency is `NGN`. A mismatch is a failed/suspicious payment — do not mark paid.
- **Never store raw card data.** All card handling stays inside Paystack's hosted checkout. Duesly only stores references and status.
- Rate-limit the payment-initiation endpoint.

## Duplicate / replay protection
- `Payment.flwTxRef` (and `flwTxId`) are unique at the DB level.
- Webhook handlers are **idempotent**: re-delivered events for an already-`paid` unit/collection are a safe no-op.
- A unit is never marked paid twice for the same collection; block and notify on duplicate-transaction attempts (e.g. landlord and tenant both paying one unit), never double-record.

## Secrets & configuration
- All secrets in environment variables: `PAYMENT_GATEWAY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `APP_URL`, `DATABASE_URL`, session secret, `SMTP_*` / email keys.
- Payment gateway specifics below describe the **active adapter (Paystack)**; the gateway is pluggable via `PAYMENT_GATEWAY` and each adapter owns its own signature scheme.
- **Never** commit secrets or hardcode keys. Keep a `.env.example` with names only.
- Validate required env vars at boot; fail fast if missing.
- Use **test keys** in development, live keys only in production.

## Transport & data
- HTTPS everywhere; the webhook endpoint must be HTTPS.
- Encrypt sensitive data at rest where applicable.
- Don't log secrets, full payment payloads, or PII. Log references and status only.

## Dependency management
- Only install packages with at least a thousand weekly downloads and recent maintenance updates. Don't let the agent pull in unmaintained or obscure dependencies.

## Error surfaces
- Return generic error messages to admins/residents; keep detailed errors in server logs.
- No stack traces, DB errors, or gateway payloads exposed to the client.

## Compliance
- Align with Nigerian payment regulations and Paystack's requirements.
- Collect only the data the product needs (minimal PII). Resident names, phone numbers, and optional emails are personal data — handle them in line with Nigeria's Data Protection Act (NDPA), don't expose them publicly, and keep them to what reminders and reconciliation require.