# 🚀 Railway Deployment - Quick Start

**Your code is ready and pushed to GitHub!** Follow these steps NOW.

---

## ⚡ Quick Actions (Do These Now!)

### Step 1: Create Railway Account (2 minutes)

1. Open: **https://railway.app**
2. Click **"Login"**
3. Click **"Login with GitHub"**
4. Authorize Railway

✅ Done? Mark this: [ ]

---

### Step 2: Add Payment Method (2 minutes)

**Why?** Get $5 free credit (required even for free tier)

1. Click your profile (top right)
2. Go to **"Account Settings"**
3. Click **"Usage"** tab
4. Add credit/debit card
5. **You won't be charged** - just validates account

✅ Done? Mark this: [ ]

---

### Step 3: Create New Project (3 minutes)

1. Click **"+ New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select: **"receipt-scanner"** repository
4. Click **"Deploy"**

**Wait ~2 minutes for initial deployment**
(It will fail - that's expected! We need to add database)

✅ Done? Mark this: [ ]

---

### Step 4: Add MySQL Database (1 minute)

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Wait ~30 seconds

✅ Done? Mark this: [ ]

---

### Step 5: Get Database Credentials (2 minutes)

1. Click on the **MySQL** service
2. Click **"Variables"** tab
3. **KEEP THIS TAB OPEN** - you'll need these values!

You should see:
- `MYSQL_HOST` - copy this
- `MYSQL_USER` - usually "root"
- `MYSQL_PASSWORD` - copy this
- `MYSQL_DATABASE` - usually "railway"
- `MYSQL_PORT` - copy this

✅ Done? Mark this: [ ]

---

### Step 6: Add Environment Variables (10 minutes)

1. Click on your **backend service** (not MySQL)
2. Click **"Variables"** tab
3. Click **"Raw Editor"** button (top right)
4. **Copy-paste this template** and fill in the values:

```env
# Database (from MySQL service above)
DB_HOST=paste-MYSQL_HOST-here
DB_USER=root
DB_PASSWORD=paste-MYSQL_PASSWORD-here
DB_NAME=railway
DB_PORT=paste-MYSQL_PORT-here

# Stripe (your existing keys)
STRIPE_SECRET_KEY=sk_test_51SNSMy2MmrX3r0m5J9vLk8VSQy6JCymGZwF36ppEct5yItq9aYc4pQJ8kSv9cArBjtGJSyCDa4a2zjux4Ll0KvU500WYvuKFrs
STRIPE_PUBLISHABLE_KEY=pk_test_51SNSMy2MmrX3r0m5qqlxbjEOuy9MemPTwKNikiSaKtgnBHetm2NjJ8OeJwz1rlTweMxtU2CYgipGoA1Boaz55PbQ00QnunfRQW
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1SPBxR2MmrX3r0m5j8Fx0423
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_1SPC2V2MmrX3r0m53Dsc1rEq
STRIPE_WEBHOOK_SECRET=temporary

# JWT (generate new secret - see below)
JWT_SECRET=your-secret-here

# OpenAI
OPENAI_API_KEY=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

# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://localhost:3001
```

**To generate JWT_SECRET:**
Open terminal and run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste it as JWT_SECRET

5. Click outside the editor to save

✅ Done? Mark this: [ ]

---

### Step 7: Wait for Deployment (2 minutes)

Railway will automatically redeploy after you add variables.

1. Click **"Deployments"** tab
2. Watch the build progress
3. Wait for ✓ Build completed

✅ Done? Mark this: [ ]

---

### Step 8: Generate Public URL (1 minute)

1. Click **"Settings"** tab
2. Scroll to **"Domains"** section
3. Click **"Generate Domain"**

Railway will assign a URL like:
```
https://smartslip-production-xxxx.up.railway.app
```

**COPY THIS URL** - you'll need it!

✅ Done? Mark this: [ ]
**My URL:** _________________________________

---

### Step 9: Run Database Migrations (5 minutes)

**Option A: Using Railway Console (Easier)**

1. Click on **MySQL** service
2. Click **"Connect"** tab
3. Copy the connection command
4. Open your terminal and run it

Then run:
```sql
USE railway;

-- Copy and paste the entire contents of:
-- backend/config/migrations.sql
```

**Option B: Using MySQL Client**

```bash
cd c:\Users\panka\Desktop\Projects\SmartSlip\backend
mysql -h your-host -P your-port -u root -p railway < config/migrations.sql
```
(Enter password when prompted)

✅ Done? Mark this: [ ]

---

### Step 10: Verify Database (2 minutes)

In MySQL console:
```sql
USE railway;
SHOW TABLES;
```

You should see:
- users
- receipts
- receipt_items
- subscription_plans
- usage_logs

✅ Done? Mark this: [ ]

---

### Step 11: Configure Stripe Webhook (5 minutes)

1. Go to: **https://dashboard.stripe.com**
2. Click **"Developers"** → **"Webhooks"**
3. Click **"+ Add endpoint"**
4. Enter your Railway URL + webhook path:
   ```
   https://your-service.up.railway.app/api/webhooks/webhook
   ```
5. Select these events:
   - ✅ checkout.session.completed
   - ✅ customer.subscription.created
   - ✅ customer.subscription.updated
   - ✅ customer.subscription.deleted
   - ✅ invoice.payment_succeeded
   - ✅ invoice.payment_failed
6. Click **"Add endpoint"**

✅ Done? Mark this: [ ]

---

### Step 12: Update Webhook Secret (2 minutes)

1. In Stripe Dashboard, click on your webhook
2. Click **"Reveal"** under "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Go back to Railway → Backend service → Variables
5. Find `STRIPE_WEBHOOK_SECRET`
6. Replace "temporary" with the actual secret
7. Save (Railway auto-redeploys)

✅ Done? Mark this: [ ]

---

### Step 13: Test Your Backend! (2 minutes)

1. Visit your Railway URL in browser:
   ```
   https://your-service.up.railway.app
   ```

2. Check Railway logs:
   - Click backend service
   - Click "View Logs"
   - Look for: "Server running on port 3000"

✅ Backend is live! Mark this: [ ]

---

## 🎉 Backend Deployed!

Your backend is now running on Railway!

### What You Have:

- ✅ Live backend URL
- ✅ MySQL database
- ✅ All environment variables configured
- ✅ Database tables created
- ✅ Stripe webhook configured
- ✅ Ready for frontend deployment

### Your Details:

**Backend URL:** https://your-service.up.railway.app
**Database:** Railway MySQL
**Webhook:** Configured in Stripe Dashboard

---

## Next Steps:

Now you can:
1. **Test backend** - Try API endpoints
2. **Deploy frontend** - Use your Railway URL for REACT_APP_API_URL
3. **Update CORS** - Add Vercel URL after frontend deployment

---

## Quick Troubleshooting:

### Build Failed?
- Check Railway logs for errors
- Verify package.json has all dependencies
- Ensure DB credentials are correct

### Can't Access Backend?
- Verify domain was generated
- Check if deployment succeeded
- Look at logs for errors

### Database Connection Failed?
- Double-check DB_HOST, DB_PASSWORD
- Ensure MySQL service is running
- Verify port number is correct

---

## Support:

- Full guide: [RAILWAY_DEPLOYMENT_STEPS.md](./RAILWAY_DEPLOYMENT_STEPS.md)
- Troubleshooting: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- Railway docs: https://docs.railway.app

---

**Ready to deploy frontend?** Let me know when backend is working!
