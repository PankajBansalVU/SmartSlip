# Stripe Webhook Flow - How It Works

## The Complete Flow

```
1. User clicks "Subscribe Now"
   ↓
2. Frontend calls: POST /api/payment/create-checkout-session
   ↓
3. Backend creates Stripe checkout session with metadata: { userId: 1 }
   ↓
4. User redirected to Stripe Checkout page
   ↓
5. User enters card: 4242 4242 4242 4242
   ↓
6. Payment succeeds
   ↓
7. Stripe redirects user to: /payment/success?session_id=cs_test_xxx
   ↓
8. **MEANWHILE (this happens in parallel):**
   Stripe sends webhook event to: POST localhost:3000/api/webhooks/webhook
   ↓
9. server.js receives request at /api/webhooks
   ↓
10. express.raw() middleware provides Buffer body (not parsed JSON)
   ↓
11. webhookRoutes router handles the request
   ↓
12. Webhook handler extracts stripe-signature header
   ↓
13. stripe.webhooks.constructEvent() verifies signature using Buffer body
   ↓
14. If signature valid → event object created
   ↓
15. Switch statement checks event.type === 'checkout.session.completed'
   ↓
16. handleCheckoutSessionCompleted() function is called
   ↓
17. Function extracts:
    - userId from event.data.object.metadata.userId
    - customerId from event.data.object.customer
    - subscriptionId from event.data.object.subscription
   ↓
18. Database UPDATE query runs:
    UPDATE users SET
      stripe_customer_id = 'cus_xxx',
      stripe_subscription_id = 'sub_xxx',
      subscription_tier = 'premium',
      subscription_status = 'active',
      subscription_start_date = NOW()
    WHERE user_id = 1
   ↓
19. User is now premium!
   ↓
20. User navigates to Profile → Sees Premium badge ✅
```

## Key Components

### 1. server.js Middleware Order
```javascript
// Line 54: Webhook route BEFORE express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Line 56: JSON parser for all other routes
app.use(express.json({ limit: '10mb', parameterLimit: 20000 }));

// Line 69: Regular payment routes (need JSON parsing)
app.use('/api/payment', paymentRoutes);
```

**Why this order matters:**
- Stripe signature verification requires raw Buffer body
- If express.json() runs first, body is parsed to object
- Once parsed, you can't get the raw Buffer back
- Webhook endpoint must be registered BEFORE express.json()

### 2. Webhook Route Handler
```javascript
router.post('/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature'];

    // req.body is a Buffer because of express.raw()
    let event = stripe.webhooks.constructEvent(
        req.body,          // Must be Buffer
        signature,         // From Stripe headers
        webhookSecret      // From .env
    );

    // Handle event...
});
```

### 3. Stripe CLI Forwarding
```bash
stripe listen --forward-to localhost:3000/api/webhooks/webhook
                                         ^^^^^^^^^^^^^^^^^^^
                                         Must match server route
```

Stripe CLI acts as a proxy:
```
Stripe.com → Stripe CLI → localhost:3000/api/webhooks/webhook → Your backend
```

## What Was Fixed

### Before (Broken):
```javascript
// webhook.routes.js (OLD - BROKEN)
module.exports = async (req, res) => {
    // ... webhook handler
};

// Also had this at the end:
module.exports = router;

// ❌ Two conflicting exports!
// ❌ Express doesn't know what to do with a function export
```

### After (Fixed):
```javascript
// webhook.routes.js (NEW - WORKING)
const express = require('express');
const router = express.Router();

router.post('/webhook', async (req, res) => {
    // ... webhook handler
});

module.exports = router;

// ✅ Single router export
// ✅ Express can mount router properly
```

## Testing Checklist

- [ ] Backend running on port 3000
- [ ] Stripe CLI listening and forwarding to localhost:3000/api/webhooks/webhook
- [ ] Webhook secret in .env matches Stripe CLI output
- [ ] Frontend running on port 3001
- [ ] User logged in
- [ ] Test card ready: 4242 4242 4242 4242

## Expected Logs

### Backend Console (when webhook succeeds):
```
Checkout session completed: cs_test_xxxxxxxxxxxxx
User 1 subscribed successfully
```

### Stripe CLI Console:
```
✔ Received event checkout.session.completed [evt_xxx]
→ POST localhost:3000/api/webhooks/webhook [evt_xxx]
← [200] POST localhost:3000/api/webhooks/webhook [evt_xxx]
```

### Frontend Console (in browser):
```
Payment successful: cs_test_xxxxxxxxxxxxx
Redirecting to success page...
```

## Common Issues Fixed

1. ✅ Malformed router export → Fixed
2. ✅ express.json() running before webhook route → Fixed
3. ✅ Duplicate /api/payment mounting → Fixed
4. ✅ Webhook route path mismatch → Fixed

## What to Do Now

1. **Restart backend** (to load fixed files)
2. **Start Stripe CLI** (to forward webhooks)
3. **Test subscription flow** (make a test purchase)
4. **Verify database** (check user is premium)
5. **Check frontend** (profile should show premium badge)

If everything works → Webhooks are fixed! 🎉
If still errors → Check [TEST_WEBHOOK.md](./TEST_WEBHOOK.md) for troubleshooting
