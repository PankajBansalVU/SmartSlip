# Quick Setup Checklist - Get Subscription Working NOW

You're seeing an empty checkout page because the database tables don't exist yet. Here's the quick fix:

## ✅ Step 1: Run Database Migration (5 minutes)

Open your MySQL client (e.g., MySQL Workbench, phpMyAdmin, or command line) and run:

```bash
# Option A: Command Line
mysql -u root -p receipt_analyzer < backend/config/migrations.sql

# Option B: Copy and paste the SQL
# Open backend/config/migrations.sql
# Copy all the contents
# Paste into MySQL Workbench or phpMyAdmin
# Execute
```

This will create:
- ✅ All subscription tables
- ✅ Seed 3 plans (Free, Premium Monthly $5, Premium Annual $48)
- ✅ Update users table with subscription columns

## ✅ Step 2: Set Temporary Stripe Keys (2 minutes)

For now, just to see the checkout page work, add dummy values to `backend/.env`:

```env
# Add these lines to backend/.env
STRIPE_SECRET_KEY=sk_test_dummy_for_now
STRIPE_PUBLISHABLE_KEY=pk_test_dummy_for_now
STRIPE_WEBHOOK_SECRET=whsec_dummy_for_now
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_monthly_dummy
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_annual_dummy
```

And to `receipt-scanner/.env`:

```env
# Add this line to receipt-scanner/.env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_dummy_for_now
```

## ✅ Step 3: Restart Your Servers (1 minute)

```bash
# Stop both servers (Ctrl+C)

# Restart backend
cd backend
npm start

# Restart frontend (in new terminal)
cd receipt-scanner
npm start
```

## ✅ Step 4: Test the Checkout Page

1. Go to http://localhost:3001/checkout
2. You should now see the Premium plan cards!
3. Toggle between Monthly ($5) and Annual ($48)

**Note:** The "Subscribe Now" button won't work yet because Stripe keys are dummy values. But you'll see the UI!

---

## What You'll See After Step 1-4:

✅ Checkout page shows plan cards
✅ Monthly/Annual toggle works
✅ Pricing displays correctly
❌ "Subscribe Now" button won't work (need real Stripe keys)

---

## Next: Set Up Real Stripe Test Mode (Optional - 10 minutes)

If you want the full subscription flow to work:

### 1. Create Stripe Account
- Go to https://stripe.com/signup
- Use your personal email
- Skip business verification
- **Stay in Test Mode** (no ABN needed!)

### 2. Get Test API Keys
- Dashboard → Developers → API Keys
- Copy "Publishable key" (starts with `pk_test_`)
- Click "Reveal test key" for Secret key (starts with `sk_test_`)
- Update both `.env` files with real keys

### 3. Create Products in Stripe
- Dashboard → Products → Add Product
- Create "Premium Monthly" - $5/month recurring
- Create "Premium Annual" - $48/year recurring
- Copy the Price IDs (start with `price_`)
- Update `backend/.env` with real price IDs

### 4. Test with Test Card
- Use card: `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `123`
- ZIP: `12345`

---

## Troubleshooting

### "Cannot read property 'map' of undefined"
→ Database migration not run yet. Do Step 1.

### Plans show but "Subscribe Now" does nothing
→ Either:
- Dummy Stripe keys (expected if you haven't set up Stripe yet)
- OR real Stripe keys but wrong price IDs

### Backend crashes with "Unknown column"
→ Restart backend after running migration

### "ER_NO_SUCH_TABLE: Table 'subscription_plans' doesn't exist"
→ Migration didn't run. Check you're using the right database name.

---

## Full Setup Order (For Reference)

1. ✅ Run database migration ← **DO THIS FIRST**
2. ✅ Add dummy/real Stripe keys to .env files
3. ✅ Restart servers
4. ✅ Test checkout page loads
5. ⏭️ Set up real Stripe account (optional)
6. ⏭️ Create Stripe products
7. ⏭️ Update price IDs
8. ⏭️ Test full payment flow

---

**Start with Step 1!** Run that migration SQL and you'll see the checkout page populate immediately.
