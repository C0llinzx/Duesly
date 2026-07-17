---
trigger: always_on
---

# Rule: Payment Safety — Invariants

> Placement: `.agent/rules/`
> These invariants govern ALL payment code. They are non-negotiable and outrank UI convenience. Full detail: `docs/specs/payment/Duesly_Payment_Flow_Spec.md`.

## The one mental model to hold

**The browser flow and the money flow are two separate paths.**

- **Browser flow:** resident taps Pay → redirects to the gateway → pays → redirects back to the return page.
- **Money flow:** the gateway's **webhook** hits the server → the server **re-verifies** with the gateway → the payment is recorded.

The resident's browser coming back is **not** proof of payment. They may close the tab, lose signal, or a bad actor may hit the callback URL directly. A payment is real only when the **verified webhook** says so. The return page *displays* status; the webhook *records* it. Every other rule follows from this split.

---

## Invariants (never violate, any gateway)

1. **Amount is server-authoritative.** The charge amount always comes from the levy's per-house figure on the server. Never accept an amount from the client, URL, or form. A tampered client cannot change what's charged or what's owed.
2. **Currency subunits.** Providers transact in the currency's minor unit (Paystack: kobo; Flutterwave: naira as a decimal — confirm per gateway in its adapter). Convert on init, convert back on read, and unit-test the conversion. This is the single most common numeric bug.
3. **Record on webhook, not on callback.** The browser return/callback page only DISPLAYS status. The verified webhook is the sole source of truth for recording. An abandoned redirect must not lose a payment; a forged callback must not fake one.
4. **Verify before recording.** On webhook, re-fetch the transaction from the gateway's verify endpoint and confirm status = success AND amount matches the expected levy amount before writing anything. Never trust the webhook payload alone.
5. **Idempotent.** The same transaction reference records at most once. Gateways retry and duplicate webhooks; a repeat must be a no-op that returns 200.
6. **Gateway-agnostic.** All gateway interaction goes through the `PaymentGateway` interface (`initialize`, `verify`, `verifyWebhookSignature`). Routes never import a provider SDK directly. Switching providers = implement the interface + register in the factory + flip `PAYMENT_GATEWAY`.
7. **No PII exposure.** The public pay page reveals only the confirming resident's own name (as confirmation) and their single due. No directory, no other houses, no third-party phone/email.
8. **Honest states.** Every error tells the resident what happened, whether money moved, and what to do next. No bare "Something went wrong". No dead ends — always a retry path.
