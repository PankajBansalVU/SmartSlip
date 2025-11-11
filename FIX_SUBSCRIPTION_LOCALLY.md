# Fix: Subscription Not Updating Locally

## 🔍 Problem Identified

When you complete a Stripe checkout locally, the subscription **appears successful in Stripe** but **doesn't update in your database**.

**Root Cause:** Stripe webhooks cannot reach your localhost without Stripe CLI forwarding them.

---

## ✅ Solution 1: Quick Fix (Manual Update)

Run this script to manually update your subscription after payment:

```bash
cd backend
node test-webhook.js your-email@example.com
```

Replace `your-email@example.com` with the email you used to register.

**This will instantly make your account premium!**

---

## ✅ Solution 2: Proper Fix (Install Stripe CLI)

### Step 1: Install Stripe CLI

**Windows:**
```bash
# Download from: https://github.com/stripe/stripe-cli/releases/latest
# Or use Scoop:
scoop install stripe
```

### Step 2: Start Webhook Forwarding

```bash
# Terminal 1 - Backend (keep running)
cd backend
npm start

# Terminal 2 - Stripe CLI (keep running)
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/webhook
```

### Step 3: Copy Webhook Secret

When you run `stripe listen`, you'll see:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Copy that secret and update your `backend/.env` file:**
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Then restart your backend server.

### Step 4: Test

1. Go to http://localhost:3001/checkout
2. Click "Subscribe Now"
3. Use test card: `4242 4242 4242 4242`
4. Complete payment

**Watch your terminals:**
- Stripe CLI will show: `✓ Received event checkout.session.completed`
- Backend will show: `User X subscribed successfully`

---

## ✅ Solution 3: Development Test Endpoint (No Stripe CLI Needed)

I've added a test endpoint that bypasses webhook signature verification.

### Get Your Checkout Session ID

After completing payment, you'll be redirected to:
```
http://localhost:3001/payment/success?session_id=cs_test_xxxxxxxxxxxxx
```

**Copy that session_id.**

### Retrieve Session Data from Stripe

Use Stripe CLI or Dashboard to get the session details:

```bash
stripe checkout sessions retrieve cs_test_xxxxxxxxxxxxx
```

Or go to: https://dashboard.stripe.com/test/payments

### Send Manual Webhook

Use this curl command (replace values):

```bash
curl -X POST http://localhost:3000/api/webhooks/test-webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"checkout.session.completed\",\"data\":{\"object\":{\"id\":\"cs_test_xxx\",\"customer\":\"cus_xxx\",\"subscription\":\"sub_xxx\",\"metadata\":{\"userId\":\"1\"}}}}"
```

**Or use the quick script method (Solution 1)** - it's easier!

---

## 🧪 How to Verify It's Working

### Check Database

```sql
SELECT
    user_id,
    email,
    subscription_tier,
    subscription_status,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_start_date,
    subscription_end_date
FROM users
WHERE email = 'your-email@example.com';
```

**Expected Result:**
- `subscription_tier`: `premium`
- `subscription_status`: `active`
- `stripe_customer_id`: `cus_xxxxx`
- `stripe_subscription_id`: `sub_xxxxx`

### Check Frontend

1. Go to http://localhost:3001/profile
2. Should show **"Premium"** badge
3. Should show subscription details

---

## 🚀 Recommended Workflow

### For Quick Testing (Right Now):
```bash
cd backend
node test-webhook.js your-email@example.com
```

### For Proper Development:
1. Keep backend running: `cd backend && npm start`
2. Keep Stripe CLI running: `stripe listen --forward-to localhost:3000/api/webhooks/webhook`
3. Webhooks will automatically work!

---

## 📝 Notes

- **Solution 1** is for immediate testing - no setup required
- **Solution 2** is for proper webhook testing - mirrors production
- **Solution 3** is for manual webhook simulation - requires session data
- The test endpoint (`/test-webhook`) only works in development mode
- In production, webhooks will work automatically (no CLI needed)

---

## ❓ Still Not Working?

1. **Check backend is running:** Open http://localhost:3000
2. **Check user exists:** Query database for your email
3. **Check Stripe dashboard:** Verify payment succeeded
4. **Run test script:** `node test-webhook.js your-email@example.com`

This should immediately fix your subscription status!
