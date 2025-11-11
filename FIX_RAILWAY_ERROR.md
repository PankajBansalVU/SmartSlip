# Fix Railway Deployment Error

## 🔴 Error You're Seeing:
```
✗ Database connection failed:
ERROR: failed to build: failed to solve: process "sh -c node server.js"
did not complete successfully: exit code: 1
```

## ✅ What I Fixed:

### 1. Created Railway Configuration Files
- ✅ `backend/railway.json` - Railway deployment config
- ✅ `backend/nixpacks.toml` - Build configuration
- ✅ `backend/.railwayignore` - Files to exclude from deployment

### 2. Fixed Database Connection
- ✅ Added retry logic to `backend/config/db.config.js`
- ✅ Server won't crash if database isn't ready immediately
- ✅ Will retry 5 times with 5-second delays

---

## 🚀 Next Steps:

### Option 1: Push Changes to GitHub (Recommended)

```bash
cd c:\Users\panka\Desktop\Projects\SmartSlip

# Add all new files
git add backend/railway.json
git add backend/nixpacks.toml
git add backend/.railwayignore
git add backend/config/db.config.js
git add backend/test-webhook.js
git add backend/routes/webhook.routes.js

# Commit
git commit -m "Fix Railway deployment: Add retry logic and config files"

# Push
git push origin main
```

**Railway will automatically redeploy!**

---

### Option 2: Redeploy Manually on Railway

If you've already pushed to GitHub:

1. Go to Railway Dashboard
2. Click your backend service
3. Click "Deployments" tab
4. Click "Redeploy" button
5. Wait for build to complete

---

## 🔍 Important: Check Railway Settings

### Make Sure You Have These Environment Variables Set:

```env
# Database - Get from Railway MySQL Service
DB_HOST=containers-us-west-xxx.railway.app
DB_USER=root
DB_PASSWORD=<from MySQL service>
DB_NAME=railway
DB_PORT=<from MySQL service>

# Server
PORT=3000
NODE_ENV=production

# Stripe
STRIPE_SECRET_KEY=sk_test_51SNSMy2MmrX3r0m5J9vLk8VSQy6JCymGZwF36ppEct5yItq9aYc4pQJ8kSv9cArBjtGJSyCDa4a2zjux4Ll0KvU500WYvuKFrs
STRIPE_PUBLISHABLE_KEY=pk_test_51SNSMy2MmrX3r0m5qqlxbjEOuy9MemPTwKNikiSaKtgnBHetm2NjJ8OeJwz1rlTweMxtU2CYgipGoA1Boaz55PbQ00QnunfRQW
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1SPBxR2MmrX3r0m5j8Fx0423
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_1SPC2V2MmrX3r0m53Dsc1rEq
STRIPE_WEBHOOK_SECRET=temp_will_update_later

# JWT Secret (generate new one)
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# OpenAI
OPENAI_API_KEY=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

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=pankajaus7@gmail.com
MAIL_PASSWORD=wcwejnksopuutmbn
MAIL_FROM=noreply@smartslip.com
```

---

## 🔧 How to Set Environment Variables on Railway:

1. Click on your **backend service** (not MySQL)
2. Click **"Variables"** tab
3. Click **"Raw Editor"** (top right)
4. Paste all the environment variables above
5. **Update the DB credentials from your MySQL service:**
   - Click on **MySQL service**
   - Go to **"Variables"** tab
   - Copy: `MYSQL_HOST`, `MYSQL_PASSWORD`, `MYSQL_PORT`
   - Go back to backend service
   - Update `DB_HOST`, `DB_PASSWORD`, `DB_PORT`
6. Click outside the editor to save

Railway will automatically redeploy!

---

## ✅ What to Expect After Fix:

### In Railway Logs, You Should See:
```
Installing dependencies...
Building application...
✓ Build completed
Starting server...
✗ Database connection failed (attempt 1/5): <error>
Retrying in 5 seconds...
✗ Database connection failed (attempt 2/5): <error>
Retrying in 5 seconds...
✓ Database connected successfully
Server running on port 3000
Server initialized and ready to process receipts
```

### If Database Still Fails After 5 Retries:
The server will start anyway (won't crash), but you'll need to:
1. Check DB credentials are correct
2. Make sure MySQL service is running
3. Verify the MySQL service and backend are in the same Railway project

---

## 🎯 Common Issues & Fixes:

### Issue 1: "MySQL service not found"
**Fix:** Make sure you added MySQL database to the same Railway project:
```
1. In Railway dashboard, click your project
2. Click "+ New"
3. Select "Database" → "MySQL"
4. Wait for it to provision
```

### Issue 2: "DB_HOST not set"
**Fix:** Copy variables from MySQL service:
```
1. Click MySQL service
2. Go to "Variables" tab
3. Copy: MYSQL_HOST, MYSQL_PASSWORD, MYSQL_PORT
4. Add them to backend service as DB_HOST, DB_PASSWORD, DB_PORT
```

### Issue 3: "Build succeeds but server crashes immediately"
**Fix:** Check for missing environment variables:
```
1. Go to Railway → Backend → View Logs
2. Look for errors like "undefined" or "cannot read property"
3. Add the missing environment variables
```

### Issue 4: "sharp module not found" or similar
**Fix:** Clear Railway cache:
```
1. Go to Railway → Backend → Settings
2. Scroll to "Danger Zone"
3. Click "Reset Build Cache"
4. Redeploy
```

---

## 📊 Verify Deployment Success:

### 1. Check Build Logs
```
Railway → Backend → Deployments → Click latest deployment → View logs
```

Look for:
- ✅ "Build completed"
- ✅ "Database connected successfully"
- ✅ "Server running on port 3000"

### 2. Check Runtime Logs
```
Railway → Backend → View Logs (top right)
```

Should show:
- ✅ Server startup messages
- ✅ No error messages
- ✅ Database connection successful

### 3. Test Your Backend URL
```
Open: https://your-service.up.railway.app
```

Should return:
```json
{"message": "SmartSlip API is running"}
```

Or your default route response.

---

## 🎉 Once Deployed Successfully:

### Next Step: Configure Stripe Webhook

1. Get your Railway backend URL:
   ```
   Railway → Backend → Settings → Domains → Copy URL
   ```

2. Go to Stripe Dashboard:
   ```
   https://dashboard.stripe.com/test/webhooks
   ```

3. Add endpoint:
   ```
   URL: https://your-railway-backend.up.railway.app/api/webhooks/webhook

   Select events:
   ✓ checkout.session.completed
   ✓ customer.subscription.created
   ✓ customer.subscription.updated
   ✓ customer.subscription.deleted
   ✓ invoice.payment_succeeded
   ✓ invoice.payment_failed
   ```

4. Copy webhook secret:
   ```
   Click endpoint → Reveal signing secret → Copy
   ```

5. Update Railway:
   ```
   Railway → Backend → Variables → Update STRIPE_WEBHOOK_SECRET
   ```

---

## 🚨 If Still Not Working:

### Share These With Me:
1. Railway build logs (full output)
2. Railway runtime logs (View Logs)
3. Screenshot of your environment variables (hide sensitive data)
4. MySQL service status

### Quick Debug Commands in Railway Console:
```bash
# Check if DB credentials are set
echo $DB_HOST
echo $DB_USER
echo $DB_NAME

# Test MySQL connection
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SHOW DATABASES;"

# Check if tables exist
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD railway -e "SHOW TABLES;"
```

---

## ✅ Checklist:

- [ ] Pushed code changes to GitHub
- [ ] Railway automatically redeployed
- [ ] Build succeeded (no errors)
- [ ] Database connected (checked logs)
- [ ] Server started successfully
- [ ] Backend URL accessible
- [ ] Environment variables all set
- [ ] MySQL service running
- [ ] Ready to configure Stripe webhook

---

**Once this is working, you're 90% done with deployment!** 🚀

The webhook issue will be completely solved once deployed!
