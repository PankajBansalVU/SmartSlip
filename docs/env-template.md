# Environment Variables Templates

Copy these templates when deploying to Railway and Vercel.

---

## Backend Environment Variables (Railway)

Copy these to Railway → Your Backend Service → Variables

```env
# Database (Railway will provide these - just copy from MySQL service)
DB_HOST=containers-us-west-xxx.railway.app
DB_USER=root
DB_PASSWORD=xxxxxxxxxxxxx
DB_NAME=railway
DB_PORT=xxxx

# Stripe Configuration
# Use TEST keys for demo/development
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1SPBxR2MmrX3r0m5j8Fx0423
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_1SPC2V2MmrX3r0m53Dsc1rEq

# Stripe Webhook Secret
# IMPORTANT: Get this from Stripe Dashboard after creating webhook endpoint
# Local development uses: whsec_aafec132d36ee449fd11ec309fa1641776add593ce919e107cb4c9e10076c8a2
# Production will be different!
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# JWT Secret
# Generate a random 32+ character string
# You can use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-random-string-minimum-32-characters-long

# OpenAI API Key
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Cloud Vision (Optional)
# If using Google Cloud Vision API, upload key.json to Railway
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json

# Frontend URL (for CORS)
# Update this with your actual Vercel URL after frontend deployment
FRONTEND_URL=https://smartslip.vercel.app

# Server Port (Railway sets this automatically, but you can specify)
PORT=3000
```

---

## Frontend Environment Variables (Vercel)

Copy these to Vercel → Your Project → Settings → Environment Variables

```env
# Backend API URL
# Update with your actual Railway backend URL
REACT_APP_API_URL=https://smartslip-backend.up.railway.app
```

---

## How to Get Each Value

### Database Credentials (Railway)

1. In Railway, add MySQL database to your project
2. Click on MySQL service
3. Go to "Connect" tab
4. Copy values:
   - `MYSQL_PUBLIC_URL` contains all info, or
   - Copy individual values:
     - `MYSQL_HOST` → `DB_HOST`
     - `MYSQL_USER` → `DB_USER`
     - `MYSQL_PASSWORD` → `DB_PASSWORD`
     - `MYSQL_DATABASE` → `DB_NAME`
     - `MYSQL_PORT` → `DB_PORT`

### Stripe Keys (Test Mode)

**Already have these from local development:**
- Secret Key: `sk_test_xxxxx` (from your `.env`)
- Price IDs:
  - Monthly: `price_1SPBxR2MmrX3r0m5j8Fx0423`
  - Annual: `price_1SPC2V2MmrX3r0m53Dsc1rEq`

**For production/live mode (later):**
1. Stripe Dashboard → Developers → API Keys
2. Toggle to "Live mode" (top right)
3. Copy "Secret key" (starts with `sk_live_`)
4. Create new price IDs for live mode

### Stripe Webhook Secret (CRITICAL!)

**For Production:**
1. Deploy backend to Railway first
2. Get your backend URL: `https://your-app.up.railway.app`
3. Go to Stripe Dashboard → Developers → Webhooks
4. Click "Add endpoint"
5. Enter: `https://your-app.up.railway.app/api/webhooks/webhook`
6. Select events (checkout.session.completed, etc.)
7. Click "Add endpoint"
8. Click "Reveal" under "Signing secret"
9. Copy the secret (starts with `whsec_`)
10. Add to Railway environment variables
11. Redeploy backend

**Important:** Production webhook secret is DIFFERENT from local Stripe CLI secret!

### JWT Secret

Generate a secure random string:

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Online Generator**
- Go to https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" (256-bit)

### OpenAI API Key

Already have this from local development:
- Check your `backend/.env` file
- Starts with `sk-proj-` or `sk-`

### Frontend URL (CORS)

1. Deploy frontend to Vercel first
2. Vercel assigns URL like: `smartslip.vercel.app`
3. Full URL: `https://smartslip.vercel.app`
4. Add this to `FRONTEND_URL` in Railway
5. Redeploy backend

### Backend URL (for Frontend)

1. Deploy backend to Railway first
2. Railway assigns URL like: `smartslip-backend.up.railway.app`
3. Full URL: `https://smartslip-backend.up.railway.app`
4. Add this to `REACT_APP_API_URL` in Vercel

---

## Deployment Order (Important!)

### Correct Order:
1. **Deploy Backend to Railway** (without FRONTEND_URL first)
2. **Get Backend URL** from Railway
3. **Deploy Frontend to Vercel** with backend URL in env vars
4. **Get Frontend URL** from Vercel
5. **Update Backend** with frontend URL in CORS
6. **Configure Stripe Webhook** with backend URL
7. **Update Backend** with webhook secret
8. **Test Everything**

### Why this order?
- Frontend needs backend URL to make API calls
- Backend needs frontend URL for CORS
- Stripe webhook needs backend URL to send events
- Backend needs webhook secret to verify Stripe events

---

## Quick Copy-Paste for Railway

```
DB_HOST=
DB_USER=root
DB_PASSWORD=
DB_NAME=railway
DB_PORT=
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1SPBxR2MmrX3r0m5j8Fx0423
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_1SPC2V2MmrX3r0m53Dsc1rEq
STRIPE_WEBHOOK_SECRET=
JWT_SECRET=
OPENAI_API_KEY=
FRONTEND_URL=
PORT=3000
```

---

## Quick Copy-Paste for Vercel

```
REACT_APP_API_URL=
```

---

## Environment-Specific Notes

### Local Development (.env)
- Uses `localhost` URLs
- Stripe CLI webhook secret (changes each time)
- Local MySQL database

### Production (Railway/Vercel)
- Uses public HTTPS URLs
- Stripe Dashboard webhook secret (permanent)
- Cloud MySQL database
- **Still in TEST mode** (safe for demo)

### Live Production (Real Business)
- Same as production setup
- Switch Stripe to LIVE mode
- Use `sk_live_` keys
- Create new webhook endpoint for live mode
- New webhook secret for live webhooks
- Real credit cards (no more 4242 test cards)

---

## Security Checklist

Before deploying, ensure:

- [ ] `.env` files are in `.gitignore`
- [ ] Never commit secrets to GitHub
- [ ] Use environment variables in hosting platform
- [ ] Keep `JWT_SECRET` secure and random
- [ ] Don't share API keys publicly
- [ ] Use HTTPS for all endpoints (Railway/Vercel provide this)
- [ ] Webhook secret matches Stripe Dashboard
- [ ] CORS only allows your frontend URL

---

## After Deployment

### Update These Files (if needed)

If you hardcoded any URLs during development:

**Backend `server.js`:**
```javascript
// Update CORS to use environment variable
origin: [
    'http://localhost:3001',
    process.env.FRONTEND_URL || 'https://smartslip.vercel.app'
]
```

**Frontend `stripe.service.ts` (if needed):**
```typescript
// Should already use process.env.REACT_APP_API_URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
```

---

## Testing Checklist

After setting all environment variables:

- [ ] Backend starts without errors
- [ ] Database connection successful
- [ ] Frontend loads and can make API calls
- [ ] Can register and login
- [ ] Can upload receipts
- [ ] Can subscribe to premium (test card works)
- [ ] Webhook receives and processes payment
- [ ] User upgraded to premium automatically
- [ ] Profile shows premium badge

---

## Need Help?

**Common Issues:**

1. **"Database connection failed"**
   - Double-check DB credentials
   - Ensure DB_HOST has port number
   - Verify Railway MySQL is running

2. **"CORS error"**
   - Check FRONTEND_URL is set correctly
   - Verify frontend URL is in CORS whitelist
   - Redeploy backend after changing CORS

3. **"Webhook verification failed"**
   - Webhook secret must be from Stripe Dashboard, not CLI
   - Copy exactly (starts with `whsec_`)
   - Redeploy backend after setting secret

4. **"Cannot read environment variable"**
   - Ensure variable names match exactly
   - Check spelling (case-sensitive)
   - Redeploy after adding variables

---

## Ready to Deploy?

1. Fill in all values above
2. Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
3. Use [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) to track progress
4. Test with [TEST_WEBHOOK.md](./TEST_WEBHOOK.md) instructions

Good luck! 🚀
