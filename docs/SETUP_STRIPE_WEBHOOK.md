# Setting Up Stripe Webhooks for Local Development

The webhook is what automatically upgrades users to premium when they pay. Currently, you need to manually update the database, but with webhooks configured, it will happen automatically.

## Option 1: Stripe CLI (Recommended for Local Dev)

### Step 1: Install Stripe CLI

**Windows:**
Download from: https://github.com/stripe/stripe-cli/releases/latest
- Download `stripe_X.X.X_windows_x86_64.zip`
- Extract and add to PATH

**Or use Scoop:**
```powershell
scoop install stripe
```

### Step 2: Login to Stripe
```bash
stripe login
```
This will open your browser to authenticate.

### Step 3: Forward Webhooks to Your Local Server
```bash
stripe listen --forward-to localhost:3000/api/payment/webhook
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### Step 4: Copy the Webhook Secret
Copy the `whsec_` secret and update `backend/.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 5: Restart Backend
```powershell
cd backend
npm start
```

### Step 6: Test It!
1. Make a test purchase
2. Watch the Stripe CLI terminal - you'll see webhook events
3. Check your database - user should automatically be upgraded to premium!

---

## Option 2: Manual Database Update (Quick Fix)

If you don't want to set up webhooks yet, just manually update the database after each test purchase:

```sql
UPDATE users
SET
    subscription_tier = 'premium',
    subscription_status = 'active',
    subscription_start_date = NOW(),
    subscription_end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH),
    stripe_subscription_id = 'sub_XXXXX'  -- Optional: get from Stripe Dashboard
WHERE email = 'your@email.com';
```

---

## Option 3: ngrok + Stripe Dashboard (For Production-like Testing)

### Step 1: Install ngrok
Download from: https://ngrok.com/download

### Step 2: Start ngrok
```bash
ngrok http 3000
```

You'll get a URL like: `https://abcd1234.ngrok.io`

### Step 3: Add Webhook in Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://abcd1234.ngrok.io/api/payment/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

### Step 4: Update backend/.env
```env
STRIPE_WEBHOOK_SECRET=whsec_your_real_webhook_secret
```

### Step 5: Restart Backend & Test
Now when you make a purchase, Stripe will send webhook events to your ngrok URL, which forwards to your local backend!

---

## Testing Webhooks

### Using Stripe CLI
```bash
# Trigger a specific event manually
stripe trigger checkout.session.completed

# View webhook logs
stripe logs tail
```

### Using Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/payments
2. Find your recent payment
3. Click on it
4. Scroll down to "Events and logs"
5. You should see webhook events

### Check Your Backend Logs
Your backend console should show:
```
Processing checkout session completed: cs_test_xxxxx
Updated user 1 to premium subscription
```

---

## Why Webhooks Are Important

Without webhooks:
- ✗ Manual database updates needed after each payment
- ✗ Users won't be upgraded automatically
- ✗ Subscription renewals won't work
- ✗ Cancellations won't be reflected

With webhooks:
- ✓ Automatic user upgrade after payment
- ✓ Subscription status stays in sync
- ✓ Renewals handled automatically
- ✓ Cancellations update database
- ✓ Failed payments trigger alerts

---

## Quick Start (Easiest Method)

**For now, just use manual SQL updates:**

1. User makes payment → Stripe checkout succeeds
2. You see "Welcome to Premium" page
3. Run this SQL:
```sql
UPDATE users
SET subscription_tier = 'premium',
    subscription_status = 'active',
    subscription_start_date = NOW(),
    subscription_end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
WHERE email = 'user@example.com';
```
4. User refreshes → Sees Premium in profile ✓

**Later, when deploying to production**, set up real webhooks in Stripe Dashboard pointing to your production domain.

---

## Troubleshooting

### "Webhook signature verification failed"
- Make sure `STRIPE_WEBHOOK_SECRET` is correct in `.env`
- Restart backend after changing `.env`
- Check Stripe CLI is forwarding to correct port

### "No webhook events received"
- Make sure Stripe CLI is running (`stripe listen`)
- Check backend is running on port 3000
- Verify ngrok URL matches webhook endpoint

### "Database not updating"
- Check backend console for errors
- Verify webhook handler functions exist
- Check database connection is working

---

## For Your Student Project

**Recommendation:** Just use manual SQL updates for now. It's:
- ✓ Simpler to set up
- ✓ Good enough for portfolio demos
- ✓ No need to keep Stripe CLI running

When you deploy to production or want to demo the full flow, set up webhooks using Option 1 (Stripe CLI).
