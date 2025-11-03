# 🚂 Railway Deployment - Step by Step

Follow these exact steps to deploy SmartSlip backend to Railway.

---

## Prerequisites ✅

- [x] GitHub account
- [x] Code committed to GitHub
- [x] .env file in .gitignore (verified ✓)
- [x] Backend runs locally without errors

---

## Step 1: Create Railway Account (5 minutes)

### 1.1 Visit Railway
Go to: **https://railway.app**

### 1.2 Sign Up
Click **"Login"** → **"Login with GitHub"**

### 1.3 Authorize Railway
- Click **"Authorize Railway"**
- This connects Railway to your GitHub account

### 1.4 Add Payment Method (Required for Free $5 Credit)
- Click on your profile (top right)
- Go to **"Account Settings"**
- Click **"Usage"** tab
- Add a credit/debit card
- **Don't worry:** You get $5 free credit monthly
- You won't be charged unless you use more than $5

---

## Step 2: Create New Project (10 minutes)

### 2.1 Create Project
- Click **"+ New Project"** button
- Select **"Deploy from GitHub repo"**

### 2.2 Select Repository
- Find and select **"SmartSlip"** repository
- If you don't see it, click **"Configure GitHub App"**
  - Grant access to SmartSlip repository
  - Return to Railway

### 2.3 Configure Service
Railway will auto-detect your Node.js app.

**Important Settings:**
- **Root Directory:** Leave as `/` (Railway will auto-detect backend folder)
- **Build Command:** `npm install`
- **Start Command:** `npm start`

Click **"Deploy"**

### 2.4 Wait for Initial Deployment
- First deployment will fail (expected - no database yet)
- Takes ~2-3 minutes
- Don't worry, we'll fix it next!

---

## Step 3: Add MySQL Database (5 minutes)

### 3.1 Add Database
In your Railway project:
- Click **"+ New"** button (top right)
- Select **"Database"** → **"Add MySQL"**

### 3.2 Wait for Database Creation
- Railway creates MySQL instance
- Takes ~30 seconds
- You'll see a new "MySQL" service in your project

### 3.3 Get Database Credentials
Click on the **MySQL** service, then click **"Connect"** tab

You'll see something like:
```
MYSQL_PUBLIC_URL=mysql://root:password@containers-us-west-123.railway.app:7896/railway
```

**Keep this tab open - you'll need these values!**

Alternatively, click on **"Variables"** tab to see individual values:
- `MYSQL_HOST`
- `MYSQL_USER` (usually "root")
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE` (usually "railway")
- `MYSQL_PORT`

---

## Step 4: Configure Environment Variables (15 minutes)

### 4.1 Go to Backend Service
- Click on your **backend service** (not MySQL)
- Click on **"Variables"** tab
- Click **"+ New Variable"** or **"Raw Editor"**

### 4.2 Add Database Variables

Copy these from MySQL service → Variables:

```
DB_HOST=containers-us-west-xxx.railway.app
DB_USER=root
DB_PASSWORD=xxxxxxxxxxxx
DB_NAME=railway
DB_PORT=xxxx
```

### 4.3 Add Stripe Variables

Use your existing Stripe keys (from local .env):

```
STRIPE_SECRET_KEY=sk_test_51SNSMy2MmrX3r0m5J9vLk8VSQy6JCymGZwF36ppEct5yItq9aYc4pQJ8kSv9cArBjtGJSyCDa4a2zjux4Ll0KvU500WYvuKFrs
STRIPE_PUBLISHABLE_KEY=pk_test_51SNSMy2MmrX3r0m5qqlxbjEOuy9MemPTwKNikiSaKtgnBHetm2NjJ8OeJwz1rlTweMxtU2CYgipGoA1Boaz55PbQ00QnunfRQW
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1SPBxR2MmrX3r0m5j8Fx0423
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_1SPC2V2MmrX3r0m53Dsc1rEq
```

**Note:** We'll add `STRIPE_WEBHOOK_SECRET` later (after configuring Stripe webhooks)

### 4.4 Add JWT Secret

Generate a new secure secret for production:

**Option A: Use your terminal**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to Railway:
```
JWT_SECRET=paste-the-generated-secret-here
```

**Option B: Use existing (less secure for production)**
```
JWT_SECRET=EB1AE0IY9P
```

### 4.5 Add OpenAI API Key

```
OPENAI_API_KEY=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
```

### 4.6 Add Other Variables

```
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://localhost:3001
```

**Note:** We'll update `FRONTEND_URL` later after deploying frontend to Vercel

### 4.7 Complete Variable List

Here's the complete list to add to Railway:

```env
# Database (from Railway MySQL service)
DB_HOST=containers-us-west-xxx.railway.app
DB_USER=root
DB_PASSWORD=xxxxxxxxxxxx
DB_NAME=railway
DB_PORT=xxxx

# Stripe
STRIPE_SECRET_KEY=sk_test_51SNSMy2MmrX3r0m5J9vLk8VSQy6JCymGZwF36ppEct5yItq9aYc4pQJ8kSv9cArBjtGJSyCDa4a2zjux4Ll0KvU500WYvuKFrs
STRIPE_PUBLISHABLE_KEY=pk_test_51SNSMy2MmrX3r0m5qqlxbjEOuy9MemPTwKNikiSaKtgnBHetm2NjJ8OeJwz1rlTweMxtU2CYgipGoA1Boaz55PbQ00QnunfRQW
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1SPBxR2MmrX3r0m5j8Fx0423
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_1SPC2V2MmrX3r0m53Dsc1rEq
STRIPE_WEBHOOK_SECRET=temporary-will-update-later

# JWT
JWT_SECRET=your-generated-secret-here

# OpenAI
OPENAI_API_KEY=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

# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://localhost:3001
```

### 4.8 Save Variables
- Click **"Save"** or variables auto-save
- Railway will automatically redeploy your service

---

## Step 5: Deploy Backend (Automatic)

### 5.1 Watch Deployment
- Go to **"Deployments"** tab
- Railway automatically redeploys after you add variables
- Watch the build logs
- Takes ~2-3 minutes

### 5.2 Check Build Success
Look for:
```
✓ Build completed
✓ Deployment successful
```

### 5.3 Get Your Backend URL
- Click on **"Settings"** tab
- Scroll to **"Domains"** section
- Click **"Generate Domain"**
- Railway assigns URL like: `smartslip-production.up.railway.app`

**Copy this URL - you'll need it!**

Your backend is now live at:
```
https://your-service-name.up.railway.app
```

---

## Step 6: Run Database Migrations (10 minutes)

### 6.1 Connect to Railway MySQL

You have two options:

**Option A: Using Railway CLI (Recommended)**

Install Railway CLI:
```bash
npm install -g @railway/cli
```

Login:
```bash
railway login
```

Link to your project:
```bash
cd c:\Users\panka\Desktop\Projects\SmartSlip\backend
railway link
```

Connect to MySQL:
```bash
railway connect MySQL
```

**Option B: Using MySQL Client**

Use the credentials from Railway MySQL service:
```bash
mysql -h containers-us-west-xxx.railway.app -P xxxx -u root -p
# Enter password when prompted
```

### 6.2 Run Migrations

Once connected to MySQL:

```sql
-- Select database
USE railway;

-- Run your migrations
-- Copy the contents of backend/config/migrations.sql
```

Or if you have the SQL file:
```bash
mysql -h your-host.railway.app -P port -u root -p railway < config/migrations.sql
```

### 6.3 Verify Tables Created

```sql
SHOW TABLES;
```

You should see:
- `users`
- `receipts`
- `receipt_items`
- `subscription_plans`
- `usage_logs`

```sql
-- Check users table structure
DESCRIBE users;
```

Verify these columns exist:
- `subscription_tier`
- `subscription_status`
- `stripe_customer_id`
- `stripe_subscription_id`

---

## Step 7: Test Backend Deployment (5 minutes)

### 7.1 Test Health Endpoint

Visit in browser:
```
https://your-service-name.up.railway.app
```

You should see your app or a response (not 404 or 500 error).

### 7.2 Check Logs

In Railway dashboard:
- Click on your backend service
- Click **"View Logs"**
- Look for:
  ```
  Server running on port 3000
  Database connected successfully
  ```

### 7.3 Test API Endpoint

Try visiting:
```
https://your-service-name.up.railway.app/health
```

Or test with curl:
```bash
curl https://your-service-name.up.railway.app
```

---

## Step 8: Configure Stripe Webhooks (10 minutes)

### 8.1 Get Your Backend Webhook URL

Your webhook endpoint is:
```
https://your-service-name.up.railway.app/api/webhooks/webhook
```

### 8.2 Add Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com
2. Click **"Developers"** → **"Webhooks"**
3. Click **"+ Add endpoint"**
4. Enter endpoint URL:
   ```
   https://your-service-name.up.railway.app/api/webhooks/webhook
   ```
5. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. Click **"Add endpoint"**

### 8.3 Get Webhook Signing Secret

1. Click on the webhook you just created
2. Click **"Reveal"** under **"Signing secret"**
3. Copy the secret (starts with `whsec_`)

### 8.4 Update Railway Environment Variable

1. Go back to Railway
2. Click on your backend service
3. Go to **"Variables"** tab
4. Find `STRIPE_WEBHOOK_SECRET`
5. Update with the new secret from Stripe Dashboard
6. Railway will automatically redeploy

### 8.5 Test Webhook

In Stripe Dashboard:
1. Click on your webhook endpoint
2. Click **"Send test webhook"**
3. Select `checkout.session.completed`
4. Click **"Send test webhook"**

Check Railway logs - you should see webhook received!

---

## Step 9: Update Backend CORS (5 minutes)

Once you deploy frontend to Vercel, you'll need to update CORS.

For now, let's prepare the code:

### 9.1 Check server.js CORS

Your server.js should already use environment variable:

```javascript
app.use(cors({
    origin: [
        'http://localhost:3001',
        process.env.FRONTEND_URL
    ],
    // ...
}));
```

### 9.2 Later, Update FRONTEND_URL

After deploying frontend:
1. Go to Railway → Backend service → Variables
2. Update `FRONTEND_URL` to your Vercel URL
3. Service will auto-redeploy

---

## ✅ Deployment Complete!

Your backend is now live on Railway! 🎉

### What You Have:

- ✅ Backend running at: `https://your-service.up.railway.app`
- ✅ MySQL database connected
- ✅ All environment variables set
- ✅ Database tables created
- ✅ Stripe webhook configured
- ✅ Ready for frontend deployment

### Your Backend URL:

```
https://your-service-name.up.railway.app
```

**Save this URL - you'll need it for frontend deployment!**

---

## Next Steps:

1. **Test your backend:**
   - Check logs in Railway dashboard
   - Verify no errors
   - Test API endpoints

2. **Deploy frontend to Vercel:**
   - Use your Railway backend URL
   - Follow Vercel deployment guide

3. **Update CORS:**
   - Add Vercel URL to `FRONTEND_URL` variable
   - Redeploy backend

4. **Test end-to-end:**
   - Register user
   - Upload receipt
   - Subscribe to premium
   - Verify webhook works

---

## Troubleshooting

### Build Failed
- Check Railway logs for errors
- Verify all dependencies in package.json
- Ensure Node.js version compatible

### Database Connection Failed
- Verify DB credentials copied correctly
- Check Railway MySQL service is running
- Test connection from Railway console

### Environment Variables Not Working
- Check spelling (case-sensitive)
- Ensure no extra spaces
- Redeploy after adding variables

### Webhook Not Received
- Verify URL in Stripe Dashboard is correct (https, not http)
- Check webhook secret matches exactly
- Look at Railway logs for webhook requests

---

## Railway Dashboard URLs

- **Main Dashboard:** https://railway.app/dashboard
- **Your Project:** https://railway.app/project/your-project-id
- **Logs:** Click service → "View Logs"
- **Variables:** Click service → "Variables"
- **Deployments:** Click service → "Deployments"

---

## Cost & Limits

- **Free Tier:** $5/month credit
- **Typical Usage:** $2-4/month for this app
- **Includes:**
  - Backend hosting
  - MySQL database
  - Automatic deployments
  - HTTPS certificates
  - Logs and monitoring

---

## Tips

1. **Watch logs** - Railway logs are very helpful for debugging
2. **Use Railway CLI** - Easier database access
3. **Auto-deploy** - Pushes to GitHub auto-deploy
4. **Environment variables** - Always use variables, never hardcode
5. **Monitor usage** - Check usage tab to stay within free credit

---

Ready to continue? Next: Deploy frontend to Vercel!
