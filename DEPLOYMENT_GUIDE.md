# SmartSlip Deployment Guide

## Issues Fixed

### 1. ✅ SmartSlip Icon Redirect to Scanner Page
**Problem:** When clicking the SmartSlip icon/favicon, authenticated users were not being redirected to the scanner page (`/app`).

**Solution:**
- Updated `manifest.json` with proper app metadata
- Updated `index.html` with correct title and meta tags
- The existing landing page already has redirect logic in `landing.tsx` (lines 22-26)

**Files Modified:**
- `receipt-scanner/public/manifest.json` - Updated app name and theme
- `receipt-scanner/public/index.html` - Updated title and meta description

### 2. ✅ Forgot Password Not Working on Deployment
**Problem:** Forgot password emails were sending localhost URLs to users.

**Solution:**
- Added environment variables to `render.yaml`
- You need to set these variables in Render Dashboard

**Files Modified:**
- `render.yaml` - Added all required environment variables

---

## Render Dashboard Configuration

After deploying, you **MUST** set these environment variables in your Render Dashboard:

### Backend Service Environment Variables

Go to Render Dashboard → smartslip-backend → Environment

```bash
# CRITICAL - Set your deployed frontend URL
APP_URL=https://smartslip-frontend.onrender.com
FRONTEND_URL=https://smartslip-frontend.onrender.com

# Database (use Render PostgreSQL or external MySQL)
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=receipt_analyzer

# Security
JWT_SECRET=EB1AE0IY9P

# Email (Gmail SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=pankajaus7@gmail.com
MAIL_PASSWORD=wcwejnksopuutmbn
MAIL_FROM=noreply@smartslip.com

# OpenAI
OPENAI_API_KEY=your-openai-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_...
```

### Frontend Service Environment Variables

Go to Render Dashboard → smartslip-frontend → Environment

```bash
# CRITICAL - Set your deployed backend URL
REACT_APP_API_URL=https://smartslip-backend.onrender.com
```

---

## How Forgot Password Will Work After Deployment

1. User enters email on forgot password page
2. Backend generates secure token
3. Backend sends email with reset URL: `https://smartslip-frontend.onrender.com/reset-password?token=...`
4. User clicks link and resets password
5. User is redirected to login page

**IMPORTANT:** The `APP_URL` environment variable controls the reset link in emails!

---

## How Logo/Icon Redirect Works

1. User clicks favicon or bookmark
2. Browser loads root URL: `/`
3. `landing.tsx` checks authentication state (lines 22-26)
4. If authenticated → redirects to `/app` (scanner page)
5. If not authenticated → shows landing page

**This works because:**
- Auth state is stored in `localStorage`
- `AuthProvider` loads token on mount
- Landing page has `useEffect` that redirects authenticated users

---

## Testing After Deployment

### Test 1: Logo/Icon Redirect
1. Login to SmartSlip on deployment
2. Close the tab
3. Click the bookmark or type the URL
4. **Expected:** You should be redirected to `/app` (scanner page)

### Test 2: Forgot Password
1. Go to login page
2. Click "Forgot Password"
3. Enter your email
4. Check email inbox
5. **Expected:** Email should contain link to `https://your-frontend-url.onrender.com/reset-password?token=...`
6. Click the link and reset password
7. **Expected:** Redirected to login page after success

---

## Troubleshooting

### Issue: Forgot password emails still have localhost URLs

**Solution:**
```bash
# In Render Dashboard, verify APP_URL is set to:
APP_URL=https://smartslip-frontend.onrender.com

# NOT:
APP_URL=http://localhost:3001  ❌
```

### Issue: Logo click doesn't redirect to scanner

**Checklist:**
1. Are you logged in? Check if `authToken` exists in browser localStorage
2. Clear browser cache and cookies
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. Check browser console for errors

### Issue: API requests failing (CORS errors)

**Solution:**
Update `backend/server.js` CORS configuration to include your Render URLs:

```javascript
const allowedOrigins = [
    'https://smartslip-frontend.onrender.com',
    'https://smartslip-backend.onrender.com',
    process.env.FRONTEND_URL,
];
```

---

## Important URLs to Update

Replace these in Render Dashboard:

| Environment Variable | Current Value | Production Value |
|---------------------|---------------|------------------|
| `APP_URL` | `http://localhost:3001` | `https://smartslip-frontend.onrender.com` |
| `REACT_APP_API_URL` | `http://localhost:3000` | `https://smartslip-backend.onrender.com` |
| `FRONTEND_URL` | Not set | `https://smartslip-frontend.onrender.com` |

---

## Deployment Checklist

- [x] Updated `manifest.json` with app metadata
- [x] Updated `index.html` with proper title and description
- [x] Added environment variables to `render.yaml`
- [ ] Set `APP_URL` in Render Dashboard (Backend)
- [ ] Set `REACT_APP_API_URL` in Render Dashboard (Frontend)
- [ ] Set `FRONTEND_URL` in Render Dashboard (Backend)
- [ ] Set all other environment variables (DB, Email, Stripe, etc.)
- [ ] Test forgot password flow
- [ ] Test logo redirect for authenticated users
- [ ] Clear browser cache after deployment

---

## Files Changed in This Fix

1. `receipt-scanner/public/manifest.json`
   - Updated app name from "React App" to "SmartSlip"
   - Changed theme color to match brand
   - Set proper start_url

2. `receipt-scanner/public/index.html`
   - Updated title to "SmartSlip - AI Receipt Scanner & Expense Tracker"
   - Added SEO meta tags
   - Updated theme color

3. `render.yaml`
   - Added all environment variables for backend
   - Added REACT_APP_API_URL for frontend

---

## Next Steps

1. **Commit and push these changes:**
   ```bash
   git add .
   git commit -m "Fix logo redirect and forgot password for deployment"
   git push origin main
   ```

2. **Go to Render Dashboard and set environment variables** (see above sections)

3. **Trigger manual deploy** (or wait for auto-deploy)

4. **Test both features:**
   - Logo redirect when authenticated
   - Forgot password email with correct URL

5. **Clear browser cache** after deployment

---

## Support

If you encounter issues:
1. Check Render logs for backend errors
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure database is accessible from Render
