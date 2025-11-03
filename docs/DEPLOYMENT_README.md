# 🚀 SmartSlip Deployment Documentation

Complete guide for deploying SmartSlip to production (Vercel + Railway).

---

## 📚 Documentation Index

### Quick Start
1. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete step-by-step deployment guide
2. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Checklist to track deployment progress
3. **[env-template.md](./env-template.md)** - Environment variables templates for Railway/Vercel

### Understanding Webhooks
4. **[TEST_WEBHOOK.md](./TEST_WEBHOOK.md)** - How to test Stripe webhooks locally
5. **[WEBHOOK_FLOW.md](./WEBHOOK_FLOW.md)** - Complete explanation of webhook flow
6. **[LOCAL_VS_PRODUCTION.md](./LOCAL_VS_PRODUCTION.md)** - Differences between local and production

---

## 🎯 Quick Answer to Your Question

**"Would hosting impact webhooks?"**

**YES!** Hosting changes how webhooks work:

### Local Development (Current):
```
Stripe → Stripe CLI (on your computer) → localhost:3000
```
- ❌ Only works when your computer is on
- ❌ Only works when Stripe CLI is running
- ⚠️ Webhook secret changes each time

### Production (Hosted):
```
Stripe → Railway Backend (public URL)
```
- ✅ Works 24/7
- ✅ No Stripe CLI needed
- ✅ Permanent webhook secret
- ✅ Can demo to anyone, anytime

**The good news:** The webhook code you wrote is the same! You just need to:
1. Configure webhook in Stripe Dashboard (instead of CLI)
2. Use production webhook secret (from Dashboard)
3. Everything else stays the same

---

## 🏗️ Recommended Hosting Stack

### Frontend → Vercel
- **Why:** Free, optimized for React, auto-deploys from GitHub
- **Cost:** $0/month
- **Setup time:** 10 minutes
- **URL:** `https://smartslip.vercel.app`

### Backend → Railway
- **Why:** Easy Node.js hosting, includes MySQL, simple configuration
- **Cost:** $5/month free credit (enough for demo)
- **Setup time:** 30 minutes
- **URL:** `https://smartslip-backend.up.railway.app`

### Database → Railway MySQL
- **Why:** Included with Railway, easy setup, automatic backups
- **Cost:** Included in Railway free credit
- **Setup time:** 5 minutes (automatic)

---

## ⚡ Quick Deployment Steps

### 1️⃣ Deploy Backend (Railway)
```bash
1. Create Railway account → railway.app
2. New Project → Deploy from GitHub
3. Select your repository
4. Add MySQL database
5. Set environment variables (see env-template.md)
6. Deploy automatically
7. Get backend URL: https://your-app.up.railway.app
```

### 2️⃣ Deploy Frontend (Vercel)
```bash
1. Create Vercel account → vercel.com
2. Import GitHub repository
3. Root directory: receipt-scanner
4. Add environment variable:
   REACT_APP_API_URL=https://your-backend.railway.app
5. Deploy
6. Get frontend URL: https://your-app.vercel.app
```

### 3️⃣ Configure Stripe Webhooks
```bash
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: https://your-backend.railway.app/api/webhooks/webhook
3. Select events: checkout.session.completed (+ others)
4. Copy webhook secret (starts with whsec_)
5. Add to Railway environment variables
6. Redeploy backend
```

### 4️⃣ Test Everything
```bash
1. Visit your Vercel URL
2. Register account
3. Upload receipt (test OCR)
4. Subscribe to Premium (test card: 4242 4242 4242 4242)
5. Verify webhook received (check Railway logs)
6. Verify user upgraded (check database)
7. See Premium badge on Profile
✅ Done!
```

---

## 📋 Which Guide to Follow?

### If you want step-by-step instructions:
👉 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**
- Detailed walkthrough
- Every click explained
- Screenshots and examples

### If you want to track progress:
👉 **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**
- Checkbox format
- Track what's done
- Don't miss any steps

### If you need environment variables:
👉 **[env-template.md](./env-template.md)**
- Copy-paste templates
- Explanation for each variable
- Where to find values

### If webhooks aren't working:
👉 **[TEST_WEBHOOK.md](./TEST_WEBHOOK.md)**
- Troubleshooting guide
- Testing locally first
- Common issues and fixes

### If you want to understand webhooks:
👉 **[WEBHOOK_FLOW.md](./WEBHOOK_FLOW.md)**
- Complete flow explanation
- How it works locally vs production
- What was fixed

### If you're confused about local vs hosted:
👉 **[LOCAL_VS_PRODUCTION.md](./LOCAL_VS_PRODUCTION.md)**
- Side-by-side comparison
- When to use each
- Migration path

---

## ⏱️ Time Estimates

- **Reading docs:** 30 minutes
- **Backend deployment:** 30 minutes
- **Frontend deployment:** 15 minutes
- **Stripe webhook setup:** 15 minutes
- **Testing:** 15 minutes
- **Troubleshooting:** 15-30 minutes (if needed)

**Total: 2-3 hours for first deployment**

Once you've done it once, future deployments take ~15 minutes.

---

## 💰 Cost Breakdown

### Free Tier (Perfect for Demo)
- Vercel: $0
- Railway: $5/month free credit
- Stripe (test mode): $0
- **Total: ~$0-5/month**

### If Railway Free Credit Runs Out
- Railway: $10-20/month (depends on usage)
- Alternative: Render.com (free tier with limitations)

### For Real Business (Live Mode)
- Same hosting costs
- + Stripe processing fees (2.9% + 30¢ per transaction)

---

## ✅ What You Get After Deployment

### For Recruiters/Portfolio:
- ✅ Live demo URL (24/7 available)
- ✅ Professional domain option
- ✅ Working Stripe integration
- ✅ Full-stack demonstration
- ✅ Production-ready code
- ✅ Scalable architecture

### Technical Features:
- ✅ HTTPS (SSL) automatic
- ✅ Auto-deploy from GitHub
- ✅ Environment variable management
- ✅ Database backups
- ✅ Server logs and monitoring
- ✅ Webhook automation

---

## 🚨 Important Notes

### Stripe Test Mode vs Live Mode

**For Demo/Portfolio (Recommended):**
- Use **TEST MODE** keys
- Safe, no real money
- Test cards only (4242 4242 4242 4242)
- Don't need ABN/business verification
- Perfect for showing to recruiters

**For Real Business:**
- Use **LIVE MODE** keys
- Real credit cards
- Real money charged
- Need verified Stripe account
- Need ABN (Australia)
- Need bank account for payouts

### Current Setup:
Your app is configured for **TEST MODE** - perfect for deployment as a demo!

---

## 🔄 Deployment Workflow

### Initial Deployment:
```
Code (local) → GitHub → Railway/Vercel → Live Site
```

### Making Updates:
```
1. Edit code locally
2. Test locally
3. git add . && git commit -m "message"
4. git push origin main
5. Auto-deploys to production
6. Test production site
```

---

## 🐛 Common Issues & Solutions

### "Webhook not received"
- ✅ Check webhook URL in Stripe Dashboard
- ✅ Verify webhook secret in Railway
- ✅ Check Railway logs for errors

### "CORS error"
- ✅ Add Vercel URL to backend CORS whitelist
- ✅ Redeploy backend

### "Database connection failed"
- ✅ Verify database credentials
- ✅ Check Railway MySQL is running

### "Payment succeeds but user not upgraded"
- ✅ Check webhook received in Railway logs
- ✅ Verify userId in checkout session metadata
- ✅ Check database directly

**Full troubleshooting:** See [TEST_WEBHOOK.md](./TEST_WEBHOOK.md)

---

## 📞 Next Steps

1. **Read** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions
2. **Follow** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) step by step
3. **Use** [env-template.md](./env-template.md) for environment variables
4. **Test** using [TEST_WEBHOOK.md](./TEST_WEBHOOK.md)
5. **Share** your live demo URL!

---

## 🎓 Learning Resources

### Understanding the Stack:
- **Vercel:** [vercel.com/docs](https://vercel.com/docs)
- **Railway:** [docs.railway.app](https://docs.railway.app)
- **Stripe Webhooks:** [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)

### Deployment Platforms:
- **Vercel Dashboard:** [vercel.com/dashboard](https://vercel.com/dashboard)
- **Railway Dashboard:** [railway.app/dashboard](https://railway.app/dashboard)
- **Stripe Dashboard:** [dashboard.stripe.com](https://dashboard.stripe.com)

---

## 🎉 Success Criteria

Your deployment is successful when:

- [ ] Frontend loads at Vercel URL
- [ ] Can register and login
- [ ] Can upload receipts
- [ ] Can subscribe with test card (4242 4242 4242 4242)
- [ ] Webhook received (check Railway logs)
- [ ] User upgraded to premium
- [ ] Profile shows Premium badge
- [ ] Everything works 24/7
- [ ] Can share URL with recruiters

---

## 💡 Pro Tips

1. **Test locally first** - Make sure everything works on localhost before deploying
2. **Deploy backend first** - Frontend needs backend URL
3. **Use test mode** - Keep Stripe in test mode for demo
4. **Check logs** - Railway and Vercel have excellent logging
5. **Commit often** - Auto-deploy triggers on every push
6. **Keep .env secret** - Never commit to GitHub
7. **Monitor webhooks** - Stripe Dashboard shows webhook delivery status

---

## 📊 Deployment Status Template

Use this to track your deployment:

```
🚀 SmartSlip Deployment Status

Frontend (Vercel)
- [ ] Deployed
- [ ] URL: _________________
- [ ] Environment variables set

Backend (Railway)
- [ ] Deployed
- [ ] URL: _________________
- [ ] Environment variables set
- [ ] Database connected

Stripe Webhooks
- [ ] Endpoint created
- [ ] Events selected
- [ ] Secret added to Railway
- [ ] Test webhook sent

Testing
- [ ] Frontend loads
- [ ] Can register/login
- [ ] Can upload receipt
- [ ] Can subscribe
- [ ] Webhook works
- [ ] User upgraded

✅ Ready for demo!
```

---

## 🤝 Need Help?

1. Check the specific guide for your issue
2. Read [LOCAL_VS_PRODUCTION.md](./LOCAL_VS_PRODUCTION.md) to understand differences
3. Follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) step by step
4. Review [TEST_WEBHOOK.md](./TEST_WEBHOOK.md) for webhook troubleshooting

---

## 🌟 You're Ready!

You have everything you need to deploy SmartSlip to production:

✅ Complete deployment guide
✅ Step-by-step checklist
✅ Environment variable templates
✅ Webhook testing instructions
✅ Troubleshooting guides
✅ Local vs production comparison

**Start with:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

Good luck! 🚀
