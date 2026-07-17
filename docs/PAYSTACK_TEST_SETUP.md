# Paystack Local Test Setup

Paystack **cannot** reach `localhost`. Without a tunnel, the payment succeeds on Paystack's side but the webhook never arrives — the app never records it. This is expected, not a bug.

## Step 1 — Set test keys

In `.env` (or `.env.local`):

```
PAYMENT_GATEWAY="paystack"
PAYSTACK_SECRET_KEY="sk_test_..."
PAYSTACK_PUBLIC_KEY="pk_test_..."
APP_URL="http://localhost:3000"
```

Get test keys from [Paystack Dashboard → Settings → API Keys](https://dashboard.paystack.com/settings/developers/apikeys).

## Step 2 — Start a tunnel

Install ngrok (or any TCP tunnel), then:

```bash
ngrok http 3000
```

Copy the `https://xxxx.ngrok-free.app` URL from the output.

## Step 3 — Register the webhook URL

1. Go to [Paystack Dashboard → Settings → Webhooks](https://dashboard.paystack.com/settings/developers/webhooks).
2. Set the **Webhook URL** to:
   ```
   https://xxxx.ngrok-free.app/api/webhooks/payment
   ```
3. Save. Paystack will send a verification ping — ngrok must be running.

## Step 4 — Test a payment

1. Start the app: `npm run dev`
2. Open a levy's share link (e.g. `http://localhost:3000/pay/<slug>`)
3. Select a house → confirm → tap **Pay**
4. On the Paystack checkout, use the test card:
   - **Card:** `4187 4274 1556 4246`
   - **Expiry:** any future date
   - **CVV:** `827`
   - **PIN:** `0000`
5. Complete the payment. Paystack redirects back to the receipt page.
6. The receipt page polls for status. The webhook should arrive within seconds and confirm the payment.

## What to verify

| Check | Expected |
|---|---|
| Receipt page shows "Payment confirmed" | After webhook arrives |
| Payment record in DB: `status = "success"` | Written by webhook |
| Unit is payable only once | Duplicate reference → no-op |
| Duplicate webhook hit | 200, no duplicate record |
| Bad signature hit | 401 |
| Amount mismatch (manual test) | Logged, not recorded |

## Troubleshooting

- **Payment succeeds on Paystack but receipt stays "Confirming…"**: The webhook isn't reaching your server. Check: (1) ngrok is running, (2) webhook URL is registered in Paystack dashboard, (3) the URL ends with `/api/webhooks/payment`.
- **"Invalid signature" in logs**: The webhook body was pre-parsed. The route uses `export const runtime = "nodejs"` and reads the raw body with `request.text()` — this should not happen. Check Next.js config isn't intercepting the body.
- **Init fails with "Something went wrong"**: Check `PAYSTACK_SECRET_KEY` is set and starts with `sk_test_`.
