# Skill: Payment Gateway (Gateway-Agnostic — Paystack active)

> Use this skill for any work touching Duesly payments: initiating payment, redirecting to the gateway, verifying a transaction, handling callbacks, handling webhooks, marking units paid, writing `PaymentLog`, sending receipts, or preventing duplicate payment.

Duesly's payment layer is **gateway-agnostic**. All gateway-specific code lives behind a single `PaymentGateway` interface and is selected at runtime by the `PAYMENT_GATEWAY` environment variable. **Paystack is the active adapter.** A **Flutterwave** adapter skeleton is included so switching gateways is a small, isolated change.

**To switch gateways you only:** (1) implement the `PaymentGateway` interface for the new gateway, (2) register it in the factory, (3) set `PAYMENT_GATEWAY` and the new gateway's env vars. No changes to services, routes, schema, or UI.

---

## Authoritative references

- **Full spec + invariants:** `docs/specs/payment/Duesly_Payment_Flow_Spec.md` — the single source of truth for flow design and money-correctness rules. Read this when building payment features.
- **Enforced rule:** `.agent/rules/payment-safety.md` — the always-loaded enforcement copy of §0 (mental model) and §1 (invariants). This rule is non-negotiable and outranks UI convenience.
- If the spec's invariants change, the rule must be updated to match. This skill references both; it does not duplicate the invariants.

---

## When to use

Use this skill when building or editing: the public payment flow on `/pay/[slug]`, payment initiation, the callback page, the webhook handler, payment verification, retry logic, `Payment` updates, `PaymentLog` writes, receipt/alert triggers, duplicate-payment prevention, or payment status UI.

---

## Before you build

Load: `AGENTS.md`, `.agent/rules/payment-safety.md`, `.agent/rules/security.md`, `.agent/rules/architecture.md`, `.agent/rules/code-style.md`, `.agent/skills/api-route-scaffolder/SKILL.md`, and `.agent/skills/db-migration-runner/SKILL.md` if any schema field is missing. Also load `docs/specs/payment/Duesly_Payment_Flow_Spec.md` for full flow context.

Confirm: online or offline payment? which collection/unit? is the collection active? is the unit active and billable? has this unit already paid? does the amount come from the database? is it idempotent? does it write a `PaymentLog`? could webhook and callback both run?

---

## Critical Duesly payment rules

* The `Unit` is the billable entity; a unit can pay a collection only once.
* Amount must come from `Collection.amountKobo`; the resident never enters or edits it.
* Inside Duesly, **money is always kobo**. Each adapter converts to/from its gateway's unit internally.
* Never mark a unit paid from redirect/callback data alone — always verify server-side.
* Webhook and callback share **one** verification path and must both be safe to run.
* Duplicate webhooks must not duplicate payments, receipts, emails, or dashboard events.
* `PaymentLog` records every important payment event.

---

## Schema ownership (do not redefine here)

The `Payment`, `PaymentLog` models and all payment enums are defined once in **`.agent/skills/db-migration-runner/SKILL.md`** and summarized in **AGENTS.md**. This skill must match them exactly and never restate or alter them. If a field is missing, stop and use the db-migration skill.

Fields this skill relies on:

* `Payment`: `amountKobo`, `method` (`PaymentMethod`), `status` (`PaymentStatus`), `gatewayTxRef` (`@unique`), `gatewayTxId`, `paidAt`, `@@unique([collectionId, unitId])`
* `PaymentLog`: `paymentId?`, `collectionId`, `unitId`, `amountKobo?`, `method?`, `status?`, `gatewayTxRef?`, `gatewayTxId?`, `eventType` (`PaymentEventType`), `rawEvent?`

**`PaymentEventType` is a Prisma enum.** The only valid values — use these exact strings and no others:

```txt
initiated
verified
webhook_received
webhook_verified
offline_recorded
failed
duplicate_ignored
```

**`PaymentStatus`**: `pending | success | failed`. **`PaymentMethod`**: `online | offline | cash | bank_transfer | pos | other`.

---

## The gateway abstraction

### `lib/payments/types.ts`

```ts
export type GatewayName = "paystack" | "flutterwave";

export interface InitializeInput {
  reference: string;                 // our gatewayTxRef (we own it)
  amountKobo: number;                // always kobo; the adapter converts if its gateway needs major units
  email: string;                     // some gateways require it
  currency: "NGN";
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export interface InitializeResult {
  redirectUrl: string;
}

// Normalized across every gateway, so services never see gateway-specific shapes.
export interface NormalizedTransaction {
  status: "success" | "failed" | "pending";
  reference: string;
  amountKobo: number;                // normalized back to kobo
  currency: string;
  gatewayTxId: string | null;
  paidAt: Date | null;
  raw: unknown;
}

export interface WebhookParseResult {
  isSuccessEvent: boolean;
  reference: string | null;
}

export interface PaymentGateway {
  name: GatewayName;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  verify(reference: string): Promise<NormalizedTransaction>;
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  parseWebhook(rawBody: string): WebhookParseResult;
}
```

### `lib/payments/index.ts` (factory — the only switch point)

```ts
import type { PaymentGateway, GatewayName } from "./types";
import { PaystackGateway } from "./paystack";
// import { FlutterwaveGateway } from "./flutterwave"; // uncomment to enable

export function getGateway(): PaymentGateway {
  const name = (process.env.PAYMENT_GATEWAY || "paystack") as GatewayName;
  switch (name) {
    case "paystack":
      return new PaystackGateway();
    // case "flutterwave":
    //   return new FlutterwaveGateway();
    default:
      throw new Error(`Unsupported PAYMENT_GATEWAY: ${name}`);
  }
}
```

Services and routes import **only** `getGateway()` and the types — never a specific gateway.

---

## Active adapter: `lib/payments/paystack.ts`

Paystack transacts in **kobo natively**, so no amount conversion. Auth is a secret-key bearer token; webhooks are HMAC-SHA512 over the raw body using the secret key.

```ts
import crypto from "node:crypto";
import type {
  PaymentGateway, InitializeInput, InitializeResult,
  NormalizedTransaction, WebhookParseResult,
} from "./types";

const BASE_URL = "https://api.paystack.co";

function secret() {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("Missing PAYSTACK_SECRET_KEY");
  return k;
}

async function psFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Paystack request failed: ${res.status}`);
  return json as T;
}

function mapStatus(s: string): NormalizedTransaction["status"] {
  if (s === "success") return "success";
  if (["failed", "abandoned", "reversed"].includes(s)) return "failed";
  return "pending";
}

export class PaystackGateway implements PaymentGateway {
  name = "paystack" as const;

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    const json = await psFetch<{ status: boolean; data?: { authorization_url: string } }>(
      "/transaction/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          amount: input.amountKobo,            // kobo native — no conversion
          currency: input.currency,
          reference: input.reference,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
        }),
      },
    );
    const url = json.data?.authorization_url;
    if (!json.status || !url) throw new Error("Paystack initialize failed");
    return { redirectUrl: url };
  }

  async verify(reference: string): Promise<NormalizedTransaction> {
    const json = await psFetch<{
      status: boolean;
      data?: { id: number; status: string; reference: string; amount: number; currency: string; paid_at?: string };
    }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });

    const tx = json.data;
    if (!json.status || !tx) throw new Error("Paystack verify failed");

    return {
      status: mapStatus(tx.status),
      reference: tx.reference,
      amountKobo: tx.amount,                   // already kobo
      currency: tx.currency,
      gatewayTxId: String(tx.id),
      paidAt: tx.paid_at ? new Date(tx.paid_at) : null,
      raw: tx,
    };
  }

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const sig = headers.get("x-paystack-signature");
    if (!sig) return false;
    const expected = crypto.createHmac("sha512", secret()).update(rawBody).digest("hex");
    const a = Buffer.from(sig), b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: string): WebhookParseResult {
    try {
      const event = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } };
      return { isSuccessEvent: event.event === "charge.success", reference: event.data?.reference ?? null };
    } catch {
      return { isSuccessEvent: false, reference: null };
    }
  }
}
```

---

## Future adapter skeleton: `lib/payments/flutterwave.ts`

Fill this in (and uncomment it in the factory) to switch back to Flutterwave. It captures the differences from Paystack so the rest of the app never changes. **Verify v4 specifics against current Flutterwave docs before relying on them.**

```ts
import crypto from "node:crypto";
import type {
  PaymentGateway, InitializeInput, InitializeResult,
  NormalizedTransaction, WebhookParseResult,
} from "./types";

// Flutterwave v4 notes baked in as TODOs:
// - Auth: OAuth 2.0 client credentials (FLW_CLIENT_ID / FLW_CLIENT_SECRET) -> short-lived bearer token (cache it).
// - Base URL: sandbox https://developersandbox-api.flutterwave.com ; production https://f4bexperience.flutterwave.com
// - Initialize: orchestrator direct-charge; send amount in MAJOR units -> input.amountKobo / 100.
// - Verify: GET /charges/{id}; success status is "succeeded"; amount returned in MAJOR units -> * 100 to get kobo.
// - Webhook: header "flutterwave-signature" = HMAC-SHA256(rawBody, FLW_SECRET_HASH); success event reference is `reference`.

export class FlutterwaveGateway implements PaymentGateway {
  name = "flutterwave" as const;

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    // TODO: get OAuth token; POST orchestrator direct-charge with amount = input.amountKobo / 100; return redirect URL.
    throw new Error("FlutterwaveGateway.initialize not implemented");
  }

  async verify(reference: string): Promise<NormalizedTransaction> {
    // TODO: GET /charges/{id}; normalize:
    //   status: data.status === "succeeded" ? "success" : ...,
    //   amountKobo: Math.round(data.amount * 100),
    throw new Error("FlutterwaveGateway.verify not implemented");
  }

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const sig = headers.get("flutterwave-signature");
    const secret = process.env.FLW_SECRET_HASH;
    if (!sig || !secret) return false;
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(sig), b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: string): WebhookParseResult {
    // TODO: parse event; map success event; extract `reference`.
    throw new Error("FlutterwaveGateway.parseWebhook not implemented");
  }
}
```

---

## Payment initiation service: `lib/services/payments.ts`

```ts
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { getGateway } from "@/lib/payments";

export function createDueslyPaymentReference() {
  return `dues_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export async function initiateCollectionPayment(input: {
  collectionSlug: string; zoneId: string; unitId: string; payerEmail?: string | null;
}) {
  const collection = await prisma.collection.findUnique({
    where: { slug: input.collectionSlug }, include: { estate: true },
  });
  if (!collection || collection.status !== "active")
    return { ok: false, error: "This collection is not available for payment.", code: "COLLECTION_NOT_AVAILABLE" };

  const unit = await prisma.unit.findFirst({
    where: { id: input.unitId, zoneId: input.zoneId, status: "active", zone: { estateId: collection.estateId } },
  });
  if (!unit) return { ok: false, error: "Selected unit could not be found.", code: "UNIT_NOT_FOUND" };

  const existing = await prisma.payment.findUnique({
    where: { collectionId_unitId: { collectionId: collection.id, unitId: unit.id } },
  });
  if (existing?.status === "success")
    return { ok: false, error: "This unit has already paid for this collection.", code: "UNIT_ALREADY_PAID" };

  const reference = createDueslyPaymentReference();

  const payment = await prisma.payment.upsert({
    where: { collectionId_unitId: { collectionId: collection.id, unitId: unit.id } },
    create: { collectionId: collection.id, unitId: unit.id, amountKobo: collection.amountKobo,
              method: "online", status: "pending", gatewayTxRef: reference },
    update: { amountKobo: collection.amountKobo, method: "online", status: "pending",
              gatewayTxRef: reference, gatewayTxId: null, paidAt: null },
  });

  await prisma.paymentLog.create({
    data: { paymentId: payment.id, collectionId: collection.id, unitId: unit.id,
            amountKobo: collection.amountKobo, gatewayTxRef: reference, eventType: "initiated" },
  });

  try {
    const { redirectUrl } = await getGateway().initialize({
      reference, amountKobo: collection.amountKobo, currency: "NGN",
      email: input.payerEmail || "guest@duesly.app",
      callbackUrl: `${process.env.APP_URL}/pay/${collection.slug}/confirm`,
      metadata: { paymentId: payment.id, collectionId: collection.id, unitId: unit.id, estateId: collection.estateId },
    });
    return { ok: true, data: { redirectUrl } };
  } catch {
    await prisma.paymentLog.create({
      data: { paymentId: payment.id, collectionId: collection.id, unitId: unit.id,
              amountKobo: collection.amountKobo, gatewayTxRef: reference, eventType: "failed" },
    });
    return { ok: false, error: "Could not start payment. Please try again.", code: "PAYMENT_START_FAILED" };
  }
}
```

---

## Shared verification service: `lib/services/payment-verification.ts`

One function for webhook and callback; entirely gateway-agnostic.

```ts
import { prisma } from "@/lib/db";
import { getGateway } from "@/lib/payments";

export async function verifyAndFulfillPaymentByReference(reference: string) {
  const tx = await getGateway().verify(reference); // NormalizedTransaction (kobo)

  const payment = await prisma.payment.findFirst({
    where: { gatewayTxRef: tx.reference },
    include: { collection: true, unit: { include: { zone: true } } },
  });
  if (!payment) return { ok: false, error: "Payment record not found.", code: "PAYMENT_NOT_FOUND" };

  const isValid =
    tx.status === "success" &&
    tx.reference === payment.gatewayTxRef &&
    tx.currency === "NGN" &&
    tx.amountKobo >= payment.amountKobo &&
    payment.unit.zone.estateId === payment.collection.estateId;

  if (!isValid) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", gatewayTxId: tx.gatewayTxId } });
    await prisma.paymentLog.create({
      data: { paymentId: payment.id, collectionId: payment.collectionId, unitId: payment.unitId,
              amountKobo: tx.amountKobo, gatewayTxRef: tx.reference, gatewayTxId: tx.gatewayTxId, eventType: "failed" },
    });
    return { ok: false, error: "Payment verification failed.", code: "PAYMENT_VERIFICATION_FAILED" };
  }

  if (payment.status === "success") {
    await prisma.paymentLog.create({
      data: { paymentId: payment.id, collectionId: payment.collectionId, unitId: payment.unitId,
              amountKobo: tx.amountKobo, gatewayTxRef: tx.reference, gatewayTxId: tx.gatewayTxId, eventType: "duplicate_ignored" },
    });
    return { ok: true, data: { alreadyProcessed: true, paymentId: payment.id } };
  }

  const fulfilled = await prisma.$transaction(async (db) => {
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: { status: "success", method: "online", gatewayTxId: tx.gatewayTxId, paidAt: tx.paidAt ?? new Date() },
    });
    await db.paymentLog.create({
      data: { paymentId: payment.id, collectionId: payment.collectionId, unitId: payment.unitId,
              amountKobo: tx.amountKobo, gatewayTxRef: tx.reference, gatewayTxId: tx.gatewayTxId, eventType: "verified" },
    });
    return updated;
  });

  void sendPostPaymentNotifications(fulfilled.id); // non-blocking; send once

  return { ok: true, data: { alreadyProcessed: false, paymentId: fulfilled.id } };
}

async function sendPostPaymentNotifications(paymentId: string) {
  // resident receipt (if email) + treasurer alert; must not block; must not duplicate.
}
```

---

## Webhook route: `app/api/webhooks/payment/route.ts`

One gateway-agnostic endpoint. The webhook URL configured in the gateway dashboard points here; switching gateways means updating that dashboard URL, not this code.

```ts
import { NextRequest, NextResponse } from "next/server";
import { getGateway } from "@/lib/payments";
import { verifyAndFulfillPaymentByReference } from "@/lib/services/payment-verification";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const gateway = getGateway();

  if (!gateway.verifyWebhookSignature(rawBody, req.headers)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const { isSuccessEvent, reference } = gateway.parseWebhook(rawBody);
  if (!isSuccessEvent || !reference) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  try {
    await verifyAndFulfillPaymentByReference(reference);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[payment.webhook] failed", { error });
    return NextResponse.json({ ok: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
```

---

## Callback page: `/pay/[slug]/confirm`

The callback is a hint, not proof. Read the reference from the query (`reference`/`trxref` for Paystack; gateways differ), then call the same `verifyAndFulfillPaymentByReference`. Show "verifying…", "confirmed", or "we couldn't verify yet — if you were debited, wait a few minutes."

---

## Environment

```env
PAYMENT_GATEWAY=paystack

# Paystack (active)
PAYSTACK_SECRET_KEY=sk_test_xxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxx

# Flutterwave (only if PAYMENT_GATEWAY=flutterwave)
# FLW_CLIENT_ID=xxxx
# FLW_CLIENT_SECRET=xxxx
# FLW_SECRET_HASH=xxxx
# FLW_BASE_URL=https://developersandbox-api.flutterwave.com

APP_URL=http://localhost:3000
```

Secret keys are server-side only. Validate the active gateway's required vars at boot; fail fast if missing.

---

## How to switch gateways (the payoff)

1. Implement the `PaymentGateway` interface for the new gateway in `lib/payments/<gateway>.ts` (a skeleton for Flutterwave is provided). Do the amount conversion **inside** the adapter so the rest of the app stays in kobo.
2. Register it in the `getGateway()` factory.
3. Set `PAYMENT_GATEWAY=<gateway>` and the new gateway's env vars.
4. Point the gateway dashboard's webhook URL at `/api/webhooks/payment` and set the signing secret.
5. Re-test the flow with the new gateway's test credentials.

No changes to services, the webhook route, the schema, `PaymentLog`, the dashboard, or the payment UI.

---

## Do / Don't / Checklist

**Do:** keep money in kobo across the app; convert only inside adapters; verify server-side via the gateway interface; verify webhook signatures over the raw body before parsing; write `PaymentLog` with valid `PaymentEventType` enum values; fulfill idempotently inside a transaction; share one verification path for webhook + callback; send emails only after DB success, non-blocking.

**Don't:** import a specific gateway anywhere except its adapter and the factory; trust callback params as proof; mark paid before verification; restate or alter the schema/enums; send duplicate receipts; allow a unit to pay one collection twice; implement production splits without official docs + a schema update.

**Checklist before done:**
* [ ] No service/route imports a gateway directly — only `getGateway()` + types.
* [ ] Active gateway's env vars validated at boot.
* [ ] Amount sent and compared in kobo; adapter handles any conversion.
* [ ] Unique `gatewayTxRef` generated and stored; transaction id stored as `gatewayTxId`.
* [ ] Webhook verifies signature over raw body, then parses.
* [ ] Webhook + callback call the same verification service.
* [ ] Verification checks status, amount, currency, reference, and unit↔collection estate match.
* [ ] Success updates `Payment` in a transaction; `PaymentLog` written with a valid enum value.
* [ ] Duplicate callback/webhook is a no-op.
* [ ] Receipt + treasurer alert sent only after DB success, non-blocking, once.
* [ ] `npm run lint` and `npm run build` pass.
