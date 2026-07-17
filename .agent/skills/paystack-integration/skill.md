# Skill: Paystack Integration

> Use this skill for any work touching Duesly payments: initiating payment, redirecting to Paystack, verifying a transaction, handling callbacks, handling webhooks, marking units paid, writing `PaymentLog`, sending receipts, or preventing duplicate payment.

Duesly uses **Paystack** for the online payment flow.

This skill assumes the standard Paystack server-side pattern:

* secret-key bearer authentication
* `POST /transaction/initialize` → redirect to `authorization_url`
* `GET /transaction/verify/{reference}` server-side verification
* raw-body webhook signature verification (`x-paystack-signature`, HMAC-SHA512)
* idempotent fulfillment

Paystack transacts in **kobo natively**, so Duesly's `amountKobo` is sent as-is with no conversion.

---

## When to use

Use this skill when building or editing:

* Public resident payment flow on `/pay/[slug]`
* Payment initiation route or server action
* Paystack callback page
* Webhook handler
* Payment verification logic
* Payment retry logic
* `Payment` model updates
* `PaymentLog` writes
* Receipt email trigger
* Treasurer payment alert trigger
* Duplicate payment prevention
* Payment status UI

---

## Before you build

Load these first:

1. `AGENTS.md`
2. `.agent/rules/security.md`
3. `.agent/rules/architecture.md`
4. `.agent/rules/code-style.md`
5. `.agent/skills/api-route-scaffolder/SKILL.md`
6. `.agent/skills/db-migration-runner/SKILL.md` if schema fields are missing or need to change

Before coding, confirm:

* Is this online payment or offline payment?
* Which `Collection` is being paid?
* Which `Unit` is paying?
* Is the collection active?
* Is the unit active and billable?
* Has this unit already paid for this collection?
* Is the amount coming from the database?
* Is this code idempotent?
* Does it write a `PaymentLog`?
* Could webhook and callback both run?

---

## Critical Duesly payment rules

* The `Unit` is the billable entity.
* A `Collection` belongs to an `Estate`.
* A `Unit` belongs to a `Zone`. A `Zone` belongs to an `Estate`.
* A unit can pay a collection only once.
* Amount must come from `Collection.amountKobo`.
* The resident must never enter or edit the amount.
* Paystack receives the amount in **kobo** (no conversion).
* Never mark a unit paid from redirect/callback data alone.
* Always verify server-side before marking payment successful.
* Webhook and callback must both be safe to run.
* Duplicate webhooks must not duplicate payments, receipts, emails, or dashboard events.
* Payment success comes from verified Paystack data or authenticated offline recording.
* `PaymentLog` must record every important payment event.

---

## Base URL & environment

Paystack uses **one base URL** for both test and live. The key prefix selects the mode (`sk_test_…` vs `sk_live_…`). There is no separate sandbox host.

```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxx
APP_URL=http://localhost:3000
```

Production:

```env
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxx
APP_URL=https://duesly.app
```

Base URL:

```txt
https://api.paystack.co
```

The **secret key is server-side only**. It is used both as the API bearer token and as the HMAC key for webhook verification. Never expose it to the client.

---

## Required headers

Every Paystack API request must include:

```txt
Authorization: Bearer {PAYSTACK_SECRET_KEY}
Content-Type: application/json
```

---

## Money handling

Duesly stores money as integer **kobo**. Paystack also expects **kobo** for NGN. No conversion is needed.

Correct:

```ts
amount: payment.amountKobo
```

Wrong:

```ts
amount: payment.amountKobo / 100
```

On verification, Paystack returns `data.amount` in kobo. Compare directly.

```ts
const amountOk = verified.data.amount >= payment.amountKobo;
```

Never use floats for money.

---

## Payment statuses

Paystack's successful transaction status on the verify response is:

```ts
data.status === "success"
```

The success webhook event is:

```ts
event === "charge.success"
```

Duesly internal payment statuses are:

```ts
"pending" | "success" | "failed"
```

Mapping:

```ts
function mapPaystackStatus(status: string) {
  if (status === "success") return "success";
  if (status === "failed" || status === "abandoned" || status === "reversed") return "failed";
  return "pending";
}
```

---

## Required Duesly fields

The payment schema must support these fields (defined in `AGENTS.md` / db-migration skill — do not redefine the schema here):

* `gatewayTxRef` (unique) — the Paystack `reference`
* `gatewayTxId` — the Paystack transaction `id` from verify
* `status`, `method`, `amountKobo`, `paidAt`
* `@@unique([collectionId, unitId])`
* `PaymentLog` must exist and be used.

If these fields are missing, stop and use `.agent/skills/db-migration-runner/SKILL.md` first.

---

## Duesly online payment flow

### Step 1 — Resident selects unit

On `/pay/[slug]`, resident selects:

```txt
Zone → Unit → Confirm resident name → Pay
```

Before initiating payment, validate server-side:

* Collection exists and is active.
* Unit exists and is active.
* Unit belongs to the selected zone.
* Zone belongs to the collection's estate.
* Unit has not already paid for this collection.
* Amount comes from `Collection.amountKobo`.

---

### Step 2 — Create or update pending payment

Create a pending `Payment` row before calling Paystack.

* If no payment exists for `collectionId + unitId`, create one.
* If a payment exists and status is `success`, block payment.
* If a payment exists and status is `pending` or `failed`, allow retry by generating a fresh reference and updating the same row.
* Always write a `PaymentLog`.

Generate a unique reference.

```ts
export function createDueslyPaymentReference() {
  return `dues_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}
```

Reference rules:

* Must be unique.
* Must not include private resident data (no phone, email, or resident name).

---

### Step 3 — Initialize the Paystack transaction

Call:

```txt
POST https://api.paystack.co/transaction/initialize
```

Payload:

```ts
{
  email: payerEmail || "guest@duesly.app", // Paystack requires an email
  amount: payment.amountKobo,              // kobo, no conversion
  currency: "NGN",
  reference: payment.gatewayTxRef,
  callback_url: `${process.env.APP_URL}/pay/${collection.slug}/confirm`,
  metadata: {
    paymentId: payment.id,
    collectionId: collection.id,
    unitId: unit.id,
    estateId: estate.id,
  },
}
```

Rules:

* Use `collection.amountKobo`. Never accept amount from the client.
* Keep `metadata` minimal — no phone numbers or unnecessary personal data.
* Persist the returned `reference` (you already control it) and store the transaction `id` as `gatewayTxId` after verification.
* Do not mark the unit paid at this stage.

The response contains:

```ts
{
  status: true,
  data: {
    authorization_url: "https://checkout.paystack.com/...",
    access_code: "...",
    reference: "dues_..."
  }
}
```

---

### Step 4 — Redirect resident

Redirect the resident to `data.authorization_url`.

Do not mark the unit paid. Wait for webhook or callback verification.

---

### Step 5 — Verify payment

Verification must happen server-side. It can be triggered by:

* the Paystack webhook (`charge.success`)
* the callback page
* a manual retry/check-status action

All paths must call the **same** verification service.

Call:

```txt
GET https://api.paystack.co/transaction/verify/{reference}
```

Verification requirements:

```ts
const tx = verified.data;
const isValid =
  verified.status === true &&
  tx?.status === "success" &&
  tx?.reference === payment.gatewayTxRef &&
  tx?.currency === "NGN" &&
  tx?.amount >= payment.amountKobo;
```

Also verify:

* Payment exists.
* Collection and unit exist.
* Unit belongs to the same estate as the collection.
* Payment has not already been marked successful.

---

### Step 6 — Fulfill idempotently

On verified success:

* If payment is already `success`, stop (log `duplicate_ignored`).
* Otherwise, inside a database transaction:

  * set `Payment.status = "success"`
  * set `Payment.method = "online"`
  * set `Payment.gatewayTxId` to `tx.id`
  * set `Payment.paidAt`
  * create `PaymentLog` with `eventType = "verified"`
* After the transaction:

  * send the resident receipt if an email exists
  * send the treasurer alert
  * do not block the response on email

Do not send a receipt before the DB transaction succeeds. Do not send duplicate email if callback and webhook both run.

---

## Required helper: `lib/paystack.ts`

```ts
// lib/paystack.ts

const BASE_URL = "https://api.paystack.co";

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("Missing PAYSTACK_SECRET_KEY");
  }
  return key;
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`Paystack request failed: ${res.status}`);
  }

  return json as T;
}

interface InitializeInput {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export async function initializePaystackTransaction(input: InitializeInput) {
  return paystackFetch<{
    status: boolean;
    message: string;
    data?: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackFetch<{
    status: boolean;
    message: string;
    data?: {
      id: number;
      status: string;
      reference: string;
      amount: number; // kobo
      currency: string;
      paid_at?: string;
      metadata?: Record<string, unknown>;
    };
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });
}
```

---

## Payment initiation service

```ts
// lib/services/payments.ts

import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { initializePaystackTransaction } from "@/lib/paystack";

export function createDueslyPaymentReference() {
  return `dues_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export async function initiateCollectionPayment(input: {
  collectionSlug: string;
  zoneId: string;
  unitId: string;
  payerEmail?: string | null;
}) {
  const collection = await prisma.collection.findUnique({
    where: { slug: input.collectionSlug },
    include: { estate: true },
  });

  if (!collection || collection.status !== "active") {
    return { ok: false, error: "This collection is not available for payment.", code: "COLLECTION_NOT_AVAILABLE" };
  }

  const unit = await prisma.unit.findFirst({
    where: {
      id: input.unitId,
      zoneId: input.zoneId,
      status: "active",
      zone: { estateId: collection.estateId },
    },
  });

  if (!unit) {
    return { ok: false, error: "Selected unit could not be found.", code: "UNIT_NOT_FOUND" };
  }

  const existing = await prisma.payment.findUnique({
    where: { collectionId_unitId: { collectionId: collection.id, unitId: unit.id } },
  });

  if (existing?.status === "success") {
    return { ok: false, error: "This unit has already paid for this collection.", code: "UNIT_ALREADY_PAID" };
  }

  const reference = createDueslyPaymentReference();

  const payment = await prisma.payment.upsert({
    where: { collectionId_unitId: { collectionId: collection.id, unitId: unit.id } },
    create: {
      collectionId: collection.id,
      unitId: unit.id,
      amountKobo: collection.amountKobo,
      method: "online",
      status: "pending",
      gatewayTxRef: reference,
    },
    update: {
      amountKobo: collection.amountKobo,
      method: "online",
      status: "pending",
      gatewayTxRef: reference,
      gatewayTxId: null,
      paidAt: null,
    },
  });

  await prisma.paymentLog.create({
    data: {
      paymentId: payment.id,
      collectionId: collection.id,
      unitId: unit.id,
      amountKobo: collection.amountKobo,
      gatewayTxRef: reference,
      eventType: "initiated",
    },
  });

  const init = await initializePaystackTransaction({
    email: input.payerEmail || "guest@duesly.app",
    amountKobo: collection.amountKobo,
    reference,
    callbackUrl: `${process.env.APP_URL}/pay/${collection.slug}/confirm`,
    metadata: {
      paymentId: payment.id,
      collectionId: collection.id,
      unitId: unit.id,
      estateId: collection.estateId,
    },
  });

  const authorizationUrl = init.data?.authorization_url;

  if (!init.status || !authorizationUrl) {
    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        collectionId: collection.id,
        unitId: unit.id,
        amountKobo: collection.amountKobo,
        gatewayTxRef: reference,
        eventType: "failed",
      },
    });
    return { ok: false, error: "Could not start payment. Please try again.", code: "PAYMENT_START_FAILED" };
  }

  return { ok: true, data: { redirectUrl: authorizationUrl } };
}
```

---

## Shared verification service

One function for webhook and callback.

```ts
// lib/services/payment-verification.ts

import { prisma } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function verifyAndFulfillPaymentByReference(reference: string) {
  const verified = await verifyPaystackTransaction(reference);
  const tx = verified.data;

  if (!tx) {
    return { ok: false, error: "Transaction could not be verified.", code: "TX_NOT_FOUND" };
  }

  const payment = await prisma.payment.findFirst({
    where: { gatewayTxRef: tx.reference },
    include: { collection: true, unit: { include: { zone: true } } },
  });

  if (!payment) {
    return { ok: false, error: "Payment record not found.", code: "PAYMENT_NOT_FOUND" };
  }

  const isValid =
    verified.status === true &&
    tx.status === "success" &&
    tx.reference === payment.gatewayTxRef &&
    tx.currency === "NGN" &&
    tx.amount >= payment.amountKobo &&
    payment.unit.zone.estateId === payment.collection.estateId;

  if (!isValid) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed", gatewayTxId: String(tx.id) },
    });
    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        collectionId: payment.collectionId,
        unitId: payment.unitId,
        amountKobo: tx.amount,
        gatewayTxRef: tx.reference,
        gatewayTxId: String(tx.id),
        eventType: "failed",
      },
    });
    return { ok: false, error: "Payment verification failed.", code: "PAYMENT_VERIFICATION_FAILED" };
  }

  if (payment.status === "success") {
    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        collectionId: payment.collectionId,
        unitId: payment.unitId,
        amountKobo: tx.amount,
        gatewayTxRef: tx.reference,
        gatewayTxId: String(tx.id),
        eventType: "duplicate_ignored",
      },
    });
    return { ok: true, data: { alreadyProcessed: true, paymentId: payment.id } };
  }

  const fulfilled = await prisma.$transaction(async (db) => {
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "success",
        method: "online",
        gatewayTxId: String(tx.id),
        paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
      },
    });

    await db.paymentLog.create({
      data: {
        paymentId: payment.id,
        collectionId: payment.collectionId,
        unitId: payment.unitId,
        amountKobo: tx.amount,
        gatewayTxRef: tx.reference,
        gatewayTxId: String(tx.id),
        eventType: "verified",
      },
    });

    return updated;
  });

  void sendPostPaymentNotifications(fulfilled.id);

  return { ok: true, data: { alreadyProcessed: false, paymentId: fulfilled.id } };
}

async function sendPostPaymentNotifications(paymentId: string) {
  // Send resident receipt and treasurer alert here.
  // Must be non-blocking from the verification response path.
}
```

---

## Webhook route

Endpoint:

```txt
POST /api/webhooks/paystack
```

Rules:

* Use the **raw body**.
* Verify the HMAC-SHA512 signature **before** parsing JSON.
* Reject invalid signatures with `401`.
* Acknowledge irrelevant events with `200`.
* Re-verify the transaction with Paystack before marking paid.
* Respond quickly (Paystack expects a prompt `200`); keep the handler idempotent.
* Do not log full payloads in production.

```ts
// app/api/webhooks/paystack/route.ts

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAndFulfillPaymentByReference } from "@/lib/services/payment-verification";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!isValidPaystackWebhook(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const reference = event.data?.reference;

  if (!reference) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  try {
    await verifyAndFulfillPaymentByReference(reference);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[paystack.webhook] failed", { error, reference });
    return NextResponse.json({ ok: false, error: "Webhook processing failed" }, { status: 500 });
  }
}

function isValidPaystackWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  return safeCompare(signature, expected);
}

function safeCompare(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
```

---

## Callback page

Path:

```txt
/pay/[slug]/confirm
```

This page is not the source of truth. Paystack appends `?reference=` (and `trxref=`) to the callback URL. Use it only as a lookup hint, then verify server-side.

```tsx
// app/pay/[slug]/confirm/page.tsx

import { verifyAndFulfillPaymentByReference } from "@/lib/services/payment-verification";
import { PaymentConfirmationView } from "./_components/payment-confirmation-view";

export default async function ConfirmPaymentPage({
  searchParams,
}: {
  searchParams: { reference?: string; trxref?: string };
}) {
  const reference = searchParams.reference || searchParams.trxref;

  if (!reference) {
    return (
      <PaymentConfirmationView
        status="pending"
        message="We could not find the payment reference yet. Please wait a moment or contact your estate treasurer."
      />
    );
  }

  const result = await verifyAndFulfillPaymentByReference(reference);

  if (!result.ok) {
    return (
      <PaymentConfirmationView
        status="failed"
        message="We could not verify this payment yet. If you were debited, please wait a few minutes before trying again."
      />
    );
  }

  return (
    <PaymentConfirmationView
      status="success"
      message="Your estate dues payment has been confirmed."
    />
  );
}
```

---

## Receipt and notification rules

After verified success:

* Send the resident receipt if an email is available.
* Send the treasurer alert.
* Do not block verification on email; do not send duplicates; do not send before DB commit.

Receipt should include: estate name, collection title, zone, unit, amount, paid date, payment reference.

Never include: raw Paystack payload, secret key, full webhook event, internal debug data.

---

## PaymentLog event types

```txt
initiated
webhook_received
verified
failed
duplicate_ignored
offline_recorded
```

Write `PaymentLog` for: payment initiation, initialize failure, webhook receipt, successful verification, failed verification, duplicate callback/webhook ignored, offline payment recording.

---

## Error handling

Show friendly user-facing messages. Never expose stack traces, the secret key, the webhook raw body, the full gateway payload, SQL errors, or internal IDs.

Safe messages:

```txt
Could not start payment. Please try again.
Payment is still being verified. Please check again in a few minutes.
This unit has already paid for this collection.
This collection is closed.
We could not verify this payment yet.
```

---

## Test mode rules

In development and demo:

* Use test keys (`sk_test_…` / `pk_test_…`).
* Use Paystack test cards / test bank.
* Use fake resident and estate data.
* Do not use real resident phone numbers.
* Do not send live receipts to real users.

Production requires: live keys, the real webhook URL set in the Paystack dashboard, a real domain in `APP_URL`, a tested webhook signature, a tested callback page, and tested duplicate-webhook handling.

---

## Split-payment rule (subaccounts)

Duesly's PRD says estate funds should settle directly to the estate.

For the MVP/demo:

* Do not fake split payments.
* Use the single-destination flow unless subaccounts/splits have been explicitly added.
* Represent the platform fee conceptually in the pitch if needed.

For production:

* Add Paystack **subaccount/split** support only after reading the current official docs.
* Create a subaccount per estate, then pass its `subaccount` code on the initialize call (optionally with `transaction_charge` and `bearer`), or use the Transaction Split API.
* Update this skill and the schema before implementing splits.
* Keep Duesly from ever holding estate money.

---

## Do

* Use the secret key as the bearer token (server-side only).
* Send `amount` in kobo (no conversion).
* Include a customer `email` on initialize (Paystack requires it).
* Use a unique `reference`; store it as `gatewayTxRef`.
* Store the Paystack transaction `id` as `gatewayTxId`.
* Verify via `GET /transaction/verify/{reference}`.
* Check `data.status === "success"`, plus amount, currency, and reference.
* Use the raw request body for webhook signature verification.
* Verify the `x-paystack-signature` HMAC-SHA512 before parsing JSON.
* Write `PaymentLog`. Fulfill idempotently.
* Make callback and webhook share one verification function.
* Send emails only after DB success; keep them non-blocking.
* Return `200` quickly for ignored webhook events.

## Don't

* Do not send the amount in naira.
* Do not trust callback query params as proof of payment.
* Do not mark paid before server-side verification.
* Do not parse webhook JSON before verifying the signature.
* Do not compute the signature over a re-serialized body — use the raw body.
* Do not log the secret key or full gateway payloads in production.
* Do not expose payment internals to residents.
* Do not send duplicate receipts.
* Do not allow a successful payment twice for one unit and collection.
* Do not implement production splits without official docs and a schema update.

---

## Checklist before done

* [ ] Relevant `.agent` files loaded.
* [ ] Secret key is server-side only.
* [ ] Payment initiation validates collection, zone, unit, and estate relationship.
* [ ] Collection and unit are active before payment.
* [ ] Existing successful payment blocks duplicate payment.
* [ ] Amount comes from `Collection.amountKobo` and is sent in kobo.
* [ ] Customer email included on initialize.
* [ ] Unique reference generated and stored as `gatewayTxRef`.
* [ ] Transaction `id` stored as `gatewayTxId`.
* [ ] Webhook uses raw body and verifies HMAC-SHA512 with the secret key.
* [ ] Webhook parses JSON only after verification.
* [ ] Callback and webhook both call the same verification service.
* [ ] Verification checks status, amount, currency, reference, collection, and unit.
* [ ] Verified success updates `Payment` inside a transaction.
* [ ] `PaymentLog` written for every important event.
* [ ] Duplicate callback/webhook becomes a no-op.
* [ ] Failed verification does not mark the unit paid.
* [ ] Receipt and treasurer alert sent only after DB success, non-blocking.
* [ ] No raw payloads, secrets, or stack traces exposed.
* [ ] Test flow works end-to-end with Paystack test cards.
* [ ] `npm run lint` passes.
* [ ] `npm run build` passes.