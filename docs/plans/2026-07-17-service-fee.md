# Plan: Service Fee on Online Payments

## Context

Duesly currently charges residents exactly the levy amount via Paystack. The requirement is to add a small, configurable service fee (resident-paid, on top of the levy) that is Duesly's revenue. The fee must be:
- Server-side configurable (not hardcoded in UI)
- Computed from the levy amount, never trusted from the client
- Stored separately on the Payment record for reporting
- Fully disclosed to residents before they tap Pay
- Disclosed to treasurers on the levy detail page

The payment flow spec (`docs/specs/payment/Duesly_Payment_Flow_Spec.md`) mandates: **amount is server-authoritative**, **record on webhook**, **verify before recording**, and **idempotent**. The fee does not change these invariants — it extends them.

---

## Money Invariants (fee-specific)

1. **Fee is computed server-side from the levy amount.** The client never sends or influences the fee.
2. **Total charged = levy amount + fee.** The amount sent to Paystack is the total. The total the resident approves on Paystack MUST match what was shown to them — no surprise.
3. **`amountKobo` on the Payment record = levy amount.** Estate-facing figures (Collected, Outstanding, stats) use this. Fees are tracked separately.
4. **`feeKobo` on the Payment record = service fee.** Duesly's revenue. Not shown as estate income.
5. **Webhook verification checks the total.** `verified.amount` must equal `payment.amountKobo + payment.feeKobo`. Mismatch → do NOT record.
6. **The house is marked paid for the LEVY amount.** The fee doesn't affect their due — they've paid their levy in full.

---

## Fee Configuration

**`src/lib/fees.ts`** (NEW file)

- Supports two modes: `percent` (e.g. 1%) or `flat` (e.g. ₦100 in kobo).
- Only one mode is active at a time. Env vars control which:
  - `SERVICE_FEE_PERCENT` — if set, fee = levy × percent / 100
  - `SERVICE_FEE_FLAT_KOBO` — if set, fee = flat amount in kobo
  - If both set, percentage wins.
  - If neither set, default = 1%.
- Exports: `calculateFee(amountKobo: number): number` (returns fee in kobo), `getFeeDisplay(): { label: string }` (returns human-readable description for the treasurer line).

**Env vars** — added to `src/lib/env.ts`, `.env`, `.env.example`:
- `SERVICE_FEE_PERCENT` (optional, e.g. "1")
- `SERVICE_FEE_FLAT_KOBO` (optional, e.g. "10000" for ₦100)

---

## Files to Modify

### 1. `prisma/schema.prisma` — Add fee field
- Add `feeKobo Int @default(0) @map("fee_kobo")` to the Payment model.
- `amountKobo` stays as the levy amount (unchanged).
- Run `npx prisma migrate dev --name add-fee-kobo`.

### 2. `src/lib/fees.ts` (NEW) — Fee calculation module
- `calculateFee(amountKobo: number): number` — returns fee in kobo.
- `getFeeDisplay()` — returns `{ type, label }` for UI and treasurer disclosure.

### 3. `src/lib/env.ts` — Add fee env vars
- Add `SERVICE_FEE_PERCENT: z.coerce.number().optional()` and `SERVICE_FEE_FLAT_KOBO: z.coerce.number().optional()`.

### 4. `.env` and `.env.example` — Add fee env vars
- Add `SERVICE_FEE_PERCENT=1` to `.env`.
- Add both vars with comments to `.env.example`.

### 5. `src/app/api/pay/init/route.ts` — Calculate fee, send total to Paystack
- After validation, compute `feeKobo = calculateFee(collection.amountKobo)`.
- Store `feeKobo` on the Payment record (both create and update paths).
- Send `amountKobo: collection.amountKobo + feeKobo` to `gateway.initPayment()`.
- Include `feeKobo` in the payment log metadata.

### 6. `src/app/api/webhooks/payment/route.ts` — Verify total amount
- Change amount check from `verified.amount !== payment.amountKobo` to `verified.amount !== (payment.amountKobo + payment.feeKobo)`.
- Update the mismatch log metadata to include both expected total and fee.
- The `sendSuccessEmails` function receives `feeKobo` for the receipt email.

### 7. `src/app/pay/[slug]/page.tsx` — Pass fee info to PayFlow
- Import `calculateFee` from `@/lib/fees`.
- Compute `feeKobo = calculateFee(collection.amountKobo)`.
- Pass `feeKobo` and `feeDisplay` (from `getFeeDisplay()`) as props to `<PayFlow>`.

### 8. `src/app/pay/[slug]/PayFlow.tsx` — Show itemised breakdown
- Accept new props: `feeKobo`, `feeDisplay`.
- On the "due" step, replace the single amount display with:
  ```
  Levy amount        ₦7,500
  Service fee        ₦75
  ──────────────────────────
  Total              ₦7,575
  ```
- Below the breakdown: "A small service fee helps keep Duesly running."
- Sticky pay button reads: `Pay ₦7,575` (the total).
- The `displayAmount` used for the button changes to the total.

### 9. `src/app/pay/[slug]/[unitId]/page.tsx` — Pass fee info to DirectPayFlow
- Same as #7 but for the direct pay page.

### 10. `src/app/pay/[slug]/[unitId]/DirectPayFlow.tsx` — Show itemised breakdown
- Accept new props: `feeKobo`, `feeDisplay`.
- Same breakdown UI as PayFlow.
- Button reads the total.

### 11. `src/app/pay/[slug]/receipt/page.tsx` — Pass feeKobo to ReceiptFlow
- Add `feeKobo` to the `initial` data object.

### 12. `src/app/pay/[slug]/ReceiptFlow.tsx` — Show total with fee
- Accept `feeKobo` in `PaymentData`.
- Show breakdown: levy amount, fee, total.
- The "Amount" line on the receipt shows the total charged.

### 13. `src/app/pay/[slug]/PayFlow.module.css` — Breakdown styles
- Add `.breakdown` (flex column, 12px gap).
- Add `.breakdownRow` (flex, space-between, 13px font).
- Add `.breakdownDivider` (1px border-top).
- Add `.breakdownTotal` (bold, 16px).
- Add `.breakdownNote` (12px, tertiary color, italic/quiet).
- Tokens only, spacing scale (4, 8, 12, 16, 24px).

### 14. `src/app/dashboard/collections/[id]/page.tsx` — Treasurer disclosure
- Import `getFeeDisplay` from `@/lib/fees`.
- Add a plain line below the levy detail hero section:
  "Residents pay a [X% / ₦X] service fee on each online payment. Your estate receives the full levy amount."

### 15. `src/lib/email.ts` — Update receipt email
- `paymentReceiptHtml`: Accept `feeKobo` param. Show total (levy + fee) as the amount. Add fee line.
- `paymentAlertHtml`: Keep showing levy amount (what estate receives). No change needed.

### 16. `src/app/api/dashboard/payments/route.ts` — Include fee in API
- Add `feeKobo: true` to the payment select.
- Include `feeKobo` in the JSON response.
- Add `Fee (₦)` column to CSV export.

---

## Files NOT Modified

- **`src/lib/payments/gateway.ts`** — The `InitPaymentParams.amountKobo` already accepts any amount. We just send the total instead of the levy. No interface change needed.
- **`src/lib/payments/paystack.ts`** — No changes. It sends whatever `amountKobo` it receives.
- **`src/lib/money.ts`** — No changes. `formatNaira` works with any kobo value.
- **Dashboard overview/levy pages** — Estate figures use `amountKobo` from Payment (levy amount). Fee is separate. No changes needed for estate stats.

---

## Verification

1. **Build**: `npx next build` — must pass with no errors.
2. **Prisma**: Migration runs cleanly. `npx prisma studio` — verify `fee_kobo` column exists on `payments` table.
3. **Manual test (pay flow)**:
   - Visit `/pay/[slug]`, go through steps. On the "due" step, verify the itemised breakdown shows: levy, fee, total.
   - Verify the Pay button shows the total.
   - Tap Pay → redirect to Paystack → verify Paystack shows the total amount.
   - Complete payment → verify receipt shows the total with breakdown.
4. **Webhook**: Verify the webhook amount check now validates against `amountKobo + feeKobo`. Check logs for any mismatches.
5. **Dashboard**: Visit levy detail page → verify the treasurer disclosure line is visible.
6. **Email**: Check the receipt email shows the total with fee breakdown.
7. **CSV export**: Verify the `Fee (₦)` column appears in the exported CSV.
