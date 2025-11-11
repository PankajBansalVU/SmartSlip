# 🚀 Deploy SmartSlip - Complete Guide (30 Minutes)

## Why Deploy? Your Webhook Problem Will Be SOLVED!

When deployed, Stripe webhooks will work automatically because:
- ✅ Your backend will have a **public URL**
- ✅ Stripe can **reach your server** from the internet
- ✅ Subscriptions will **update instantly** after payment

---

## 📋 Best Platform Combination (FREE!)

| Component | Platform | Why | Cost |
|-----------|----------|-----|------|
| **Backend** | Railway.app | Easy MySQL, auto-deploy, public URL | $5/month free credit |
| **Frontend** | Vercel.com | Built for React, super fast CDN | 100% FREE forever |
| **Database** | Railway MySQL | Managed, backups included | Included in Railway |

**Total Cost: $0** (Railway gives $5 credit, frontend is free)

---

## 🎯 Quick Deployment Steps

### Part 1: Backend on Railway (15 min)

#### 1. Create Railway Account
```
Visit: https://railway.app
Click: "Login with GitHub"
```

#### 2. Add Payment Method (Gets $5 Free Credit)
```
Profile → Account Settings → Usage → Add Card
(You won't be charged, just validates account)
```

#### 3. Deploy Backend
```
1. Click "+ New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Railway will auto-detect backend
```

#### 4. Add MySQL Database
```
In your project:
1. Click "+ New"
2. Select "Database" → "MySQL"
3. Wait 30 seconds
```

#### 5. Connect Database to Backend
```
1. Click MySQL service
2. Go to "Variables" tab
3. You'll see: MYSQL_HOST, MYSQL_PASSWORD, etc.

Now add these to your BACKEND service:
1. Click backend service
2. Go to "Variables" tab
3. Click "Raw Editor"
4. Paste this (update values from MySQL service):
```

```env
# Database (copy from MySQL service Variables tab)
DB_HOST=monorail.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=<copy from MYSQL_PASSWORD>
DB_NAME=railway
DB_PORT=<copy from MYSQL_PORT>

# Your existing Stripe keys
STRIPE_SECRET_KEY=sk_test_51SNSMy2MmrX3r0m5J9vLk8VSQy6JCymGZwF36ppEct5yItq9aYc4pQJ8kSv9cArBjtGJSyCDa4a2zjux4Ll0KvU500WYvuKFrs
STRIPE_PUBLISHABLE_KEY=pk_test_51SNSMy2MmrX3r0m5qqlxbjEOuy9MemPTwKNikiSaKtgnBHetm2NjJ8OeJwz1rlTweMxtU2CYgipGoA1Boaz55PbQ00QnunfRQW
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1SPBxR2MmrX3r0m5j8Fx0423
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_1SPC2V2MmrX3r0m53Dsc1rEq
STRIPE_WEBHOOK_SECRET=temp_will_update_later

# Generate new JWT secret (run in terminal: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=<generate new one>

# Your OpenAI key
OPENAI_API_KEY=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

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=pankajaus7@gmail.com
MAIL_PASSWORD=wcwejnksopuutmbn
MAIL_FROM=noreply@smartslip.com

# Server
PORT=3000
NODE_ENV=production
```

#### 6. Get Your Backend URL
```
1. Click "Settings" tab
2. Scroll to "Domains"
3. Click "Generate Domain"
4. Copy the URL (e.g., smartslip-production.up.railway.app)
```

**SAVE THIS URL!** You'll need it for:
- Frontend API connection
- Stripe webhook configuration

#### 7. Setup Database Tables
```
1. Click MySQL service
2. Click "Connect" tab
3. Copy the mysql command and run in your terminal

Then run:
```

```sql
USE railway;

-- Copy and paste ALL contents from:
-- c:\Users\panka\Desktop\Projects\SmartSlip\backend\config\migrations.sql
```

**Your backend is now LIVE!** 🎉

---

### Part 2: Frontend on Vercel (10 min)

#### 1. Create Vercel Account
```
Visit: https://vercel.com
Click: "Sign Up" → "Continue with GitHub"
```

#### 2. Import Your Project
```
1. Click "Add New..." → "Project"
2. Find your GitHub repo
3. Click "Import"
```

#### 3. Configure Build Settings
```
Root Directory: receipt-scanner
Framework Preset: Create React App
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

#### 4. Add Environment Variable
```
Click "Environment Variables"

Add this:
Name: REACT_APP_API_URL
Value: https://your-railway-backend-url.up.railway.app
(Use the Railway URL from Part 1, Step 6)

Click "Add"
```

#### 5. Deploy!
```
Click "Deploy"
Wait 2-3 minutes
```

**Your frontend is now LIVE!** 🚀

Vercel will give you a URL like:
```
https://smartslip.vercel.app
```

---

### Part 3: Connect Everything (5 min)

#### 1. Update Backend CORS
```
Go to Railway → Backend Service → Variables

Add these variables:
```

```env
FRONTEND_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

Or edit your code and redeploy:
```javascript
// backend/server.js
const corsOptions = {
    origin: [
        'http://localhost:3001',
        'https://your-vercel-app.vercel.app'  // Add your Vercel URL
    ],
    credentials: true
};
```

#### 2. Configure Stripe Webhook (CRITICAL!)
```
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. Enter: https://your-railway-backend.up.railway.app/api/webhooks/webhook
4. Select events:
   ✓ checkout.session.completed
   ✓ customer.subscription.created
   ✓ customer.subscription.updated
   ✓ customer.subscription.deleted
   ✓ invoice.payment_succeeded
   ✓ invoice.payment_failed
5. Click "Add endpoint"
6. Click to reveal "Signing secret" (starts with whsec_)
7. Copy it
```

#### 3. Update Webhook Secret in Railway
```
1. Go to Railway → Backend Service → Variables
2. Find STRIPE_WEBHOOK_SECRET
3. Replace "temp_will_update_later" with the actual secret
4. Railway will auto-redeploy
```

---

## ✅ Test Everything!

### 1. Test Backend
```
Visit: https://your-railway-backend.up.railway.app
Should see: {"message":"SmartSlip API is running"}
```

### 2. Test Frontend
```
Visit: https://your-vercel-app.vercel.app
Should load the app
```

### 3. Test Complete Flow (THE IMPORTANT ONE!)
```
1. Register new account
2. Login
3. Go to Pricing → Subscribe to Premium
4. Use test card: 4242 4242 4242 4242
   Expiry: 12/34
   CVC: 123
5. Complete payment
6. Check Profile page
```

**Expected Result:**
- ✅ Payment succeeds
- ✅ Redirected to success page
- ✅ Profile shows "Premium" badge
- ✅ Database updated (subscription_tier = 'premium')

**Check Railway Logs:**
```
Go to Railway → Backend → View Logs
Look for: "User X subscribed successfully"
```

**If you see that message, WEBHOOKS ARE WORKING!** 🎉

---

## 🔍 Troubleshooting

### Backend won't start?
```
Check Railway logs:
- Database connection error? → Verify DB credentials
- Missing env variable? → Check all variables are set
- Port error? → Should be PORT=3000
```

### Frontend can't connect to backend?
```
1. Check REACT_APP_API_URL in Vercel
2. Check CORS in Railway backend
3. Verify backend URL is correct (no trailing slash)
4. Check Vercel logs for errors
```

### Webhook not working?
```
1. Check Stripe Dashboard → Webhooks → Click your endpoint
2. Look at "Recent deliveries"
3. Should show 200 status (success)
4. If 404: URL is wrong
5. If 401/400: Webhook secret is wrong
6. Check Railway logs for webhook errors
```

### Still not premium after payment?
```
1. Check Stripe Dashboard → Webhooks
2. Look for green checkmark
3. Check Railway logs for "subscribed successfully"
4. If webhook failed, check signing secret matches
5. Test webhook manually from Stripe Dashboard
```

---

## 📊 What You'll Have After Deployment

✅ **Backend:** https://smartslip-production.up.railway.app
- Public API accessible from anywhere
- MySQL database with all tables
- Stripe webhooks receiving events
- All endpoints working

✅ **Frontend:** https://smartslip.vercel.app
- Fast global CDN
- Automatic HTTPS
- Connected to backend API
- Production-ready

✅ **Webhooks:** WORKING!
- Stripe can reach your server
- Subscriptions update instantly
- No more localhost issues

✅ **Database:** Railway MySQL
- Managed, backed up
- Secure connection
- Auto-scaling

---

## 💰 Costs Summary

| Service | Plan | Cost | Included |
|---------|------|------|----------|
| Railway | Hobby | **FREE** ($5 credit) | Backend + MySQL |
| Vercel | Hobby | **FREE** | Frontend, unlimited bandwidth |
| **Total** | - | **$0/month** | Everything! |

**Note:** Railway $5 credit = ~500 hours/month of backend runtime (plenty for testing/portfolio)

---

## 🎯 Final Checklist

Before calling it done:

- [ ] Backend deployed on Railway
- [ ] MySQL database created and migrated
- [ ] Frontend deployed on Vercel
- [ ] Environment variables set in both
- [ ] CORS configured with Vercel URL
- [ ] Stripe webhook configured
- [ ] Webhook secret updated in Railway
- [ ] Test account created
- [ ] Test payment successful
- [ ] Profile shows Premium badge
- [ ] Railway logs show "subscribed successfully"

---

## 🎉 Done!

Your app is now fully deployed and webhooks are working!

**Share your links:**
- 🌐 Live App: https://your-app.vercel.app
- 🔌 API: https://your-backend.railway.app

**For your resume/portfolio:**
```
SmartSlip - Receipt Scanner & Expense Tracker
🔗 Live Demo: https://smartslip.vercel.app
💻 Tech: React, Node.js, MySQL, Stripe, OpenAI
☁️ Deployed: Vercel (Frontend) + Railway (Backend)
```

---

## 📚 Additional Resources

- **Full Railway Guide:** [RAILWAY_QUICK_START.md](./docs/RAILWAY_QUICK_START.md)
- **Detailed Checklist:** [DEPLOYMENT_CHECKLIST.md](./docs/DEPLOYMENT_CHECKLIST.md)
- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs

---

## ❓ Need Help?

If you get stuck:
1. Check Railway logs (most errors appear here)
2. Check Vercel logs (for frontend errors)
3. Check Stripe Dashboard → Webhooks (for webhook delivery status)
4. Review this guide step-by-step

**Common issue: "Subscription not updating"**
→ 99% of the time it's webhook secret mismatch. Double-check it matches Stripe!

---

**Ready to deploy? Start with Part 1: Backend on Railway!** 🚀
