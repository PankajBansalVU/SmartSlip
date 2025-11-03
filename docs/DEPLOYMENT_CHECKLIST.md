# Deployment Checklist ✅

Use this checklist to ensure everything is configured correctly before and after deployment.

## Pre-Deployment

### Code Preparation
- [ ] All code committed to GitHub
- [ ] `.env` files in `.gitignore` (don't commit secrets!)
- [ ] `package.json` has all dependencies
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Backend starts without errors (`npm start`)

### GitHub Repository
- [ ] Repository is public or accessible to Railway/Vercel
- [ ] Main branch is up to date
- [ ] README.md describes the project

---

## Backend Deployment (Railway)

### Railway Setup
- [ ] Created Railway account
- [ ] Connected GitHub account
- [ ] Created new project
- [ ] Selected repository

### MySQL Database
- [ ] Added MySQL database to project
- [ ] Got database credentials
- [ ] Saved credentials to environment variables

### Environment Variables Set
- [ ] `DB_HOST`
- [ ] `DB_USER`
- [ ] `DB_PASSWORD`
- [ ] `DB_NAME`
- [ ] `DB_PORT`
- [ ] `STRIPE_SECRET_KEY` (sk_test_xxx for demo)
- [ ] `STRIPE_PREMIUM_MONTHLY_PRICE_ID`
- [ ] `STRIPE_PREMIUM_ANNUAL_PRICE_ID`
- [ ] `STRIPE_WEBHOOK_SECRET` (from Stripe Dashboard - do this after webhook setup)
- [ ] `JWT_SECRET` (generate random 32+ char string)
- [ ] `OPENAI_API_KEY`
- [ ] `FRONTEND_URL` (your Vercel URL)

### Database Migration
- [ ] Connected to Railway MySQL
- [ ] Ran `migrations.sql`
- [ ] Verified tables created: `users`, `receipts`, `receipt_items`, `subscription_plans`, `usage_logs`

### Backend Deployment
- [ ] Backend deployed successfully
- [ ] Got public URL (e.g., `smartslip.up.railway.app`)
- [ ] Backend is accessible (visit `https://your-url.railway.app`)
- [ ] No errors in Railway logs

---

## Frontend Deployment (Vercel)

### Vercel Setup
- [ ] Created Vercel account
- [ ] Connected GitHub account
- [ ] Imported SmartSlip repository
- [ ] Set root directory to `receipt-scanner`

### Build Configuration
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `build`
- [ ] Install Command: `npm install`

### Environment Variables
- [ ] `REACT_APP_API_URL` = Your Railway backend URL

### Frontend Deployment
- [ ] Frontend deployed successfully
- [ ] Got public URL (e.g., `smartslip.vercel.app`)
- [ ] Frontend loads in browser
- [ ] No console errors
- [ ] Can see login/register pages

---

## Stripe Webhook Configuration

### Stripe Dashboard Setup
- [ ] Logged into Stripe Dashboard
- [ ] Went to Developers → Webhooks
- [ ] Clicked "Add endpoint"
- [ ] Entered webhook URL: `https://your-backend.railway.app/api/webhooks/webhook`
- [ ] Selected events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Saved endpoint

### Webhook Secret
- [ ] Revealed signing secret in Stripe Dashboard
- [ ] Copied secret (starts with `whsec_`)
- [ ] Added to Railway environment variables as `STRIPE_WEBHOOK_SECRET`
- [ ] Redeployed backend

### Webhook Testing
- [ ] Sent test webhook from Stripe Dashboard
- [ ] Checked Railway logs - webhook received
- [ ] No signature verification errors

---

## Update Backend CORS

### CORS Configuration
- [ ] Added Vercel URL to CORS whitelist in `server.js`:
```javascript
origin: [
    'http://localhost:3001',
    'https://your-app.vercel.app'
]
```
- [ ] Committed change
- [ ] Redeployed backend

---

## End-to-End Testing

### Basic Functionality
- [ ] Can access frontend at Vercel URL
- [ ] Can register new user
- [ ] Can login
- [ ] Can access dashboard/home page

### Receipt Upload
- [ ] Can upload receipt image
- [ ] OCR processes correctly
- [ ] Receipt saves to database
- [ ] Can view receipt in history

### Subscription Flow (CRITICAL!)
- [ ] Can access Pricing page
- [ ] Can click "Subscribe Now"
- [ ] Redirects to Stripe Checkout
- [ ] Checkout page loads (uses test mode)
- [ ] Can enter test card: `4242 4242 4242 4242`
  - Expiry: 12/34
  - CVC: 123
  - ZIP: 12345
- [ ] Payment succeeds
- [ ] Redirected back to success page
- [ ] **WEBHOOK RECEIVED** (check Railway logs)
- [ ] **DATABASE UPDATED** (user becomes premium)
- [ ] Profile page shows "Premium" badge
- [ ] Pricing page shows "Current Plan"
- [ ] Can upload unlimited receipts

### Premium Features
- [ ] Premium users can export reports
- [ ] Premium users see no upload limits
- [ ] Free users see "Upgrade to Premium" messages

---

## Verification

### Check Database Directly
```sql
-- Connect to Railway MySQL
SELECT
    user_id,
    email,
    subscription_tier,
    subscription_status,
    stripe_customer_id,
    stripe_subscription_id
FROM users;
```

Expected after successful payment:
- `subscription_tier`: `premium`
- `subscription_status`: `active`
- `stripe_customer_id`: `cus_xxxxx`
- `stripe_subscription_id`: `sub_xxxxx`

### Check Railway Logs
- [ ] No errors on startup
- [ ] Database connected successfully
- [ ] Webhook endpoint ready
- [ ] When payment made, logs show: "User X subscribed successfully"

### Check Vercel Logs
- [ ] Build succeeded
- [ ] No runtime errors
- [ ] API calls to backend succeeding

### Check Stripe Dashboard
- [ ] Test payment appears in Payments
- [ ] Webhook shows successful delivery (200 status)
- [ ] Customer created
- [ ] Subscription created

---

## Common Issues

### ❌ Webhook Not Received
**Check:**
- [ ] Webhook URL is exactly: `https://your-backend.railway.app/api/webhooks/webhook`
- [ ] Webhook secret in Railway matches Stripe Dashboard
- [ ] Backend is running (not crashed)
- [ ] Stripe webhook shows green checkmark (not failed)

**Fix:**
- Verify URL in Stripe Dashboard
- Copy webhook secret again
- Check Railway logs for errors
- Test webhook manually from Stripe Dashboard

### ❌ CORS Error
**Check:**
- [ ] Backend CORS includes Vercel URL
- [ ] Frontend `.env.production` has correct backend URL
- [ ] Both deployed (not using localhost URLs)

**Fix:**
- Update CORS in `server.js`
- Add Vercel URL to `origin` array
- Redeploy backend

### ❌ Database Connection Failed
**Check:**
- [ ] Database credentials correct
- [ ] Database is running
- [ ] Railway MySQL service is up

**Fix:**
- Verify environment variables
- Restart Railway database service
- Check Railway logs

### ❌ Payment Succeeds but User Not Upgraded
**Check:**
- [ ] Webhook received in Railway logs
- [ ] No errors in webhook handler
- [ ] `userId` is in checkout session metadata
- [ ] Database connection working

**Fix:**
- Check Railway logs for SQL errors
- Verify webhook handler code
- Test manually: Run SQL UPDATE query

---

## Final Verification

### Share These URLs
- **Live App:** `https://your-app.vercel.app`
- **API:** `https://your-backend.railway.app`

### Demo Instructions for Recruiters
```
1. Visit: https://your-app.vercel.app
2. Register a new account
3. Login
4. Upload a receipt (test OCR)
5. Go to Pricing → Subscribe to Premium
6. Use test card: 4242 4242 4242 4242
7. Complete payment
8. See Premium badge on Profile
9. Enjoy unlimited uploads!
```

---

## Deployment Complete! 🎉

Once all checkboxes are checked, your app is live and ready to demo!

**Remember:**
- This is using Stripe TEST mode (safe, no real money)
- Test cards only (4242 4242 4242 4242)
- Perfect for showing to recruiters
- Can upgrade to LIVE mode later for real business

**Estimated Time:** 1-2 hours for first deployment

**Cost:** $0-5/month (Railway free credit + Vercel free tier)
