# Skill: Component Builder

> Use whenever creating or refactoring a UI component for Duesly. This skill turns the PRD’s surfaces, flows, states, and edge cases into concrete, mobile-first, accessible components for estate dues collection.

Duesly is not a generic dashboard app. It has two high-trust flows:

1. A treasurer sets up an estate, uploads or manages units, creates a collection, and tracks paid vs owing.
2. A resident opens a public link, selects their zone and unit, confirms the resident name, and pays without creating an account.

Every component must support this core promise:

> Set up once, share one link, watch the dashboard reconcile itself.

---

## When to use

Use this skill when building or refactoring:

* Public resident payment page components
* Treasurer dashboard components
* Auth components
* Onboarding components
* Estate setup components
* Zone and unit management components
* CSV roster import components
* Collection creation components
* Paid / owing reconciliation components
* Offline payment recording components
* Reminder components
* Defaulters export components
* Payment success, failed, retry, already-paid, and receipt screens
* Shared UI primitives such as buttons, inputs, badges, cards, tables, modals, toasts, alerts, empty states, and skeletons

---

## Before you build

Load these files first:

1. `.agent/rules/design-system.md` — tokens, typography, spacing, radius, colors, responsive rules, and styling method
2. `.agent/rules/code-style.md` — TypeScript, naming, prop typing, component conventions
3. `.agent/rules/architecture.md` — server/client component rules, App Router patterns, folder structure
4. `.agent/rules/security.md` — resident data privacy, protected routes, payment safety
5. `.agent/skills/api-route-scaffolder/SKILL.md` — if the component calls a server action, API route, import endpoint, reminder route, or export route
6. `.agent/skills/payment-gateway/SKILL.md` — if the component initiates, retries, displays, or responds to payment

Before building, ask:

* Which Duesly surface is this component for?
* Is this public or authenticated?
* Does it expose resident personal data?
* Does it touch money?
* Does it need client-side interactivity?
* What states must it support?
* What happens on mobile?

---

## Duesly has four main surfaces

### 1. Public resident payment page — `/pay/[slug]`

This is the conversion and trust surface.

Residents arrive from WhatsApp, a QR code, or a shared estate link. They do not log in. They self-identify through:

```txt
Zone → Unit → Confirm unit code and resident name → Pay
```

Rules:

* Server component by default
* Use client components only for real interaction:

  * zone selection
  * unit selection
  * payment initiation
  * retry payment
  * local form state
* No unnecessary client-side JavaScript
* No heavy animation
* No large dependencies
* No distracting navigation
* One primary CTA: `Pay dues`
* CTA must be full-width on mobile
* CTA must be reachable with one thumb
* Tap targets must be at least `44px`
* Amount must come from the server as `amountKobo`
* The component may format the amount for display, but must never calculate the payable amount
* Residents must never type or edit the payment amount
* Show estate name, collection title, due date, amount, selected zone, selected unit, and resident name when available
* Include “Can’t find your unit?” fallback
* Include payment trust cues near the CTA

Mandatory trust cues:

* Estate name
* Collection title
* Clear amount
* Unit code and resident name confirmation
* “Secure payment via Paystack”
* “No app download required”
* Clear confirmation after payment

---

### 2. Treasurer dashboard — `/dashboard/*`

This is the operations surface.

Treasurers create collections, manage units, record offline payments, monitor who has paid, and chase who is still owing.

Rules:

* Server components for dashboard summaries, tables, and initial data
* Client components only where state is real:

  * filters
  * search
  * forms
  * import preview
  * copy link
  * modals
  * reminders
  * exports
  * offline payment recording
* Show skeletons for lists and dashboard cards
* Never show blank loading screens
* Empty states must guide the next action
* Tables must work on mobile
* Paid and owing states must be visually clear
* Zone filters must be visible and easy to use
* Put summaries before detailed tables

Dashboard components must support:

* Collection progress
* Total amount collected
* Paid count
* Owing count
* Zone filter
* Paid list
* Owing list
* Offline payment recording
* Copy collection link
* WhatsApp reminder link
* Defaulters export
* Payment status badges

---

### 3. Auth and onboarding — `/signup`, `/login`, `/onboarding/*`

This is the entry and setup surface.

Rules:

* Simple one-column layout
* Mobile-first
* Large input fields
* Inline validation
* Plain-language errors
* No browser-default-only validation
* Password requirements must be understandable
* Onboarding must follow Duesly’s setup order:

```txt
Create estate → Add zones and units → Create first collection
```

Onboarding components must reduce cognitive load for non-technical estate treasurers.

---

### 4. Post-payment and notification screens

These include:

* success screen
* failed payment screen
* retry screen
* already-paid screen
* closed-collection screen
* receipt screen

Rules:

* Payment success must feel final and reassuring
* Failed payment must provide a retry path
* Already-paid state must explain that the unit has already paid for this collection
* Receipt screens must show:

  * estate
  * collection
  * unit
  * amount
  * date
  * payment reference
* Do not expose:

  * internal IDs
  * raw gateway payloads
  * webhook data
  * admin-only data
  * private notes
* Do not imply payment is successful until the backend has verified it

---

## Styling Guidelines

Follow `.agent/rules/design-system.md`.

If the project is using the same bootcamp setup as SellSnap:

* Use standard CSS or CSS Modules
* Do not use Tailwind unless `design-system.md` explicitly allows it
* Do not mix Tailwind and CSS Modules
* Import CSS module files directly into components

```tsx
import styles from "./component-name.module.css";
```

Always use design tokens through CSS variables.

```css
.card {
  background: var(--color-surface);
  color: var(--color-on-surface);
  border: 1px solid var(--color-outline);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
```

Use typography tokens.

```css
.title {
  font-family: var(--typography-display-sm-font-family);
  font-size: var(--typography-display-sm-font-size);
  line-height: var(--typography-display-sm-line-height);
  font-weight: 700;
  color: var(--color-on-background);
}
```

Rules:

* No hardcoded colors unless explicitly approved
* No hardcoded font sizes unless the token does not exist
* Use spacing from the approved scale
* Use mobile-first CSS
* Use native media queries
* Respect `prefers-reduced-motion`
* Use `font-variant-numeric: tabular-nums` for money, counts, and table numbers

---

## Component Placement & File Naming

Shared primitives live in:

```txt
components/ui/
```

Feature-specific reusable components live in:

```txt
components/
```

Route-specific components may be co-located near the route:

```txt
app/dashboard/collections/[id]/_components/
app/pay/[slug]/_components/
app/onboarding/_components/
```

Naming rules:

| Item             | Rule                         | Example                      |
| ---------------- | ---------------------------- | ---------------------------- |
| Component file   | kebab-case                   | `payment-summary.tsx`        |
| CSS module       | kebab-case + `.module.css`   | `payment-summary.module.css` |
| Component export | PascalCase                   | `PaymentSummary`             |
| Hook             | camelCase, starts with `use` | `useUnitSearch`              |
| Utility          | camelCase                    | `formatNaira`                |

Avoid vague names:

```txt
Card.tsx
Modal.tsx
Form.tsx
Table.tsx
```

Prefer specific names:

```txt
collection-summary-card.tsx
record-offline-payment-modal.tsx
roster-import-preview-table.tsx
owing-units-table.tsx
```

---

## Server vs Client Component Rules

Default to server components.

Use client components only when the component needs:

* `useState`
* `useEffect`
* `useTransition`
* browser APIs
* copy-to-clipboard
* file upload
* form interaction
* local filtering/search
* modal open/close state
* payment initiation click state
* optimistic UI
* toast feedback

Do not turn a whole page into a client component because one child needs interactivity. Extract the interactive part.

Good:

```tsx
// app/pay/[slug]/page.tsx
import { CollectionPaymentShell } from "./_components/collection-payment-shell";
import { getPublicCollectionBySlug } from "@/lib/data/public-collections";

export default async function PayPage({
  params,
}: {
  params: { slug: string };
}) {
  const collection = await getPublicCollectionBySlug(params.slug);

  return <CollectionPaymentShell collection={collection} />;
}
```

```tsx
// app/pay/[slug]/_components/collection-payment-shell.tsx
"use client";

import { useState } from "react";
import { ZoneSelect } from "./zone-select";
import { UnitSelect } from "./unit-select";
import { UnitConfirmation } from "./unit-confirmation";
import { PayDuesButton } from "./pay-dues-button";

export function CollectionPaymentShell({ collection }: { collection: PublicCollection }) {
  const [zoneId, setZoneId] = useState("");
  const [unitId, setUnitId] = useState("");

  const selectedZone = collection.zones.find((zone) => zone.id === zoneId);
  const selectedUnit = selectedZone?.units.find((unit) => unit.id === unitId);

  return (
    <>
      <ZoneSelect zones={collection.zones} value={zoneId} onChange={setZoneId} />

      {selectedZone && (
        <UnitSelect
          units={selectedZone.units}
          value={unitId}
          onChange={setUnitId}
        />
      )}

      {selectedZone && selectedUnit && (
        <>
          <UnitConfirmation
            estateName={collection.estateName}
            collectionTitle={collection.title}
            zoneName={selectedZone.name}
            unitLabel={selectedUnit.label}
            residentName={selectedUnit.residentName}
          />

          <PayDuesButton
            collectionSlug={collection.slug}
            unitId={selectedUnit.id}
          />
        </>
      )}
    </>
  );
}
```

---

## App Router Patterns

### Loading states

Use `loading.tsx` in route segments that fetch dashboard, collection, roster, or payment data.

```tsx
// app/dashboard/collections/[id]/loading.tsx

import styles from "./loading.module.css";

export default function CollectionDashboardLoading() {
  return (
    <main className={styles.container} aria-label="Loading collection dashboard">
      <div className={styles.summaryGrid}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>

      <div className={styles.skeletonTable} />
    </main>
  );
}
```

```css
/* app/dashboard/collections/[id]/loading.module.css */

.container {
  display: grid;
  gap: var(--space-4);
}

.summaryGrid {
  display: grid;
  gap: var(--space-3);
}

.skeletonCard,
.skeletonTable {
  border-radius: var(--radius-lg);
  background: var(--color-surface-variant);
  animation: pulse 1.4s ease-in-out infinite;
}

.skeletonCard {
  min-height: 96px;
}

.skeletonTable {
  min-height: 320px;
}

@media (min-width: 768px) {
  .summaryGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeletonCard,
  .skeletonTable {
    animation: none;
  }
}

@keyframes pulse {
  0% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.55;
  }
}
```

### Error boundaries

Use `error.tsx` in route segments that can fail.

```tsx
// app/pay/[slug]/error.tsx

"use client";

import styles from "./error.module.css";

export default function PaymentPageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Could not load this payment page</h1>
      <p className={styles.copy}>
        Please check your connection and try again. If the issue continues,
        confirm the payment link with your estate treasurer.
      </p>
      <button type="button" onClick={reset} className={styles.button}>
        Try again
      </button>
    </main>
  );
}
```

### Not found

Use `notFound()` and `not-found.tsx` for invalid collection links.

```tsx
// app/pay/[slug]/not-found.tsx

import styles from "./not-found.module.css";

export default function CollectionNotFound() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Collection not found</h1>
      <p className={styles.copy}>
        This payment link may be invalid, expired, or closed. Please confirm
        the link with your estate treasurer.
      </p>
    </main>
  );
}
```

```tsx
// app/pay/[slug]/page.tsx

import { notFound } from "next/navigation";
import { getPublicCollectionBySlug } from "@/lib/data/public-collections";

export default async function PayPage({
  params,
}: {
  params: { slug: string };
}) {
  const collection = await getPublicCollectionBySlug(params.slug);

  if (!collection) {
    notFound();
  }

  return <div>{collection.title}</div>;
}
```

### Redirects

Use `redirect()` from `next/navigation` in server actions or server components.

Use `useRouter()` only in client components.

```tsx
"use server";

import { redirect } from "next/navigation";
import { createCollection } from "@/lib/services/collections";

export async function createCollectionAction(formData: FormData) {
  const collection = await createCollection(formData);

  redirect(`/dashboard/collections/${collection.id}`);
}
```

---

## Core Component Examples

### 1. Money display

Money is stored in Kobo. Components receive Kobo and render Naira.

Never scatter `/ 100` calculations through components. Use a shared helper.

```ts
// lib/money.ts

export function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
```

```tsx
// components/money-amount.tsx

import { formatNaira } from "@/lib/money";
import styles from "./money-amount.module.css";

interface MoneyAmountProps {
  amountKobo: number;
  label?: string;
  className?: string;
}

export function MoneyAmount({
  amountKobo,
  label = "Amount",
  className,
}: MoneyAmountProps) {
  const formatted = formatNaira(amountKobo);

  return (
    <span
      className={`${styles.amount} ${className ?? ""}`}
      aria-label={`${label}: ${formatted}`}
    >
      {formatted}
    </span>
  );
}
```

```css
/* components/money-amount.module.css */

.amount {
  font-family: var(--typography-text-xl-font-family);
  font-size: var(--typography-text-xl-font-size);
  font-weight: 700;
  line-height: var(--typography-text-xl-line-height);
  color: var(--color-on-background);
  font-variant-numeric: tabular-nums;
}
```

---

### 2. Unit confirmation card

Use this before initiating payment.

```tsx
// app/pay/[slug]/_components/unit-confirmation.tsx

import styles from "./unit-confirmation.module.css";

interface UnitConfirmationProps {
  estateName: string;
  collectionTitle: string;
  zoneName: string;
  unitLabel: string;
  residentName?: string | null;
}

export function UnitConfirmation({
  estateName,
  collectionTitle,
  zoneName,
  unitLabel,
  residentName,
}: UnitConfirmationProps) {
  return (
    <section className={styles.card} aria-labelledby="confirm-unit-heading">
      <p className={styles.kicker}>{estateName}</p>

      <h2 id="confirm-unit-heading" className={styles.title}>
        Confirm your unit
      </h2>

      <dl className={styles.list}>
        <div className={styles.row}>
          <dt>Collection</dt>
          <dd>{collectionTitle}</dd>
        </div>

        <div className={styles.row}>
          <dt>Zone</dt>
          <dd>{zoneName}</dd>
        </div>

        <div className={styles.row}>
          <dt>Unit</dt>
          <dd>{unitLabel}</dd>
        </div>

        <div className={styles.row}>
          <dt>Resident name</dt>
          <dd>{residentName || "No resident name on file"}</dd>
        </div>
      </dl>

      {!residentName && (
        <p className={styles.warning} role="note">
          Please confirm this is your unit before paying.
        </p>
      )}
    </section>
  );
}
```

```css
/* app/pay/[slug]/_components/unit-confirmation.module.css */

.card {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-outline);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.kicker {
  margin: 0;
  font-size: var(--typography-text-sm-font-size);
  line-height: var(--typography-text-sm-line-height);
  color: var(--color-on-surface-variant);
}

.title {
  margin: 0;
  font-size: var(--typography-title-lg-font-size);
  line-height: var(--typography-title-lg-line-height);
  color: var(--color-on-surface);
}

.list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  border-bottom: 1px solid var(--color-outline-variant);
  padding-bottom: var(--space-2);
}

.row dt {
  color: var(--color-on-surface-variant);
}

.row dd {
  margin: 0;
  text-align: right;
  font-weight: 600;
  color: var(--color-on-surface);
}

.warning {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-warning-container);
  color: var(--color-on-warning-container);
}
```

---

### 3. Pay dues button

Payment-adjacent buttons must prevent double-submit.

```tsx
// app/pay/[slug]/_components/pay-dues-button.tsx

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import styles from "./pay-dues-button.module.css";

interface PayDuesButtonProps {
  onPay: () => Promise<void>;
  disabled?: boolean;
  label?: string;
}

export function PayDuesButton({
  onPay,
  disabled = false,
  label = "Pay dues",
}: PayDuesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (isLoading || disabled) return;

    setIsLoading(true);

    try {
      await onPay();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading || disabled}
      className={styles.button}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className={styles.spinner} aria-hidden="true" />
          <span>Redirecting to payment...</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
```

```css
/* app/pay/[slug]/_components/pay-dues-button.module.css */

.button {
  width: 100%;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-family: var(--typography-text-md-font-family);
  font-size: var(--typography-text-md-font-size);
  font-weight: 700;
  cursor: pointer;
  padding: var(--space-3) var(--space-4);
}

.button:hover {
  opacity: 0.92;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
```

---

### 4. Payment status badge

Never communicate status by color alone.

```tsx
// components/payment-status-badge.tsx

import styles from "./payment-status-badge.module.css";

type PaymentStatus = "pending" | "success" | "failed" | "offline";

const statusLabel: Record<PaymentStatus, string> = {
  pending: "Pending",
  success: "Paid",
  failed: "Failed",
  offline: "Recorded offline",
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      <span className={styles.dot} aria-hidden="true" />
      <span>{statusLabel[status]}</span>
    </span>
  );
}
```

```css
/* components/payment-status-badge.module.css */

.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 28px;
  border-radius: 999px;
  padding: 0 var(--space-3);
  font-size: var(--typography-text-sm-font-size);
  line-height: var(--typography-text-sm-line-height);
  font-weight: 600;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

.pending {
  background: var(--color-warning-container);
  color: var(--color-on-warning-container);
}

.success {
  background: var(--color-success-container);
  color: var(--color-on-success-container);
}

.failed {
  background: var(--color-error-container);
  color: var(--color-on-error-container);
}

.offline {
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
}
```

---

### 5. Copy collection link button

Use native share when available. Fall back to clipboard.

```tsx
// components/copy-collection-link-button.tsx

"use client";

import { useState } from "react";
import styles from "./copy-collection-link-button.module.css";

interface CopyCollectionLinkButtonProps {
  url: string;
  title: string;
}

export function CopyCollectionLinkButton({
  url,
  title,
}: CopyCollectionLinkButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title,
        text: `Pay your estate dues for ${title}`,
        url,
      });

      setStatus("shared");
      return;
    }

    await navigator.clipboard.writeText(url);
    setStatus("copied");
  }

  return (
    <button type="button" onClick={handleShare} className={styles.button}>
      {status === "copied"
        ? "Copied"
        : status === "shared"
          ? "Shared"
          : "Share collection link"}
    </button>
  );
}
```

```css
/* components/copy-collection-link-button.module.css */

.button {
  min-height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline);
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-weight: 600;
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
}
```

---

### 6. WhatsApp reminder button

Do not imply Duesly sends the message automatically if it only opens WhatsApp.

Use:

```txt
Remind on WhatsApp
```

Not:

```txt
Send reminder
```

```tsx
// components/whatsapp-reminder-button.tsx

import styles from "./whatsapp-reminder-button.module.css";

interface WhatsAppReminderButtonProps {
  phone?: string | null;
  collectionTitle: string;
  paymentLink: string;
}

export function WhatsAppReminderButton({
  phone,
  collectionTitle,
  paymentLink,
}: WhatsAppReminderButtonProps) {
  if (!phone) {
    return (
      <span className={styles.noContact}>
        No phone on record
      </span>
    );
  }

  const message = encodeURIComponent(
    `Hello, this is a reminder that your estate dues for ${collectionTitle} are still pending. Please use this link to pay: ${paymentLink}`
  );

  const href = `https://wa.me/${phone}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={styles.button}
    >
      Remind on WhatsApp
    </a>
  );
}
```

```css
/* components/whatsapp-reminder-button.module.css */

.button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 700;
  text-decoration: none;
  padding: var(--space-3) var(--space-4);
}

.noContact {
  color: var(--color-on-surface-variant);
  font-size: var(--typography-text-sm-font-size);
}
```

---

## Duesly-Specific Component Patterns

### Public payment flow components

Split the public payment page into focused components:

```txt
CollectionHeader
ZoneSelect
UnitSelect
UnitConfirmation
PaymentSummary
PayDuesButton
CantFindUnitNotice
SecurePaymentNote
PaymentStatusMessage
```

Rules:

* Zone selection comes before unit selection
* Unit list must be scoped to the selected zone
* Unit confirmation must appear before payment
* CTA is disabled until a valid unit is selected
* If collection is closed, disable payment and show a closed-state message
* If unit has already paid, show already-paid state instead of payment CTA
* If unit is inactive or exempt, do not allow payment unless backend explicitly supports it

---

### Dashboard components

Split the collection dashboard into focused components:

```txt
CollectionSummaryCards
CollectionProgress
PaidOwingTabs
ZoneFilter
PaidUnitsTable
OwingUnitsTable
OfflinePaymentModal
ReminderActions
DefaultersExportButton
CopyCollectionLinkButton
```

Rules:

* Summary comes before tables
* Owing list must be filterable by zone
* Paid and owing counts must be visually clear
* Empty owing state should celebrate completion
* Empty paid state should guide the treasurer to share the collection link
* Offline payment modal must clearly show unit, collection, and amount before submission
* Reminder action must not imply automatic sending when it only opens WhatsApp

---

### CSV roster import components

Split roster import into:

```txt
RosterUploadDropzone
RosterColumnGuide
RosterImportPreview
RosterImportIssueList
RosterImportSummary
RosterImportCommitButton
```

Rules:

* Show expected columns before upload
* Show preview before commit
* Show “will add” and “will update” counts
* Flag missing zone
* Flag missing unit
* Flag invalid email
* Flag duplicate rows
* Allow treasurer to skip bad rows or fix them before import
* Do not import immediately after file selection
* Show clear success state after import

---

### Roster management components

Use focused components:

```txt
UnitList
UnitSearch
UnitStatusBadge
EditUnitModal
DeactivateUnitDialog
AddUnitForm
```

Rules:

* Unit label is required
* Zone is required
* Resident name is optional
* Phone numbers are optional
* Email is optional
* Deactivation requires confirmation
* Deactivated units should be visually distinct
* Deactivated units should be excluded from normal billable lists unless requested
* Editing a unit must not hide or delete historical payment records

---

### Reminder and enforcement support

Use focused components:

```txt
WhatsAppReminderButton
EmailReminderButton
ReminderPreview
DefaultersExportButton
DefaultersList
```

Rules:

* WhatsApp reminder opens a prefilled WhatsApp deep link
* Phone numbers must not be shown publicly
* If no phone exists, show “No phone on record”
* Email reminder is disabled if no email exists
* Defaulters export should say it includes owing units only
* Do not claim Duesly controls the gate or visitor-call service in MVP

---

## State Coverage

Every component must cover relevant states.

| State            | Required behavior                                |
| ---------------- | ------------------------------------------------ |
| Default          | Happy path                                       |
| Loading          | Skeleton for content, spinner for actions        |
| Empty            | Friendly message plus next action                |
| Error            | Plain-language message plus recovery             |
| Disabled         | Visually distinct and inaccessible to click      |
| Success          | Confirmation toast, banner, or screen            |
| Failed           | Retry or next instruction                        |
| Already paid     | Explain that the unit has already paid           |
| Closed           | Explain collection is closed and disable payment |
| Not found        | Invalid collection link or missing unit          |
| Validation       | Inline error near the field                      |
| Partial data     | Handle missing resident name, phone, or email    |
| Offline recorded | Show payment was recorded manually               |
| No contact       | Show reminder cannot be sent automatically       |

If a component can enter a state and that state has no UI, the component is not done.

---

## Forms

All forms must use:

* Real labels above inputs
* Inline validation
* Clear error text
* Correct `inputMode`
* Disabled submit state while submitting
* Non-destructive error banner for server errors
* Preserved values after validation failure
* Zod schema shared with the server where practical

---

### Collection creation form

Fields:

* Collection title
* Amount in Naira
* Due date
* Optional note or description

Rules:

* User enters Naira
* Convert to Kobo before submission
* Show amount preview
* Submit button is full-width on mobile
* Do not allow zero or negative amounts

```tsx
// app/dashboard/collections/_components/create-collection-form.tsx

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styles from "./create-collection-form.module.css";

const CreateCollectionSchema = z.object({
  title: z.string().min(1, "Collection title is required").max(120),
  amountNaira: z.coerce.number().positive("Amount must be greater than zero"),
  dueDate: z.string().optional(),
});

type CreateCollectionFormData = z.infer<typeof CreateCollectionSchema>;

interface CreateCollectionFormProps {
  onSubmit: (data: {
    title: string;
    amountKobo: number;
    dueDate?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function CreateCollectionForm({ onSubmit }: CreateCollectionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateCollectionFormData>({
    resolver: zodResolver(CreateCollectionSchema),
  });

  const amountNaira = watch("amountNaira");
  const amountKobo = Math.round(Number(amountNaira || 0) * 100);

  async function handleCreate(data: CreateCollectionFormData) {
    const result = await onSubmit({
      title: data.title,
      amountKobo: Math.round(data.amountNaira * 100),
      dueDate: data.dueDate,
    });

    if (!result.ok) {
      setError("root", {
        message: result.error || "Could not create collection",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(handleCreate)} className={styles.form}>
      {errors.root && (
        <div className={styles.banner} role="alert">
          {errors.root.message}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="title">Collection title</label>
        <input
          id="title"
          type="text"
          {...register("title")}
          className={errors.title ? styles.inputError : styles.input}
        />
        {errors.title && (
          <span className={styles.error} role="alert">
            {errors.title.message}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="amountNaira">Amount</label>
        <div className={styles.amountInput}>
          <span aria-hidden="true">₦</span>
          <input
            id="amountNaira"
            type="text"
            inputMode="decimal"
            {...register("amountNaira")}
            className={errors.amountNaira ? styles.inputError : styles.input}
          />
        </div>
        {errors.amountNaira && (
          <span className={styles.error} role="alert">
            {errors.amountNaira.message}
          </span>
        )}
      </div>

      <div className={styles.preview}>
        Amount to collect: <strong>{amountKobo > 0 ? amountKobo : 0} kobo</strong>
      </div>

      <div className={styles.field}>
        <label htmlFor="dueDate">Due date</label>
        <input
          id="dueDate"
          type="date"
          {...register("dueDate")}
          className={styles.input}
        />
      </div>

      <button type="submit" disabled={isSubmitting} className={styles.submit}>
        {isSubmitting ? "Creating..." : "Create collection"}
      </button>
    </form>
  );
}
```

---

### Offline payment form

Rules:

* Pre-fill amount from collection
* If amount differs from collection amount, require a note
* Show duplicate-paid warning if the unit already paid
* Confirm before recording

```tsx
// app/dashboard/collections/[id]/_components/offline-payment-form.tsx

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatNaira } from "@/lib/money";
import styles from "./offline-payment-form.module.css";

const OfflinePaymentSchema = z.object({
  unitId: z.string().min(1, "Select a unit"),
  amountNaira: z.coerce.number().positive("Enter a valid amount"),
  paidAt: z.string().min(1, "Payment date is required"),
  method: z.enum(["cash", "bank_transfer", "pos", "other"]),
  note: z.string().optional(),
});

type OfflinePaymentFormData = z.infer<typeof OfflinePaymentSchema>;

interface OfflinePaymentFormProps {
  collectionAmountKobo: number;
  units: Array<{
    id: string;
    label: string;
    residentName?: string | null;
    hasPaid: boolean;
  }>;
  onSubmit: (data: {
    unitId: string;
    amountKobo: number;
    paidAt: string;
    method: string;
    note?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function OfflinePaymentForm({
  collectionAmountKobo,
  units,
  onSubmit,
}: OfflinePaymentFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OfflinePaymentFormData>({
    resolver: zodResolver(OfflinePaymentSchema),
    defaultValues: {
      amountNaira: collectionAmountKobo / 100,
    },
  });

  const selectedUnitId = watch("unitId");
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId);

  async function handleRecord(data: OfflinePaymentFormData) {
    if (selectedUnit?.hasPaid) {
      setError("unitId", {
        message: "This unit has already paid for this collection",
      });
      return;
    }

    const amountKobo = Math.round(data.amountNaira * 100);

    if (amountKobo !== collectionAmountKobo && !data.note) {
      setError("note", {
        message: "Add a note explaining why this amount is different",
      });
      return;
    }

    const result = await onSubmit({
      unitId: data.unitId,
      amountKobo,
      paidAt: data.paidAt,
      method: data.method,
      note: data.note,
    });

    if (!result.ok) {
      setError("root", {
        message: result.error || "Could not record offline payment",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(handleRecord)} className={styles.form}>
      {errors.root && (
        <div className={styles.banner} role="alert">
          {errors.root.message}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="unitId">Unit</label>
        <select id="unitId" {...register("unitId")} className={styles.input}>
          <option value="">Select unit</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.label}
              {unit.residentName ? ` — ${unit.residentName}` : ""}
              {unit.hasPaid ? " — already paid" : ""}
            </option>
          ))}
        </select>
        {errors.unitId && (
          <span className={styles.error} role="alert">
            {errors.unitId.message}
          </span>
        )}
      </div>

      <p className={styles.expectedAmount}>
        Expected amount: {formatNaira(collectionAmountKobo)}
      </p>

      <div className={styles.field}>
        <label htmlFor="amountNaira">Amount paid</label>
        <input
          id="amountNaira"
          type="text"
          inputMode="decimal"
          {...register("amountNaira")}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="paidAt">Payment date</label>
        <input
          id="paidAt"
          type="date"
          {...register("paidAt")}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="method">Payment method</label>
        <select id="method" {...register("method")} className={styles.input}>
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="pos">POS</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="note">Note</label>
        <textarea id="note" rows={3} {...register("note")} />
        {errors.note && (
          <span className={styles.error} role="alert">
            {errors.note.message}
          </span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className={styles.submit}>
        {isSubmitting ? "Recording..." : "Record offline payment"}
      </button>
    </form>
  );
}
```

---

## Accessibility Rules

Components must support mobile-first, in-app browser usage.

Rules:

* Use semantic HTML
* Use real `<button>` for actions
* Use real `<a>` for links
* Use `<label>` for inputs
* Use `aria-describedby` for errors and helper text
* Use `role="alert"` for validation and payment errors
* Keep visible focus states
* Minimum tap target is `44px`
* Never communicate status by color alone
* Use WCAG AA contrast
* Respect `prefers-reduced-motion`
* Do not trap users in modals without escape or close behavior
* Tables must be readable on mobile or converted into accessible stacked cards

---

## Data Privacy Rules for Components

Duesly handles resident personal data.

Public components must not expose:

* Phone numbers
* Email addresses
* Full roster lists
* Admin details
* Payment logs
* Internal IDs
* Gateway payloads

Public components may show:

* Estate name
* Collection title
* Zone names
* Unit label
* Resident name for selected unit confirmation
* Amount
* Due date
* Payment status for the selected unit only

Dashboard components may show resident contact details only to authenticated and authorized users.

---

## Testing Conventions

Write tests for components that contain logic.

Test:

* Default state
* Loading state
* Empty state
* Error state
* Disabled state
* Success state
* Validation errors
* Already-paid state
* Closed-collection state
* Async click behavior
* Accessible labels
* Keyboard interaction where relevant

Use Vitest and React Testing Library if the project is configured for them.

Test file naming:

```txt
component-name.test.tsx
```

Example:

```tsx
// app/pay/[slug]/_components/pay-dues-button.test.tsx

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PayDuesButton } from "./pay-dues-button";

describe("PayDuesButton", () => {
  it("renders the default label", () => {
    render(<PayDuesButton onPay={async () => {}} />);

    expect(
      screen.getByRole("button", { name: /pay dues/i })
    ).toBeInTheDocument();
  });

  it("shows loading state after click", async () => {
    const user = userEvent.setup();

    render(
      <PayDuesButton
        onPay={async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: /pay dues/i }));

    expect(screen.getByText(/redirecting to payment/i)).toBeInTheDocument();
  });

  it("does not allow click when disabled", async () => {
    const user = userEvent.setup();
    const onPay = vi.fn();

    render(<PayDuesButton onPay={onPay} disabled />);

    await user.click(screen.getByRole("button"));

    expect(onPay).not.toHaveBeenCalled();
  });
});
```

Do not test pure styling. Test behavior and accessible output.

---

## Checklist Before Done

* [ ] Correct Duesly surface rules followed
* [ ] Relevant `.agent` files loaded
* [ ] Server vs client component choice is correct
* [ ] Component has typed props
* [ ] No `any`
* [ ] Uses design tokens, not hardcoded styling
* [ ] Uses the styling method defined in `design-system.md`
* [ ] Mobile-first layout
* [ ] Tap targets are at least `44px`
* [ ] Public payment page is fast and lightweight
* [ ] Public payment flow confirms zone, unit, and resident name before payment
* [ ] Amount is displayed from server-provided `amountKobo`
* [ ] No client-side amount calculation except display formatting
* [ ] Payment-adjacent actions prevent double-submit
* [ ] Dashboard components include loading, empty, error, and success states
* [ ] CSV import has preview before commit
* [ ] Roster import shows add/update counts and row issues
* [ ] Owing list supports zone filtering
* [ ] Offline payment recording clearly shows unit, amount, and duplicate-paid state
* [ ] WhatsApp reminder wording does not imply automatic sending
* [ ] Public components do not expose phone, email, full roster, or admin data
* [ ] Uses semantic HTML and accessible labels
* [ ] Status is not communicated by color alone
* [ ] Error boundaries, loading states, and not-found screens exist where needed
* [ ] Tests cover meaningful component logic and states
* [ ] `npm run lint` passes
