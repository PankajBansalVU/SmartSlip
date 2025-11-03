# Fix Checkout Page - Quick Steps

The issue is that your frontend is using a cached ngrok URL instead of localhost. Here's how to fix it:

## Step 1: Stop Both Servers

1. Stop frontend (Ctrl+C in the terminal running React)
2. Stop backend (Ctrl+C in the terminal running Node)

## Step 2: Clear React Cache

```bash
cd receipt-scanner
rm -rf node_modules/.cache
# OR on Windows:
rmdir /s node_modules\.cache
```

## Step 3: Verify Backend Routes Exist

Make sure you have these files:
- ✅ `backend/routes/payment.routes.js`
- ✅ `backend/routes/subscription.routes.js`

## Step 4: Check Database Has Plans

Open MySQL and run:

```sql
SELECT * FROM subscription_plans;
```

You should see 3 rows. If not, run the migration again with the fixed `interval` keyword.

## Step 5: Restart Backend

```bash
cd backend
npm start
```

Wait for: "Server running on port 3000"

## Step 6: Test Backend API Directly

Open browser or Postman and test:

**Get Plans:**
```
GET http://localhost:3000/api/subscription/plans
```

You should see JSON with 3 plans (Free, Premium Monthly, Premium Annual).

If this fails, check backend console for errors.

## Step 7: Restart Frontend (Fresh)

```bash
cd receipt-scanner

# Clear cache and restart
npm start
```

This will rebuild and use the correct API URL from .env

## Step 8: Clear Browser Cache

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

OR

Press: `Ctrl + Shift + Delete` → Clear cached images and files

## Step 9: Test Checkout Page

Go to: http://localhost:3001/checkout

You should now see the Premium plan cards!

---

## Still Not Working?

### Check 1: Environment Variable is Loading

Add this temporarily to `receipt-scanner/src/pages/checkout.tsx` at the top of the component:

```typescript
console.log('API URL:', process.env.REACT_APP_API_URL);
```

Restart frontend and check browser console. It should show:
```
API URL: http://localhost:3000
```

If it shows `undefined` or the ngrok URL, the .env isn't being read.

### Check 2: Backend Routes Responding

Test in browser:
```
http://localhost:3000/api/subscription/plans
```

Should return JSON like:
```json
{
  "success": true,
  "plans": [
    {
      "plan_id": 1,
      "plan_name": "Free Plan",
      "price": "0.00",
      ...
    },
    ...
  ]
}
```

If you get 404, the routes aren't loaded. Check backend console for errors.

### Check 3: CORS is Configured

In `backend/server.js`, verify CORS includes localhost:3001:

```javascript
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
```

---

## Quick Checklist

- [ ] Backend migration ran successfully (subscription_plans table exists)
- [ ] 3 plans inserted into database
- [ ] Backend server running on port 3000
- [ ] Backend routes responding (test in browser)
- [ ] Frontend .env has REACT_APP_API_URL=http://localhost:3000
- [ ] Frontend server restarted (npm start)
- [ ] Browser cache cleared
- [ ] Checkout page loads without CORS errors
- [ ] Plans appear on checkout page

---

## Nuclear Option (If Still Not Working)

1. Stop both servers
2. Delete `receipt-scanner/node_modules/.cache` folder entirely
3. Delete `receipt-scanner/build` folder (if exists)
4. Restart backend: `cd backend && npm start`
5. Restart frontend: `cd receipt-scanner && npm start`
6. Clear browser cache completely
7. Test again

---

## Expected Result

After these steps, going to http://localhost:3001/checkout should show:

- ✅ "Upgrade to Premium" heading
- ✅ Monthly/Annual toggle
- ✅ Premium plan card with $5/month or $48/year
- ✅ List of features (Unlimited receipts, etc.)
- ✅ "Subscribe Now" button
- ✅ No CORS errors in console
- ✅ No 404 errors in console

The "Subscribe Now" button won't work yet because you haven't set up Stripe products with real price IDs.
