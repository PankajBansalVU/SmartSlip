# Testing Stripe Webhooks - Step by Step

## Current Status
✅ webhook.routes.js has been fixed (proper router export)
✅ server.js correctly configured with express.raw() before express.json()
✅ Stripe webhook secret is in .env

## Test Steps

### 1. Restart Backend Server
```bash
cd backend
npm start
```

**Expected output:**
```
Server running on port 3000
⚠ WARNING: STRIPE_WEBHOOK_SECRET is not set... (if not configured)
```

### 2. Start Stripe CLI (in a NEW terminal)
```bash
stripe listen --forward-to localhost:3000/api/webhooks/webhook
```

**Expected output:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**IMPORTANT:** The webhook secret should match what's in your `backend/.env` file:
```
STRIPE_WEBHOOK_SECRET=whsec_aafec132d36ee449fd11ec309fa1641776add593ce919e107cb4c9e10076c8a2
```

### 3. Test the Webhook Manually
In another terminal, trigger a test event:
```bash
stripe trigger checkout.session.completed
```

**What to watch for:**
- Stripe CLI terminal should show: `✔ Received event checkout.session.completed`
- Backend server terminal should show: `Checkout session completed: cs_test_xxxxx`

### 4. Make a Real Test Purchase

1. Start frontend:
```bash
cd receipt-scanner
npm start
```

2. Login to your account
3. Go to Pricing page
4. Click "Subscribe Now" for Premium
5. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)

### 5. Monitor the Webhooks

**In Stripe CLI terminal, you should see:**
```
2025-01-23 ... --> checkout.session.completed [evt_xxx]
2025-01-23 ... <-- [200] POST localhost:3000/api/webhooks/webhook [evt_xxx]
```

**In Backend server terminal, you should see:**
```
Checkout session completed: cs_test_xxxxxxxxxxxxx
User 1 subscribed successfully
```

### 6. Verify Database Updated

Check your database:
```sql
SELECT
    user_id,
    email,
    subscription_tier,
    subscription_status,
    stripe_customer_id,
    stripe_subscription_id
FROM users
WHERE email = 'your@email.com';
```

**Expected result:**
- subscription_tier: `premium`
- subscription_status: `active`
- stripe_customer_id: `cus_xxxxx`
- stripe_subscription_id: `sub_xxxxx`

### 7. Verify in Frontend

1. Go to Profile page
2. Should show "Premium" badge
3. Should show subscription details
4. Pricing page should show "Current Plan" badge

---

## Troubleshooting

### Error: "Webhook signature verification failed"
**Cause:** Webhook secret mismatch
**Fix:** Copy the secret from Stripe CLI output and update `backend/.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```
Then restart backend.

### Error: "POST /api/webhooks/webhook 404"
**Cause:** Stripe CLI forwarding to wrong path
**Fix:** Ensure Stripe CLI command is:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/webhook
```

### Error: "Webhook payload must be provided as a string or a Buffer"
**Cause:** Body being parsed as JSON before webhook handler
**Fix:** This should be fixed now! But if it persists:
1. Verify `express.raw()` is BEFORE `express.json()` in server.js
2. Restart backend server
3. Check no other middleware is parsing body

### Database not updating after successful webhook
**Check:**
1. Backend logs for any SQL errors
2. User ID is in session metadata: `console.log('userId:', session.metadata.userId)`
3. Database connection is working

---

## Quick Test Command

To quickly test if webhooks are working:
```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/webhook

# Terminal 3 - Trigger test
stripe trigger checkout.session.completed
```

---

## What Should Happen (End-to-End)

1. User clicks "Subscribe Now" → Frontend redirects to Stripe Checkout
2. User enters test card `4242 4242 4242 4242` → Payment succeeds
3. Stripe redirects back to `/payment/success` page
4. **Meanwhile, Stripe sends webhook to your backend**
5. Webhook handler receives `checkout.session.completed` event
6. Backend updates database: user becomes premium
7. User goes to Profile → Sees Premium badge
8. User can upload unlimited receipts

---

## Current Configuration Summary

- **Webhook endpoint:** `POST /api/webhooks/webhook`
- **Stripe CLI forwarding:** `localhost:3000/api/webhooks/webhook`
- **Webhook secret:** In `backend/.env` as `STRIPE_WEBHOOK_SECRET`
- **Middleware order:** ✅ express.raw() before express.json()
- **Router export:** ✅ Fixed in webhook.routes.js

**You're ready to test!** Follow the steps above.
