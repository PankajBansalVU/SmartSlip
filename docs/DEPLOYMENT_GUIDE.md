# SmartSlip Deployment Guide

## Architecture Overview

```
Frontend (React)          Backend (Node/Express)        Database (MySQL)
     ↓                           ↓                            ↓
   Vercel                    Railway/Render              Railway/PlanetScale
```

## Why This Stack?

### Frontend → Vercel
- ✅ Free tier perfect for React apps
- ✅ Automatic deployments from GitHub
- ✅ Built-in HTTPS
- ✅ Global CDN for fast loading

### Backend → Railway or Render
- ✅ Free tier supports Node.js
- ✅ Automatic HTTPS
- ✅ Environment variables support
- ✅ Easy database integration
- ✅ **Critical:** Public URL for Stripe webhooks

### Database → Railway MySQL or PlanetScale
- ✅ Free tier MySQL database
- ✅ Remote access for your backend
- ✅ Automatic backups

---

## Deployment Steps

### Phase 1: Prepare for Deployment

#### 1.1 Update Backend for Production

Create a new file `backend/.env.production`:

```env
# Database (will get from Railway/Render)
DB_HOST=your-db-host.railway.app
DB_USER=root
DB_PASSWORD=your-db-password
DB_NAME=railway
DB_PORT=3306

# Stripe (use PRODUCTION keys for real payments, or TEST keys for demo)
STRIPE_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx for demo
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # ← Will get this from Stripe Dashboard

# JWT
JWT_SECRET=your-super-secret-random-string-here-min-32-chars

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx

# Google Vision (optional)
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json

# CORS
FRONTEND_URL=https://your-app.vercel.app
```

#### 1.2 Update Backend CORS Configuration

Edit `backend/server.js`:

```javascript
app.use(cors({
    origin: [
        'http://localhost:3001',  // Local development
        process.env.FRONTEND_URL,  // Production frontend
        'https://your-app.vercel.app'  // Your actual Vercel URL
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'stripe-signature'  // ← Important for webhooks
    ]
}));
```

#### 1.3 Update Frontend API URL

Create `receipt-scanner/.env.production`:

```env
REACT_APP_API_URL=https://your-backend.railway.app
```

---

### Phase 2: Deploy Backend (Railway - Recommended)

#### Why Railway?
- Easy MySQL database included
- Free $5/month credit (enough for demo/development)
- Simple deployment
- Public URL for webhooks

#### Steps:

**1. Create Railway Account**
- Go to [railway.app](https://railway.app)
- Sign up with GitHub

**2. Create New Project**
- Click "New Project"
- Select "Deploy from GitHub repo"
- Authorize Railway to access your GitHub
- Select your SmartSlip repository

**3. Configure Backend Service**
- Railway auto-detects Node.js
- Set root directory to `backend`
- Add environment variables:
  - Click on service → Variables
  - Add all variables from `.env.production` above

**4. Add MySQL Database**
- In same project, click "+ New"
- Select "Database" → "MySQL"
- Railway automatically creates database
- Connection details appear in Variables tab

**5. Update Database Environment Variables**
- Copy these from MySQL service:
  - `MYSQL_HOST` → your `DB_HOST`
  - `MYSQL_USER` → your `DB_USER`
  - `MYSQL_PASSWORD` → your `DB_PASSWORD`
  - `MYSQL_DATABASE` → your `DB_NAME`
  - `MYSQL_PORT` → your `DB_PORT`

**6. Run Database Migrations**
- Railway provides a shell terminal
- Click on your backend service
- Go to "Settings" → "Deploy Trigger"
- Or connect via MySQL client:
```bash
mysql -h your-host.railway.app -u root -p your-database < config/migrations.sql
```

**7. Get Your Backend URL**
- Railway assigns public URL like: `smartslip-backend.up.railway.app`
- This is your `REACT_APP_API_URL` for frontend
- **Important:** This URL will receive Stripe webhooks!

---

### Phase 3: Deploy Frontend (Vercel)

**1. Create Vercel Account**
- Go to [vercel.com](https://vercel.com)
- Sign up with GitHub

**2. Import Project**
- Click "Add New..." → "Project"
- Select your SmartSlip repository
- Vercel auto-detects React app

**3. Configure Build Settings**
- Root Directory: `receipt-scanner`
- Build Command: `npm run build`
- Output Directory: `build`

**4. Add Environment Variables**
- In project settings → Environment Variables
- Add:
```
REACT_APP_API_URL=https://your-backend.railway.app
```

**5. Deploy**
- Click "Deploy"
- Vercel builds and deploys
- Get your URL: `your-app.vercel.app`

**6. Update Backend CORS**
- Go back to Railway
- Update `FRONTEND_URL` variable with your Vercel URL
- Redeploy backend

---

### Phase 4: Configure Stripe Webhooks (CRITICAL!)

This is where production differs from local development!

**1. Get Your Backend Webhook URL**
```
https://your-backend.railway.app/api/webhooks/webhook
```

**2. Add Webhook in Stripe Dashboard**

- Go to [Stripe Dashboard](https://dashboard.stripe.com)
- Click "Developers" → "Webhooks"
- Click "+ Add endpoint"
- Enter endpoint URL: `https://your-backend.railway.app/api/webhooks/webhook`
- Select events to listen for:
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.created`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
  - ✅ `invoice.payment_succeeded`
  - ✅ `invoice.payment_failed`
- Click "Add endpoint"

**3. Get Webhook Signing Secret**
- After creating endpoint, click on it
- Click "Reveal" under "Signing secret"
- Copy the secret (starts with `whsec_`)
- **This is different from your local Stripe CLI secret!**

**4. Update Backend Environment Variable**
- Go to Railway
- Update `STRIPE_WEBHOOK_SECRET` with the new production secret
- Redeploy backend

**5. Test Webhook**
- In Stripe Dashboard, on your webhook endpoint page
- Click "Send test webhook"
- Select `checkout.session.completed`
- Send it
- Check Railway logs to see if received

---

## Alternative: Deploy Backend to Render

If you prefer Render over Railway:

**1. Create Render Account**
- Go to [render.com](https://render.com)
- Sign up with GitHub

**2. Create Web Service**
- Click "New +" → "Web Service"
- Connect GitHub repository
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

**3. Add PostgreSQL/MySQL Database**
- Render offers PostgreSQL for free
- For MySQL, you'll need external service like PlanetScale

**4. Environment Variables**
- Add same variables as Railway
- Render auto-injects database URL

**5. Get Public URL**
- Render assigns URL like: `smartslip-backend.onrender.com`

---

## Testing Your Deployed App

### Test Checklist:

1. **Frontend Loads**
   - [ ] Visit your Vercel URL
   - [ ] No console errors
   - [ ] Can see login page

2. **Backend Connection**
   - [ ] Can register new user
   - [ ] Can login
   - [ ] Authentication works

3. **Database Connection**
   - [ ] User data saved
   - [ ] Can upload receipts
   - [ ] Can view history

4. **Stripe Integration**
   - [ ] Pricing page loads
   - [ ] Can click "Subscribe Now"
   - [ ] Redirects to Stripe Checkout
   - [ ] Use test card: `4242 4242 4242 4242`

5. **Webhooks (MOST IMPORTANT!)**
   - [ ] After payment, redirected to success page
   - [ ] Check Railway/Render logs for webhook received
   - [ ] Database updated (user becomes premium)
   - [ ] Profile page shows Premium badge
   - [ ] Unlimited uploads work

---

## Webhook Setup Comparison

### Local Development:
```
Stripe.com → Stripe CLI (on your computer) → localhost:3000/api/webhooks/webhook
```
**Webhook Secret:** From Stripe CLI output (changes each time)

### Production:
```
Stripe.com → https://your-backend.railway.app/api/webhooks/webhook
```
**Webhook Secret:** From Stripe Dashboard (permanent)

---

## Environment Variables Summary

### Backend (.env.production)
```env
# Database
DB_HOST=xxx.railway.app
DB_USER=root
DB_PASSWORD=xxxxx
DB_NAME=railway
DB_PORT=3306

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx  # Use test keys for demo
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From Stripe Dashboard!

# JWT
JWT_SECRET=min-32-char-random-string

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx

# Frontend URL
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (.env.production)
```env
REACT_APP_API_URL=https://your-backend.railway.app
```

---

## Common Deployment Issues

### 1. CORS Errors
**Symptom:** Frontend can't connect to backend
**Fix:**
- Add Vercel URL to backend CORS whitelist
- Update `FRONTEND_URL` environment variable
- Redeploy backend

### 2. Webhook Not Received
**Symptom:** Payment succeeds but user not upgraded
**Fix:**
- Verify webhook URL in Stripe Dashboard is correct
- Check backend logs for errors
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Ensure webhook endpoint is HTTPS

### 3. Database Connection Failed
**Symptom:** Backend errors on startup
**Fix:**
- Verify database credentials
- Check database is running
- Ensure IP whitelist allows Railway/Render IPs
- Test connection from Railway/Render shell

### 4. Build Failures
**Symptom:** Deployment fails
**Fix:**
- Check build logs
- Ensure all dependencies in `package.json`
- Verify Node.js version compatibility
- Check environment variables are set

---

## Cost Breakdown (Free Tier)

### Vercel (Frontend)
- ✅ **Free** for personal projects
- Bandwidth: 100 GB/month
- Builds: Unlimited

### Railway (Backend + Database)
- ✅ **$5/month free credit**
- Enough for development/demo
- ~500 hours of uptime per month

### Alternative: Render
- ✅ **Free tier** (with limitations)
- Backend sleeps after 15 min inactivity
- Wakes up on request (slower first load)

### Total Cost for Demo: **$0-5/month**

---

## Production vs Demo Decision

### For Live Demo (Showing to Recruiters):
- ✅ Use Stripe **TEST mode**
- ✅ Test cards only (4242 4242 4242 4242)
- ✅ No real money involved
- ✅ Free Stripe account
- ✅ Keep test webhook secret

### For Real Production (Actual Business):
- Use Stripe **LIVE mode**
- Real credit cards
- Need verified Stripe account (ABN/business details)
- Production webhook secret
- SSL certificate required (included with Railway/Render)

---

## Next Steps

1. ✅ Choose hosting provider (Railway recommended)
2. ✅ Deploy backend to Railway
3. ✅ Set up MySQL database
4. ✅ Run migrations
5. ✅ Deploy frontend to Vercel
6. ✅ Configure Stripe webhooks in Dashboard
7. ✅ Test end-to-end flow
8. ✅ Share demo URL with recruiters!

---

## Quick Start Commands

```bash
# 1. Test local build works
cd backend && npm run build  # If you have build script
cd ../receipt-scanner && npm run build

# 2. Commit and push to GitHub
git add .
git commit -m "Prepare for deployment"
git push origin main

# 3. Deploy via Railway/Vercel dashboards (connect GitHub)

# 4. Configure environment variables

# 5. Test deployed app
```

---

## Support & Troubleshooting

If webhooks still don't work after deployment:
1. Check Railway/Render logs for webhook requests
2. Verify Stripe Dashboard shows webhook endpoint as active
3. Test webhook from Stripe Dashboard
4. Check `STRIPE_WEBHOOK_SECRET` matches exactly
5. Ensure CORS allows Stripe requests

**Your deployed app will be live at:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app`
- Perfect for sharing with recruiters! 🚀
