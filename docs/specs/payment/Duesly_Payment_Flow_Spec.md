# Duesly — Payment Flow Spec (gateway-agnostic)

The durable, money-critical rules for online payment collection. This spec is **gateway-neutral**: the invariants and flow apply to any provider (Paystack today, Flutterwave next) behind the existing `PaymentGateway` interface. When you add a gateway, it inherits these rules — do not reimplement them per provider.

**Precedence:** where anything in a prompt or another spec conflicts with this document, this document wins. Payment correctness is not negotiable for UI convenience.

---

## 0. The one mental model to hold

**The browser flow and the money flow are two separate paths.**

- **Browser flow:** resident taps Pay → redirects to the gateway → pays → redirects back to the return page.
- **Money flow:** the gateway's **webhook** hits the server → the server **re-verifies** with the gateway → the payment is recorded.

The resident's browser coming back is **not** proof of payment. They may close the tab, lose signal, or a bad actor may hit the callback URL directly. A payment is real only when the **verified webhook** says so. The return page *displays* status; the webhook *records* it. Every other rule follows from this split.

---

## 1. Invariants (never violate, any gateway)

1. **Amount is server-authoritative.** The charge amount always comes from the levy's per-house figure on the server. Never accept an amount from the client, URL, or form. A tampered client cannot change what's charged or what's owed.
2. **Currency subunits.** Providers transact in the currency's minor unit (Paystack: kobo; Flutterwave: naira as a decimal — confirm per gateway in its adapter). Convert on init, convert back on read, and unit-test the conversion. This is the single most common numeric bug.
3. **Record on webhook, not on callback.** The browser return/callback page only DISPLAYS status. The verified webhook is the sole source of truth for recording. An abandoned redirect must not lose a payment; a forged callback must not fake one.
4. **Verify before recording.** On webhook, re-fetch the transaction from the gateway's verify endpoint and confirm status = success AND amount matches the expected levy amount before writing anything. Never trust the webhook payload alone.
5. **Idempotent.** The same transaction reference records at most once. Gateways retry and duplicate webhooks; a repeat must be a no-op that returns 200.
6. **Gateway-agnostic.** All gateway interaction goes through the `PaymentGateway` interface (`initialize`, `verify`, `verifyWebhookSignature`). Routes never import a provider SDK directly. Switching providers = implement the interface + register in the factory + flip `PAYMENT_GATEWAY`.
7. **No PII exposure.** The public pay page reveals only the confirming resident's own name (as confirmation) and their single due. No directory, no other houses, no third-party phone/email.
8. **Honest states.** Every error tells the resident what happened, whether money moved, and what to do next. No bare "Something went wrong". No dead ends — always a retry path.

---

## 2. The `PaymentGateway` interface

Every provider adapter implements the same surface, so the flow code is provider-blind:

- `initialize({ amountMinor, currency, reference, email, metadata, callbackUrl })` → `{ authorizationUrl }`
- `verify(reference)` → `{ status, amountMinor, currency, raw }`
- `verifyWebhookSignature(rawBody, headers)` → `boolean`
- `parseWebhookEvent(rawBody)` → `{ type, reference, ... }`

The factory returns the adapter named by `PAYMENT_GATEWAY`. Flow logic (init route, webhook handler, return page) calls only these methods — never `paystack.*` or `flutterwave.*` directly.

---

## 3. Flow

### Initialize (server)
- Pay action calls `gateway.initialize()`.
- Amount = server levy per-house figure → minor unit. Reference = unique per attempt (`duesly_{unitId}_{levyId}_{ts}_{rand}`), persisted with status `pending` and metadata `{ estateId, levyId, unitId }`.
- Email: use the house's email on file; if absent, collect one at the pay step (required for the receipt).
- Redirect to `authorizationUrl`; `callbackUrl` → the return page.
- On init failure: specific, honest message + Retry; log the real error server-side; reassure the resident they were **not** charged.

### Webhook (server — most critical)
- Dedicated endpoint. The **raw request body** must be available (disable auto body-parsing on this route) so the signature can be computed.
- **Signature:** `gateway.verifyWebhookSignature(rawBody, headers)`; reject `401` if invalid.
- On a success event:
  1. **Idempotency** — if a Payment exists for this reference (or the unit is already paid for this levy) → `200`, no-op.
  2. **Verify** — `gateway.verify(reference)`; confirm success AND amount matches the expected minor-unit amount. Mismatch → do NOT record; log for review.
  3. **Record** — create a Payment: `method = online`, `gateway = <provider>`, reference, amount, `paidAt`. Online payments render visually distinct from offline everywhere.
  4. **Update** — flip the unit to paid for this levy; recompute levy + estate stats.
  5. **Log** — activity: "Payment received · House X · online".
- Return `200` quickly for handled events; do all work idempotently so retries are safe.

### Return page (browser — display only)
- Reads the reference; shows status by polling `verify` / the DB. **Never records.**
- SUCCESS → confirmation + amount + house.
- PENDING → "Confirming your payment…" with a light poll (the webhook may land shortly after redirect); resolves to success/failed.
- FAILED / ABANDONED → clear failure + "Try again" to the pay step; state plainly whether money moved.

### Edge cases
- Unit paid between page load and pay → block, show already-paid.
- Levy closed mid-flow → stop, explain.
- Gateway/network error on init → surface, don't hang.
- Reference reuse → blocked by idempotency.

---

## 4. Config

- ENV per gateway: secret key, public key, and `PAYMENT_GATEWAY` selecting the active adapter. Test keys in all non-production environments.
- Generated public links + QR use the configurable base URL (production domain in prod), never `localhost`.
- The webhook URL must be registered in the provider dashboard for delivery.
- **Local testing:** providers can't reach `localhost`. Expose the webhook via a tunnel (e.g. ngrok) and register that URL, or webhooks silently never arrive — the payment succeeds on the provider's side but the app never records it. This looks like a bug but isn't; it's an unreachable webhook.

---

## 5. Switching gateways (Paystack → Flutterwave)

Because the flow is provider-blind, switching is contained:

1. Implement `FlutterwaveGateway` against the `PaymentGateway` interface — its own init call, verify endpoint, webhook signature scheme, and event parsing. Confirm Flutterwave's amount unit and map it to `amountMinor` correctly (this is the field most likely to differ from Paystack).
2. Register it in the gateway factory.
3. Set `PAYMENT_GATEWAY=flutterwave` and add its ENV keys.
4. Register the webhook URL in the Flutterwave dashboard.

Nothing in the init route, webhook handler, return page, or the invariants above changes. If you find yourself editing flow logic to switch gateways, the abstraction has leaked — push the provider-specific part back into the adapter instead.

Do **not** delete or disable the Paystack adapter when adding Flutterwave — keep both registered so you can flip back with one env var while testing.

---

## 6. Provider-specifics (fill in per adapter — keep out of flow code)

| Concern | Paystack | Flutterwave |
|---|---|---|
| Amount unit | kobo (naira ×100) | confirm in adapter (naira decimal) |
| Webhook signature | HMAC-SHA512 of raw body vs `x-paystack-signature` | confirm scheme + header in adapter |
| Verify endpoint | transaction verify by reference | transaction verify by id/reference |
| Success event | `charge.success` | confirm event name |

These belong only inside the respective adapter. Flow code must never branch on the provider name.

---

## 7. Money-correctness checklist (verify before calling it done)

- [ ] Charge amount sourced from the server levy figure, never the client
- [ ] Currency minor-unit conversion correct and unit-tested (both directions)
- [ ] Payment recorded ONLY by the verified webhook, never the browser callback
- [ ] Webhook re-verifies with the gateway before recording (status + amount)
- [ ] Webhook signature verified against the RAW body; invalid → 401
- [ ] Same reference records at most once; duplicate webhook is a 200 no-op
- [ ] All gateway calls go through the interface; no provider SDK in routes
- [ ] Pay page exposes no PII beyond the confirming resident's own name + due
- [ ] Every error state is honest (what happened, whether charged, what to do)
- [ ] Online payments render visually distinct from offline everywhere
- [ ] Links/QR use the public base URL, not localhost
- [ ] Webhook URL registered in the provider dashboard (and tunneled for local tests)
