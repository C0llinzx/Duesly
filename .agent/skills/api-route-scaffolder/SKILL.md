# Skill: API Route Scaffolder

> Use when creating or reviewing a Next.js App Router API route, route handler, or server action for Duesly. Produces validated, secure, typed endpoints for estate setup, roster import, collections, public resident payment, offline payment recording, reconciliation, reminders, exports, notifications, and webhooks.

## Before you build

1. Read `AGENTS.md`.
2. Read `.agent/rules/security.md`.
3. Read `.agent/rules/code-style.md`.
4. Read `.agent/rules/architecture.md`.
5. Read `.agent/rules/design-system.md` if the route affects frontend-visible behavior.
6. Read `.agent/skills/payment-gateway/SKILL.md` if the route touches Paystack, payment initiation, payment verification, payment callbacks, or webhooks.

Before creating a route, ask:

**Does this need to be an API route at all?**

Prefer **server actions** for authenticated dashboard mutations.

Use **route handlers** for:

* Paystack webhooks
* Public resident payment page data
* Payment initiation
* Payment verification callbacks
* CSV upload/import endpoints
* File export endpoints
* Any external system or service that must call Duesly directly

## Duesly route categories

### 1. Admin-only routes

These require authentication and ownership checks.

Examples:

* Create estate
* Create zone
* Add unit
* Edit unit
* Deactivate unit
* Upload roster CSV
* Preview roster import
* Commit roster import
* Create collection
* Record offline payment
* Export defaulters list
* Trigger WhatsApp reminder data
* Trigger optional email reminders

Rules:

* Authenticated admin only.
* Estate admin can access only estates they own.
* Zone coordinator, when enabled, can access only assigned zone data.
* Never trust `adminId`, `userId`, `estateId`, `zoneId`, `collectionId`, or `unitId` from the client without verifying ownership through the session and database.

### 2. Public resident routes

These do not require resident login.

Examples:

* Load collection by slug
* Load zones for a collection
* Load active units for a selected zone
* Initiate payment for a selected unit
* Show payment status

Rules:

* Expose only what the resident needs to complete payment.
* Do not expose full roster data.
* Do not expose phone numbers, admin details, payment logs, internal notes, or private identifiers unless required.
* Show unit code and resident name only for payment confirmation.
* Always check that the collection is active before allowing payment.
* Always check that the selected unit belongs to the collection’s estate.
* Never accept amount from the client.

### 3. Payment and webhook routes

These do not use normal user authentication.

They must follow `.agent/skills/payment-gateway/SKILL.md`.

Rules:

* Verify webhook authenticity.
* Verify transaction server-side with Paystack.
* Confirm transaction reference.
* Confirm gateway transaction ID.
* Confirm amount from the database.
* Confirm currency.
* Confirm collection and unit relationship.
* Block duplicate successful payment for the same unit and collection.
* Write to `PaymentLog`.
* Never mark a unit paid based only on redirect data.
* Keep webhook handlers idempotent.

## Every route or server action must

* Validate input with Zod at the boundary.
* Reject invalid input with `400` before business logic.
* Authenticate where required.
* Authorize ownership of estate, zone, collection, unit, or payment.
* Use Prisma or the approved database access layer only.
* Keep money in Kobo.
* Never accept client-calculated amount.
* Never accept client-calculated payment status.
* Never trust client-provided ownership fields.
* Return typed, consistent response shapes.
* Catch and log errors safely.
* Never leak stack traces, secrets, raw gateway payloads, or database internals.
* Be idempotent where duplicate requests are possible.
* Use correct HTTP status codes.
* Keep route handlers thin.
* Move reusable business logic into services.

## Standard response shape

Use this shape consistently:

```ts
type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: string;
  code?: string;
};
```

Examples:

```json
{
  "ok": true,
  "data": {
    "collectionSlug": "lekki-gardens-jan-service-charge"
  }
}
```

```json
{
  "ok": false,
  "error": "This unit has already paid for this collection.",
  "code": "UNIT_ALREADY_PAID"
}
```

## Status codes

Use these consistently:

* `200` — success
* `201` — created
* `400` — invalid input
* `401` — unauthenticated
* `403` — authenticated but not allowed
* `404` — missing resource
* `409` — duplicate/conflict
* `422` — valid request shape but failed business rule
* `500` — server error

## Duesly business rules to enforce

* A unit belongs to a zone.
* A zone belongs to an estate.
* A collection belongs to an estate.
* A unit is the billable entity.
* A collection has one server-controlled `amountKobo`.
* A unit cannot be successfully paid twice for the same collection.
* A closed collection cannot accept online payment.
* A unit must be active and billable before payment is allowed.
* Offline payment recording requires an authenticated admin.
* Offline payment amount defaults to the collection amount.
* Any offline payment adjustment must be explicit and logged.
* CSV re-import must upsert by `zoneId + unit label`.
* Owing list is computed from active units minus successful payments.
* Payment success must come from verified gateway data or authenticated offline recording.
* Webhook events must not send duplicate receipts, alerts, or notifications.
* Phone numbers and resident personal data must not be exposed through public routes.

## Template: authenticated server action

Use this pattern for dashboard mutations.

```ts
"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const CreateCollectionSchema = z.object({
  estateId: z.string().min(1),
  title: z.string().min(1).max(120),
  amountKobo: z.number().int().positive(),
  dueDate: z.string().datetime().optional(),
});

type CreateCollectionResult =
  | { ok: true; data: { slug: string } }
  | { ok: false; error: string; code?: string };

export async function createCollectionAction(
  input: unknown
): Promise<CreateCollectionResult> {
  const session = await getSession();

  if (!session) {
    return {
      ok: false,
      error: "Unauthorized",
      code: "UNAUTHORIZED",
    };
  }

  const parsed = CreateCollectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  try {
    const estate = await prisma.estate.findFirst({
      where: {
        id: parsed.data.estateId,
        adminId: session.userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!estate) {
      return {
        ok: false,
        error: "Estate not found",
        code: "ESTATE_NOT_FOUND",
      };
    }

    const collection = await prisma.collection.create({
      data: {
        estateId: estate.id,
        title: parsed.data.title,
        amountKobo: parsed.data.amountKobo,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        slug: await generateUniqueCollectionSlug(estate.name, parsed.data.title),
        status: "active",
      },
      select: {
        slug: true,
      },
    });

    return {
      ok: true,
      data: {
        slug: collection.slug,
      },
    };
  } catch (error) {
    console.error("[collections.create] failed", {
      error,
      userId: session.userId,
      estateId: parsed.data.estateId,
    });

    return {
      ok: false,
      error: "Could not create collection",
      code: "COLLECTION_CREATE_FAILED",
    };
  }
}
```

## Template: public route handler

Use this pattern for public resident payment page routes.

```ts
// app/api/public/collections/[slug]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  context: { params: { slug: string } }
) {
  const { slug } = context.params;

  if (!slug || slug.length > 160) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid collection link",
        code: "INVALID_SLUG",
      },
      { status: 400 }
    );
  }

  try {
    const collection = await prisma.collection.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        title: true,
        amountKobo: true,
        dueDate: true,
        status: true,
        estate: {
          select: {
            name: true,
            zones: {
              select: {
                id: true,
                name: true,
              },
              orderBy: {
                name: "asc",
              },
            },
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        {
          ok: false,
          error: "Collection not found",
          code: "COLLECTION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (collection.status !== "active") {
      return NextResponse.json(
        {
          ok: false,
          error: "This collection is closed",
          code: "COLLECTION_CLOSED",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        title: collection.title,
        amountKobo: collection.amountKobo,
        dueDate: collection.dueDate,
        estateName: collection.estate.name,
        zones: collection.estate.zones,
      },
    });
  } catch (error) {
    console.error("[public.collection.read] failed", {
      error,
      slug,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Could not load collection",
        code: "COLLECTION_LOAD_FAILED",
      },
      { status: 500 }
    );
  }
}
```

## Route-specific requirements

### Collection creation

Must validate:

* Estate ID
* Title
* Amount in Kobo
* Due date
* Collection status

Must enforce:

* Estate ownership
* Unique readable slug
* Server-controlled amount
* No client-controlled payment state

### Roster import

Must validate:

* File type
* File size
* Required columns
* Zone name
* Unit label
* Optional resident name
* Optional phone numbers
* Optional email

Must enforce:

* Preview before commit
* Add/update counts
* Missing-field warnings
* Duplicate-row warnings
* Upsert by zone + unit label
* No duplicate units after re-import
* No public exposure of phone numbers or emails

### Unit management

Must validate:

* Estate ID or zone ID
* Unit label
* Resident name
* Phone fields
* Email field
* Occupancy type
* Unit status

Must enforce:

* Admin ownership
* Unique unit label within zone
* Deactivated units do not appear as billable units by default
* Edits do not corrupt historical payment records

### Offline payment recording

Must validate:

* Collection ID
* Unit ID
* Amount paid in Kobo
* Payment date
* Payment method
* Optional note

Must enforce:

* Admin ownership
* Unit belongs to collection estate
* Duplicate paid status blocked
* PaymentLog created
* Dashboard updates through normal reconciliation logic
* If recorded amount differs from collection amount, require a note

### Public payment initiation

Must validate:

* Collection slug or collection ID
* Zone ID
* Unit ID

Must enforce:

* Collection is active
* Unit belongs to selected zone
* Zone belongs to collection estate
* Unit is active and billable
* Unit has not already paid
* Amount comes from collection record
* Transaction reference is unique
* Payment attempt is created as pending before checkout when appropriate

### Webhook route

Must validate:

* Webhook signature or secret hash
* Transaction reference
* Gateway transaction ID

Must enforce:

* Verify with Paystack API
* Amount matches collection amount
* Currency is correct
* Unit and collection relationship is valid
* Duplicate webhook does not duplicate payment, email, or dashboard event
* PaymentLog is written
* Failed payments are recorded without marking unit as paid
* Gateway payload is not leaked to the client

### Reconciliation route

Must enforce:

* Authenticated admin or approved zone coordinator only
* Estate ownership
* Zone scope where applicable
* Owing list is computed, not stored
* Successful payments only count as paid
* Offline and online successful payments both count
* Exempt or inactive units are excluded unless explicitly requested

### Reminder route

Must validate:

* Collection ID
* Unit ID or selected unit IDs
* Reminder channel

Must enforce:

* Authenticated admin only
* Estate ownership
* Unit is still owing
* WhatsApp deep link uses registered phone numbers only
* Optional email reminder sends only when email exists
* No duplicate bulk send without confirmation

### Defaulters export route

Must enforce:

* Authenticated admin only
* Estate ownership
* Export only owing units
* Include only necessary fields
* Respect zone filter
* Do not export unrelated estate data

## Checklist before done

* [ ] Server action vs route handler chosen correctly
* [ ] Relevant `.agent` files read
* [ ] Zod validation at the boundary
* [ ] Auth enforced where required
* [ ] Ownership or zone scope enforced
* [ ] Duesly business rules enforced
* [ ] Amounts kept in Kobo
* [ ] Payment status not trusted from client
* [ ] Public routes expose minimal data
* [ ] Webhook routes are idempotent
* [ ] CSV import supports preview before commit
* [ ] Offline payment recording creates a PaymentLog
* [ ] Reconciliation is computed from units minus successful payments
* [ ] Typed `{ ok, data }` / `{ ok, error }` results
* [ ] Correct status codes used
* [ ] Errors caught and safely logged
* [ ] Secrets only accessed through `process.env`
* [ ] No stack traces or raw gateway payloads leaked
* [ ] `npm run lint` passes
