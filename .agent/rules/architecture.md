---
trigger: always_on
---

# Rule: Architecture — Duesly

> Placement: `.agent/rules/`
> Always-on constraints for how Duesly is structured and how data flows. Follow on every change.

## Technology stack
- Next.js (App Router) — v16 with `proxy.ts` (replaces deprecated middleware)
- Prisma v7 with `@prisma/adapter-pg` (ORM + PostgreSQL adapter)
- PostgreSQL
- Paystack (payments)
- Nodemailer (dev) / Resend (prod) for email
- Vercel (deployment)

## Authentication
- Admin-only authentication (treasurer); residents never authenticate.
- Sessions via **`jose` JWTs** stored in HTTP-only, Secure, SameSite cookies.
- Passwords hashed with **bcrypt** (12 salt rounds).
- Session logic in `lib/auth.ts` — `createSession`, `getSession`, `requireAuth`, `destroySession`.
- The proxy (`src/proxy.ts`) validates the session cookie on every guarded request.
- See `security.md` for rate-limiting and ownership enforcement.

## Rendering strategy
- **Public pages** (`/` landing page, `/pay/[slug]`) are **server-rendered**, light, and fast — minimal client JS. The landing page has only the mobile menu toggle and FAQ accordion as client interactivity.
- **Public payment page (`/pay/[slug]`)** is the highest-priority surface. This is the cascading self-identify flow (select zone → unit → confirm → pay). Must work on a 375px viewport with no heavy third-party scripts.
- **Dashboard** (`/dashboard/*`) is authenticated and can use client components where needed; use client-side routing between dashboard views (no full page reloads).
- Prefer **React Server Components** and **server actions**. Only use client components for interactivity (forms, Pay flow, CSV upload, collection actions).

## Folder structure
```
/app
  /                     # Landing page (public) — see landing page brief
  /(auth)
    /login              # Login form
    /signup             # Signup form (creates estate + admin user)
  /dashboard
    /                   # Overview (stats + recent collections)
    /setup              # Estate setup (add zones)
    /roster             # Units list + CSV import / management + inline edit
    /collections        # List + create collections
    /collections/[id]   # Collection detail: paid vs owing with per-zone tables
  /pay
    /[slug]             # PUBLIC payment page (SSR) — cascading self-identify
    /[slug]/receipt     # Payment receipt page (public)
  /api
    /auth/login         # POST: authenticate admin
    /auth/signup        # POST: create admin + estate
    /auth/logout        # POST: destroy session
    /pay/init           # POST: initiate Paystack checkout
    /dashboard
      /zones            # GET/POST: list / create zones
      /units            # GET/POST: list / upsert units
      /units/[id]       # PATCH: edit unit details
      /collections      # GET/POST: list / create collections
      /collections/[id]/defaulters  # GET: export owing units CSV
      /csv-preview      # POST: parse + validate CSV before import
      /csv-import       # POST: commit CSV upsert
      /send-reminders   # POST: send email reminders to owing units
    /webhooks/payment   # POST: Paystack webhook (signature-verified)
/lib
  db.ts                 # Prisma client singleton with @prisma/adapter-pg
  auth.ts               # jose JWT session helpers (create, get, destroy, require)
  rate-limiter.ts       # In-memory rate limiter for auth + pay endpoints
  money.ts              # kobo <-> naira conversion + formatNaira
  csv.ts                # PapaParse roster import (auto-detect delimiter)
  email.ts              # Nodemailer transporter + HTML template builders
  whatsapp.ts           # WhatsApp deep link + reminder message builder
  env.ts                # Runtime env var validation with Zod
  payments/
    gateway.ts          # PaymentGateway interface (pluggable)
    paystack.ts         # Paystack adapter (init, verify, webhook HMAC)
    index.ts            # Factory: selects adapter via PAYMENT_GATEWAY env var
  validation/
    auth.ts             # Zod schemas for login/signup
    units.ts            # Zod schemas for zones/units
    collection.ts       # Zod schemas for collections + offline payments
/components
  shared.module.css     # Shared CSS Module (buttons, cards, tables, forms, badges)
/prisma
  schema.prisma         # Data model (User, Estate, Zone, Unit, Collection, Payment, PaymentLog)
  migrations/            # Auto-generated migration files
prisma.config.ts         # Prisma 7 config (schema path + datasource URL)
/proxy.ts                # Replaces middleware.ts — route guard (auth check + redirect)
/tokens                  # Design tokens (source JSON + generated tokens.css)
```

## Data models
- The database schema is defined in `prisma/schema.prisma` (single source of truth). See the file for the full model definitions: User, Estate, Zone, Unit, Collection, Payment, PaymentLog.
- Use UUID ids, UTC timestamps, `camelCase` fields mapped to `snake_case` columns in the schema.
- The **Unit** model has a unique constraint on `(zoneId, label)` — this is what makes re-imports safe (upsert, never duplicate).
- The **Payment** model has a unique constraint on `(collectionId, unitId)` — blocks double-recording the same unit for a collection.

## Database access & data fetching
- Server components fetch directly via **Prisma** with the `@prisma/adapter-pg` adapter. No client-side data layer for SSR pages.
- For dashboard interactivity, use **server actions** for mutations; keep client state minimal.
- The owing list is **computed live** (units minus successful payments), never stored.

## Payment / collection critical path
- The end-to-end payment flow:
  1. Resident selects unit on `/pay/[slug]` → `POST /api/pay/init` creates a pending Payment + Paystack checkout URL
  2. Resident completes payment on Paystack → redirected back to `/pay/[slug]/receipt`
  3. Paystack sends `POST /api/webhooks/payment` with `charge.success` or `charge.failed` event
  4. Webhook handler **verifies HMAC-SHA512 signature**, marks Payment as `success`/`failed`, creates PaymentLog entry
  5. Sends receipt email to resident and alert email to treasurer (non-blocking)
- **Confirmation is always server-side** — the webhook signature verification is the proof. The `verifyPayment()` function in the Paystack adapter exists for manual verification but is not called from the webhook handler (the webhook data is trusted after signature verification).
- **Failed payments** — the webhook also handles `charge.failed` events: marks the Payment as `failed`, logs the event, and sends a failed-payment notification email to the resident (if email is on file). The unit remains owing.
- Email sending is **non-blocking** — `Promise.all().catch()` pattern, never `await` on send.

## Idempotency & duplicates
- Unique constraints at the DB level: `collectionId + unitId` (one payment per unit per collection), `gatewayTxRef` (one processing per transaction reference).
- Webhook handlers are idempotent: if a Payment already has `status: "success"`, re-processing is a no-op.
- See `security.md` for detailed enforcement rules.

## Error handling
- Result-shape and user-facing error conventions are in **code-style.md** (typed `{ ok }` results; generic messages to users, detail in server logs).

## Performance rules
- No heavy third-party scripts on `/pay/[slug]` or the landing page.
- Index `Collection.slug`, zone/unit lookup columns, and any columns used in the dashboard's owing queries.
- Keep the public payment page payload small for low-end phones and weak data.
- Below-the-fold visuals on the landing page should be lazy-loaded.

## Forbidden actions
- No GraphQL.
- No separate Node/Express backend.
- No microservices.
- No Auth.js, Iron Session, or similar auth frameworks — use `jose` + bcrypt (see `lib/auth.ts`).
- No database access outside Prisma (no raw SQL except in migrations via QueryRaw).
- No fabricated testimonials, logos, or stats on the landing page.
