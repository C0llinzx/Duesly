# Skill: DB Migration Runner

> Use when changing the Duesly database schema — adding models, fields, indexes, constraints, enums, relations, or altering types. Duesly uses **Prisma + PostgreSQL**. Migrations are code: reviewed, versioned, intentional, and never treated as throwaway output.

Duesly’s database is the product engine.

It must support:

* Estate setup
* Zones
* Units
* CSV roster import and safe re-import
* Collections
* Online payments
* Offline payment recording
* Payment logs
* Paid-vs-owing reconciliation
* Reminders and defaulters exports

A careless migration can corrupt the owing list, duplicate units, break payments, or make reconciliation untrustworthy.

---

## Before you migrate

1. Read `AGENTS.md`.
2. Read `.agent/rules/architecture.md` — source of truth for schema and data flow.
3. Read `.agent/rules/code-style.md` — naming, Prisma model conventions, column mapping, enum naming.
4. Read `.agent/rules/security.md` — resident personal data, payment safety, secrets, and access control.
5. Read `.agent/skills/payment-gateway/SKILL.md` if the migration touches payments, webhooks, transaction references, or payment logs.
6. Confirm the change supports the PRD and build plan. Do not add schema complexity that is not needed for the MVP.

Before editing the schema, answer:

* What product behavior does this migration enable?
* Is it required for the MVP?
* Does it affect existing data?
* Does it affect payment integrity?
* Does it affect roster import or reconciliation?
* Does it require a backfill?
* Does it need a new index or unique constraint?
* Can it be rolled forward safely?

---

## Hard rules

* Never edit a migration that has already been applied to a shared, staging, or production database.
* Never run `prisma migrate dev` in production.
* Never use `prisma db push` for real schema changes after migrations have started.
* Never store money as `Float` or `Decimal`.
* Never store Naira as the canonical money value.
* Never trust client-calculated money, payment status, or ownership fields.
* Never remove a column or enum value with live data unless the migration plan explicitly handles the data.
* Never drop payment, unit, collection, or log data casually.
* Never add raw SQL outside a migration file.
* Never create a migration without inspecting the generated SQL.

---

## Standard workflow

### 1. Edit the Prisma schema

Edit:

```txt
prisma/schema.prisma
```

Make the schema reflect the desired final state.

---

### 2. Create and apply the migration in development

Use a short descriptive name.

```bash
npx prisma migrate dev --name <short_descriptive_name>
```

Examples:

```bash
npx prisma migrate dev --name init_duesly_core_schema
npx prisma migrate dev --name add_unit_zone_label_unique
npx prisma migrate dev --name add_payment_logs
npx prisma migrate dev --name add_offline_payment_method
npx prisma migrate dev --name add_collection_slug_unique
```

---

### 3. Inspect the generated SQL

Open:

```txt
prisma/migrations/<timestamp>_<name>/migration.sql
```

Confirm the SQL does only what was intended.

Check especially for:

* unintended table drops
* unintended column drops
* nullable-to-required changes without backfill
* enum changes that can break existing rows
* missing indexes
* missing unique constraints
* cascade deletes that could erase important data
* payment-related constraints
* unit/zone uniqueness constraints

---

### 4. Regenerate Prisma client

```bash
npx prisma generate
```

---

### 5. Verify locally

Use one or more:

```bash
npx prisma studio
```

```bash
npx prisma migrate status
```

```bash
npm run lint
```

```bash
npm run build
```

If seed data exists:

```bash
npx prisma db seed
```

---

## Production / deploy workflow

Production must use:

```bash
npx prisma migrate deploy
```

Never use:

```bash
npx prisma migrate dev
```

in production.

Never use:

```bash
npx prisma migrate reset
```

on shared, staging, or production data.

Deploy order:

1. Confirm environment variables are set.
2. Run pending migrations with `npx prisma migrate deploy`.
3. Run `npx prisma generate` if the deploy process does not do it automatically.
4. Start or redeploy the application.
5. Smoke-test signup, estate setup, roster import, collection creation, payment initiation, webhook handling, offline payment recording, and reconciliation dashboard.

---

## Duesly core schema rules

### IDs

Use UUID primary keys.

```prisma
id String @id @default(uuid()) @db.Uuid
```

Use UUID foreign keys.

```prisma
estateId String @db.Uuid
```

---

### Money

Money is stored in **Kobo** as an integer.

Correct:

```prisma
amountKobo Int
```

Wrong:

```prisma
amount Float
```

Wrong:

```prisma
amountNaira Decimal
```

UI may display Naira. The database stores Kobo.

---

### Timestamps

Use UTC timestamps.

```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
paidAt    DateTime?
```

Use full `DateTime`, not time-only values.

---

### Column naming

Prisma fields should be camelCase.

Database columns may be snake_case using `@map`.

Example:

```prisma
createdAt DateTime @default(now()) @map("created_at")
amountKobo Int @map("amount_kobo")
```

Use `@@map` for table names where the project convention requires snake_case.

```prisma
@@map("collections")
```

Follow `.agent/rules/code-style.md` as the final source of truth.

---

## Required Duesly models

The core MVP schema must support these models:

* `User`
* `Estate`
* `Zone`
* `Unit`
* `Collection`
* `Payment`
* `PaymentLog`

Do not rename these casually.

---

## Recommended Prisma schema shape

Use this as the base pattern unless `architecture.md` already defines a different final schema.

```prisma
model User {
  id           String   @id @default(uuid()) @db.Uuid
  name         String
  email        String   @unique
  phone        String?
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  estates Estate[]

  @@map("users")
}
```

```prisma
model Estate {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  adminId   String   @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  admin       User         @relation(fields: [adminId], references: [id], onDelete: Cascade)
  zones       Zone[]
  collections Collection[]

  @@index([adminId])
  @@map("estates")
}
```

```prisma
model Zone {
  id            String   @id @default(uuid()) @db.Uuid
  estateId      String   @db.Uuid
  name          String
  coordinatorId String?  @db.Uuid
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  estate Estate @relation(fields: [estateId], references: [id], onDelete: Cascade)
  units  Unit[]

  @@unique([estateId, name])
  @@index([estateId])
  @@map("zones")
}
```

```prisma
model Unit {
  id             String       @id @default(uuid()) @db.Uuid
  zoneId         String       @db.Uuid
  label          String
  residentName   String?
  phone1         String?
  phone2         String?
  residentEmail  String?
  occupancyType  OccupancyType?
  status         UnitStatus   @default(active)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  zone     Zone      @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  payments Payment[]

  @@unique([zoneId, label])
  @@index([zoneId])
  @@index([status])
  @@map("units")
}
```

```prisma
model Collection {
  id          String           @id @default(uuid()) @db.Uuid
  estateId    String           @db.Uuid
  slug        String           @unique
  title       String
  amountKobo  Int
  dueDate     DateTime?
  status      CollectionStatus @default(active)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  estate   Estate    @relation(fields: [estateId], references: [id], onDelete: Cascade)
  payments Payment[]

  @@index([estateId])
  @@index([status])
  @@index([dueDate])
  @@map("collections")
}
```

```prisma
model Payment {
  id             String        @id @default(uuid()) @db.Uuid
  collectionId   String        @db.Uuid
  unitId         String        @db.Uuid
  amountKobo     Int
  method         PaymentMethod @default(online)
  status         PaymentStatus @default(pending)
  gatewayTxRef   String?       @unique
  gatewayTxId    String?
  paidAt         DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  collection Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  unit       Unit       @relation(fields: [unitId], references: [id], onDelete: Cascade)
  logs       PaymentLog[]

  @@unique([collectionId, unitId])
  @@index([collectionId])
  @@index([unitId])
  @@index([status])
  @@index([method])
  @@map("payments")
}
```

```prisma
model PaymentLog {
  id           String           @id @default(uuid()) @db.Uuid
  paymentId    String?          @db.Uuid
  collectionId String           @db.Uuid
  unitId       String           @db.Uuid
  amountKobo   Int?
  method       PaymentMethod?
  status       PaymentStatus?
  gatewayTxRef String?
  gatewayTxId  String?
  eventType    PaymentEventType
  rawEvent     Json?
  createdAt    DateTime         @default(now())

  payment Payment? @relation(fields: [paymentId], references: [id], onDelete: SetNull)

  @@index([paymentId])
  @@index([collectionId])
  @@index([unitId])
  @@index([gatewayTxRef])
  @@index([gatewayTxId])
  @@index([eventType])
  @@map("payment_logs")
}
```

```prisma
enum UnitStatus {
  active
  exempt
  inactive
}

enum OccupancyType {
  owner
  renter
}

enum CollectionStatus {
  draft
  active
  closed
}

enum PaymentMethod {
  online
  offline
  cash
  bank_transfer
  pos
  other
}

enum PaymentStatus {
  pending
  success
  failed
}

enum PaymentEventType {
  initiated
  verified
  webhook_received
  webhook_verified
  offline_recorded
  failed
  duplicate_ignored
}
```

---

## Critical constraints

### Unit uniqueness

A unit code must be unique inside a zone.

Required:

```prisma
@@unique([zoneId, label])
```

This protects CSV re-import.

Without this, the same unit can be inserted twice and the owing count becomes wrong.

---

### Collection slug uniqueness

Every collection must have a unique public slug.

Required:

```prisma
slug String @unique
```

This powers public links like:

```txt
/pay/lekki-gardens-jan-service-charge
```

---

### Payment idempotency

Every online payment attempt must have a unique gateway transaction reference.

Required where stored:

```prisma
gatewayTxRef String? @unique
```

This protects against duplicate webhook processing and repeated callbacks.

---

### Unit-collection duplicate protection

A unit must not be successfully paid twice for the same collection.

For the MVP, prefer one `Payment` row per unit per collection:

```prisma
@@unique([collectionId, unitId])
```

This lets the row represent the current payment state for that unit-collection pair, while `PaymentLog` stores the event history.

If the project later supports multiple payment attempts as separate `Payment` rows, do not remove duplicate protection casually. You must introduce a separate `PaymentAttempt` model or a carefully reviewed Postgres partial unique index for successful payments only.

---

### Payment logs

`PaymentLog` is not optional.

It records payment events independently of the final `Payment` row.

Use it for:

* payment initiated
* webhook received
* webhook verified
* transaction verified
* failed payment
* duplicate webhook ignored
* offline payment recorded

Do not use `PaymentLog` as the dashboard source of truth.

Use `Payment` for current paid/owing state, and `PaymentLog` as the audit trail.

---

## Index rules

Add indexes for fields used in lookups, filters, joins, and dashboard queries.

Required indexes:

```prisma
@@index([adminId])
@@index([estateId])
@@index([zoneId])
@@index([collectionId])
@@index([unitId])
@@index([status])
```

Use indexes for:

* dashboard collection lists
* zone filters
* paid/owing reconciliation
* public collection lookup by slug
* payment lookup by gateway reference
* payment logs lookup
* defaulters export
* reminder generation

Do not over-index casually. Every index has a write cost.

---

## Relationship rules

Use explicit relations.

Correct:

```prisma
zone Zone @relation(fields: [zoneId], references: [id], onDelete: Cascade)
```

Choose `onDelete` deliberately.

Recommended defaults:

* `User → Estate`: `Cascade` may be acceptable in local/dev, but be careful in production.
* `Estate → Zone`: `Cascade` only if deleting an estate is a deliberate destructive action.
* `Zone → Unit`: `Cascade` only if deleting a zone should remove its units.
* `Collection → Payment`: usually `Cascade` only if deleting collections is allowed.
* `Payment → PaymentLog`: prefer `SetNull` so logs can survive payment row changes.

For production, prefer soft deactivation over deletion for important business objects.

Examples:

* Deactivate a unit instead of deleting it.
* Close a collection instead of deleting it.
* Record a failed payment instead of deleting the payment attempt.
* Keep logs.

---

## Enum rules

Use enums for stable status fields.

Good:

```prisma
status PaymentStatus @default(pending)
```

Avoid raw strings for statuses.

Enums to use:

* `UnitStatus`
* `OccupancyType`
* `CollectionStatus`
* `PaymentMethod`
* `PaymentStatus`
* `PaymentEventType`

Before changing an enum:

1. Check existing rows.
2. Check app logic.
3. Check dashboard filters.
4. Check payment handling.
5. Check seed data.
6. Check tests.

Do not remove enum values with live data unless a data migration handles it.

---

## Safe migration patterns

### Adding a nullable field

Safe:

```prisma
residentEmail String?
```

Then migrate normally.

```bash
npx prisma migrate dev --name add_unit_resident_email
```

---

### Adding a required field to a table with existing rows

Do not add a required field directly.

Wrong:

```prisma
residentType String
```

Safe sequence:

1. Add as nullable.

```prisma
residentType String?
```

2. Migrate.

```bash
npx prisma migrate dev --name add_nullable_resident_type
```

3. Backfill data with a script.

```bash
node scripts/backfill-resident-type.js
```

4. Make required only after every row has a value.

```prisma
residentType String
```

5. Create a second migration.

```bash
npx prisma migrate dev --name make_resident_type_required
```

---

### Renaming a field

Prisma may generate a drop/add instead of a rename.

Before accepting the SQL, inspect `migration.sql`.

Bad generated pattern:

```sql
ALTER TABLE "units" DROP COLUMN "resident_name";
ALTER TABLE "units" ADD COLUMN "occupant_name" TEXT;
```

This loses data.

Safer manual SQL inside the migration:

```sql
ALTER TABLE "units" RENAME COLUMN "resident_name" TO "occupant_name";
```

Only use manual SQL inside reviewed migration files.

---

### Changing money fields

Never migrate money to float.

Correct:

```prisma
amountKobo Int
```

If renaming `amount` to `amountKobo`, preserve data.

Review whether existing values are already Kobo or Naira.

If existing values are Naira, multiply by 100 exactly in a reviewed backfill migration or script.

---

### Adding unique constraints to existing data

Before adding a unique constraint, check for duplicates.

Example duplicate check for units:

```sql
SELECT zone_id, label, COUNT(*)
FROM units
GROUP BY zone_id, label
HAVING COUNT(*) > 1;
```

If duplicates exist:

1. Stop.
2. Decide which row survives.
3. Merge or move related payments.
4. Back up the database.
5. Clean duplicates.
6. Add the unique constraint.

Do not add a unique constraint blindly to a table with existing data.

---

## Reconciliation rules

The owing list must be computed, not stored.

Do not create an `isOwing` column.

Do not create a stored `owingUnits` table.

Use the relationship between:

* active units
* a collection
* successful payments

A unit is paid for a collection if there is a successful `Payment` for that `collectionId + unitId`.

A unit is owing if it is active and has no successful payment for that collection.

Schema must make this query efficient.

Required support:

```prisma
@@index([collectionId])
@@index([unitId])
@@index([status])
@@unique([collectionId, unitId])
```

---

## CSV roster import rules

Schema must support safe import and re-import.

Required:

```prisma
@@unique([zoneId, label])
```

Recommended:

```prisma
residentName  String?
phone1        String?
phone2        String?
residentEmail String?
occupancyType OccupancyType?
status        UnitStatus @default(active)
```

Do not require resident name, phone, or email at the database level.

Messy imports are expected.

The system must allow units to exist with missing contact fields so the treasurer can fill blanks later.

---

## Offline payment rules

Offline payments are part of the MVP.

Schema must support:

* `method`
* `status`
* `paidAt`
* `amountKobo`
* `PaymentLog`

Correct:

```prisma
method PaymentMethod @default(online)
status PaymentStatus @default(pending)
paidAt DateTime?
```

When an admin records an offline payment:

* `Payment.status` becomes `success`
* `Payment.method` becomes `offline`, `cash`, `bank_transfer`, `pos`, or `other`
* `PaymentLog.eventType` records `offline_recorded`

Do not create a separate `OfflinePayment` table unless the architecture explicitly asks for it.

---

## Payment gateway migration rules

If a migration touches Paystack, transaction references, webhook logs, or payment status:

1. Read `.agent/skills/payment-gateway/SKILL.md`.
2. Confirm idempotency.
3. Confirm unique references.
4. Confirm failed payments do not mark units as paid.
5. Confirm duplicate webhooks cannot create duplicate success state.
6. Confirm emails and dashboard updates cannot be duplicated because of schema design.

Fields to protect:

```prisma
gatewayTxRef String? @unique
gatewayTxId  String?
status       PaymentStatus
paidAt       DateTime?
```

---

## Migration naming rules

Use short, descriptive, lowercase migration names.

Good:

```bash
npx prisma migrate dev --name init_duesly_core_schema
npx prisma migrate dev --name add_payment_logs
npx prisma migrate dev --name add_unit_contact_fields
npx prisma migrate dev --name add_collection_status
npx prisma migrate dev --name add_offline_payment_method
```

Bad:

```bash
npx prisma migrate dev --name update
npx prisma migrate dev --name changes
npx prisma migrate dev --name final
npx prisma migrate dev --name fix_db
```

---

## Destructive change protocol

A migration is destructive if it:

* drops a table
* drops a column
* changes a field type
* makes a nullable column required
* deletes enum values
* changes relation behavior
* adds a unique constraint to dirty data
* changes money representation
* changes payment identity
* changes unit identity

Before destructive changes:

1. Stop.
2. Explain the risk.
3. Check existing data.
4. Back up the database.
5. Use a forward-safe approach.
6. Prefer add → backfill → switch → remove later.
7. Inspect SQL.
8. Test locally with realistic seed data.

---

## Seed data rules

Seed data should represent real Duesly flows.

Include:

* one admin user
* one estate
* multiple zones
* multiple units per zone
* units with missing phone/email fields
* one active collection
* at least one successful online payment
* at least one failed payment
* at least one offline payment
* at least one owing unit

Seed data must not contain real resident phone numbers or private data.

Use obviously fake data.

---

## Verification checklist after migration

After every migration, verify:

* Admin signup still works.
* Estate creation still works.
* Zone creation still works.
* Unit creation still works.
* CSV import can add new units.
* CSV re-import updates existing units instead of duplicating.
* Collection creation still creates a unique slug.
* Public payment page can load by slug.
* Payment initiation can create or update a pending payment.
* Webhook can mark payment successful.
* Duplicate webhook does not duplicate payment.
* Offline payment can be recorded.
* Paid/owing dashboard is correct.
* Owing list is filterable by zone.
* Inactive or exempt units are handled correctly.
* `npm run lint` passes.
* `npm run build` passes.

---

## Production safety checklist

Before deploying migrations:

* [ ] Migration matches `architecture.md`.
* [ ] Generated SQL has been reviewed.
* [ ] No unintended drops.
* [ ] No unsafe nullable-to-required changes.
* [ ] No enum removals without backfill.
* [ ] No payment data loss.
* [ ] No unit/zone identity corruption.
* [ ] No duplicate unit risk.
* [ ] No duplicate payment success risk.
* [ ] Money remains integer Kobo.
* [ ] Unique constraints are present where required.
* [ ] Indexes exist for dashboard and reconciliation queries.
* [ ] `npx prisma migrate status` is clean locally.
* [ ] `npx prisma generate` has been run.
* [ ] `npm run lint` passes.
* [ ] `npm run build` passes.
* [ ] Database backup exists for shared/staging/production data.
* [ ] Production uses `npx prisma migrate deploy`, not `migrate dev`.

---

## Final checklist before done

* [ ] Change is required for Duesly MVP or explicitly approved.
* [ ] Relevant `.agent` files were read.
* [ ] Prisma schema was updated intentionally.
* [ ] Migration was created with a descriptive name.
* [ ] Generated SQL was inspected.
* [ ] Money is stored as integer Kobo.
* [ ] IDs are UUIDs.
* [ ] Timestamps use full `DateTime`.
* [ ] Unit uniqueness is protected with `@@unique([zoneId, label])`.
* [ ] Collection slug is unique.
* [ ] Payment transaction reference is unique where stored.
* [ ] Unit-collection duplicate payment protection exists.
* [ ] PaymentLog exists and is not removed.
* [ ] Owing list remains computed, not stored.
* [ ] CSV re-import remains safe.
* [ ] Offline payments remain supported.
* [ ] Destructive changes were avoided or handled safely.
* [ ] Prisma client was regenerated.
* [ ] Local verification passed.
* [ ] `npm run lint` passes.
* [ ] `npm run build` passes.
