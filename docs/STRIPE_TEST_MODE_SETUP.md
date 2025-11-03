# Stripe Test Mode Setup Guide (For Students/Educational Use)

## Why Test Mode?
- ✅ No business verification required
- ✅ No ABN/Tax ID needed
- ✅ No bank account needed
- ✅ Fully functional for testing and demos
- ✅ Perfect for student projects and portfolios

## Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Click "Sign up"
3. Use your personal email
4. Skip any business verification prompts
5. **Make sure "Test Mode" toggle is ON** (top right of dashboard)

## Step 2: Get Your Test API Keys

1. In Stripe Dashboard, go to: **Developers** → **API Keys**
2. Ensure you're in **Test Mode** (look for the toggle)
3. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) - Click "Reveal test key"

## Step 3: Update Your .env Files

### Backend: `backend/.env`
```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### Frontend: `receipt-scanner/.env`
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

## Step 4: Create Products and Prices in Stripe

1. Go to **Products** → **Add Product**

### Premium Monthly Plan:
- Name: `Premium Monthly`
- Description: `Unlimited receipts and advanced features`
- Pricing model: `Recurring`
- Price: `$5.00 USD`
- Billing period: `Monthly`
- Click **Save Product**
- Copy the **Price ID** (starts with `price_...`)

### Premium Annual Plan:
- Name: `Premium Annual`
- Description: `Unlimited receipts and advanced features - Save 20%!`
- Pricing model: `Recurring`
- Price: `$48.00 USD`
- Billing period: `Yearly`
- Click **Save Product**
- Copy the **Price ID** (starts with `price_...`)

## Step 5: Add Price IDs to .env

Update `backend/.env`:
```env
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_YOUR_MONTHLY_PRICE_ID
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_YOUR_ANNUAL_PRICE_ID
```

## Step 6: Set Up Webhook (for local testing)

### Option A: Use Stripe CLI (Recommended)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe login`
3. Run: `stripe listen --forward-to localhost:3000/api/payment/webhook`
4. Copy the webhook signing secret (starts with `whsec_...`)
5. Add to `backend/.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Option B: Skip webhooks for now
- Set `STRIPE_WEBHOOK_SECRET=test_webhook_secret` in `.env`
- Webhooks won't work, but checkout will still function
- You'll need to manually update subscription status in database

## Step 7: Test with Test Cards

Use these test credit card numbers:

### Successful Payment:
```
Card: 4242 4242 4242 4242
Expiry: 12/34 (any future date)
CVC: 123 (any 3 digits)
ZIP: 12345 (any ZIP)
```

### Payment Requires Authentication (3D Secure):
```
Card: 4000 0025 0000 3155
Expiry: 12/34
CVC: 123
ZIP: 12345
```

### Card Declined:
```
Card: 4000 0000 0000 9995
Expiry: 12/34
CVC: 123
ZIP: 12345
```

More test cards: https://stripe.com/docs/testing

## Step 8: Test Your Integration

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd receipt-scanner && npm start`
3. Sign up for an account
4. Go to `/pricing` or `/checkout`
5. Click "Subscribe Now"
6. Use test card `4242 4242 4242 4242`
7. Complete checkout
8. You should be redirected to success page
9. Check your database - user should now be `premium` tier

## Important Notes

### For Educational/Portfolio Use:
- ✅ Keep Test Mode ON always
- ✅ Add a banner on your site: "Demo Mode - Test Payments Only"
- ✅ Show this to employers/recruiters - they understand!
- ✅ No real money will ever be charged

### Switching to Live Mode (Future):
- When you're ready to go live (after graduation, etc.):
  1. Complete Stripe business verification
  2. Provide tax information (ABN if in Australia)
  3. Connect bank account
  4. Switch to "Live Mode"
  5. Create new products in Live Mode
  6. Update .env with live API keys (pk_live_, sk_live_)

### Webhook Testing Without Stripe CLI:
If you can't install Stripe CLI, you can test manually:
1. After checkout, check Stripe Dashboard → Payments
2. You'll see the test payment
3. Manually update your database:
   ```sql
   UPDATE users
   SET subscription_tier = 'premium',
       subscription_status = 'active',
       subscription_start_date = NOW(),
       subscription_end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
   WHERE email = 'your-test-email@example.com';
   ```

## Troubleshooting

### "No API keys found"
- Make sure you're in Test Mode
- API keys are on the Developers → API Keys page
- Keys must start with `pk_test_` and `sk_test_`

### "Invalid API Key"
- Check for extra spaces when copying
- Make sure key is in the correct .env file
- Restart your backend server after updating .env

### "Price not found"
- Verify Price IDs in Stripe Dashboard → Products
- Make sure you're looking at Test Mode prices
- Price IDs must start with `price_`

### Checkout redirects but nothing happens
- Check browser console for errors
- Verify REACT_APP_STRIPE_PUBLISHABLE_KEY is set in frontend .env
- Make sure API_URL points to your backend

## Resources

- Stripe Test Mode Docs: https://stripe.com/docs/testing
- Test Card Numbers: https://stripe.com/docs/testing#cards
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Student Resources: https://stripe.com/education

---

**Remember: Test Mode is perfect for learning, development, and portfolio projects!** 🎓
