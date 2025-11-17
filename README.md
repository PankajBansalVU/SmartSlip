# SmartSlip - AI-Powered Receipt Scanner & Expense Tracker

SmartSlip is a modern web application that uses AI to scan receipts, extract data, and help users track their expenses effortlessly. Built with React, Node.js, and powered by Google Cloud Vision API and OpenAI.

## Features

### Free Tier
- Scan and upload receipts via camera or file upload
- **AI-powered receipt data extraction** using GPT-4o (store name, items, prices, tax, total)
- **Automatic total validation** to ensure accuracy
- **Duplicate receipt detection** to prevent double-counting
- View receipt history
- Basic spending analysis
- Export receipts to CSV/Excel/PDF
- Monthly budget tracking (10 receipts/month limit)

### Premium Tier
- **Unlimited receipt scans**
- Advanced spending analytics with interactive charts
- Category-based expense tracking with visualizations
- Monthly/yearly spending reports
- Export to multiple formats (CSV, Excel, PDF)
- Priority support

## Tech Stack

### Frontend
- **React** 18.2 with TypeScript
- **React Router** for navigation
- **Bootstrap** 5.3 for UI components
- **Chart.js** & **Recharts** for data visualization
- **Lucide React** for icons
- Deployed on **Render**

### Backend
- **Node.js** with Express.js
- **MySQL** database with connection pooling
- **JWT** authentication with 7-day tokens
- **Stripe** for payments and subscriptions
- **Google Cloud Vision API** for OCR
- **OpenAI GPT-4o** for intelligent receipt analysis with validation
- **Tesseract.js** as OCR fallback
- **Nodemailer** for email notifications (password reset, etc.)
- **Sharp** for image optimization (60-75% faster processing)
- Deployed on **Render**

## Project Structure

```
SmartSlip/
├── backend/
│   ├── config/
│   │   ├── db.config.js              # Database connection with SSL support
│   │   ├── stripe.config.js          # Stripe integration
│   │   └── migrations.sql            # Database schema
│   ├── middleware/
│   │   ├── premiumGate.js            # Premium feature access control
│   │   └── usageTracker.js           # Track API usage limits
│   ├── routes/
│   │   ├── payment.routes.js         # Payment endpoints
│   │   ├── subscription.routes.js    # Subscription management
│   │   └── webhook.routes.js         # Stripe webhooks
│   ├── public/                       # Static files
│   ├── uploads/                      # Receipt image uploads
│   ├── server.js                     # Main entry point
│   ├── auth.routes.js                # Authentication endpoints
│   ├── spending.routes.js            # Spending analytics
│   ├── reports.routes.js             # Report generation
│   └── package.json
│
└── receipt-scanner/
    ├── public/
    │   └── _redirects                # Render client-side routing config
    ├── src/
    │   ├── components/
    │   │   ├── navbar.tsx            # Navigation bar
    │   │   ├── PrivateRoute.tsx      # Protected route wrapper
    │   │   ├── Paywall.tsx           # Premium upgrade prompt
    │   │   ├── SubscriptionBadge.tsx # User subscription status
    │   │   ├── UpgradePrompt.tsx     # Upgrade call-to-action
    │   │   ├── UsageQuota.tsx        # Usage limit display
    │   │   ├── theme-provider.tsx    # Dark/light theme
    │   │   └── ui/                   # Reusable UI components
    │   ├── contexts/
    │   │   ├── auth-context.tsx      # Authentication state
    │   │   └── subscription-context.tsx # Subscription state
    │   ├── pages/
    │   │   ├── landing.tsx           # Landing page
    │   │   ├── login.tsx             # Login page
    │   │   ├── signup.tsx            # Registration page
    │   │   ├── home.tsx              # Receipt scanning dashboard
    │   │   ├── history.tsx           # Receipt history & management
    │   │   ├── SpendingAnalysis.tsx  # Analytics & charts
    │   │   ├── pricing.tsx           # Subscription plans
    │   │   ├── checkout.tsx          # Stripe checkout
    │   │   ├── subscription.tsx      # Manage subscription
    │   │   ├── profile.tsx           # User profile
    │   │   ├── payment-success.tsx   # Payment confirmation
    │   │   └── payment-cancel.tsx    # Payment cancellation
    │   ├── services/
    │   │   ├── subscriptionService.ts # Subscription API calls
    │   │   └── stripeService.ts      # Stripe API calls
    │   ├── config/
    │   │   └── api.ts                # Centralized API configuration
    │   ├── utils/                    # Utility functions
    │   ├── types/                    # TypeScript types
    │   ├── App.tsx                   # Main app component
    │   └── index.tsx                 # Entry point
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js 18.x or higher
- MySQL database
- Google Cloud account (for Vision API)
- OpenAI API key
- Stripe account
- Render account (for deployment)
- Aiven account (for MySQL hosting)

### Local Development

#### 1. Clone the repository
```bash
git clone https://github.com/PankajBansalVU/SmartSlip.git
cd SmartSlip
```

#### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# Server
PORT=5001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=receipt_analyzer

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Email Configuration (for password reset, notifications)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-specific-password
MAIL_FROM=SmartSlip <noreply@smartslip.com>

# Google Cloud Vision API
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json

# OpenAI API
OPENAI_API_KEY=sk-proj-your_openai_api_key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_your_annual_price_id

# Frontend URLs
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3001
```

Create the database and run migrations:
```bash
mysql -u root -p -e "CREATE DATABASE receipt_analyzer;"
mysql -u root -p receipt_analyzer < config/migrations.sql
```

Start the backend:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

Backend runs on `http://localhost:5001`

#### 3. Frontend Setup

```bash
cd receipt-scanner
npm install
```

Create a `.env` file in the `receipt-scanner` directory:

```env
REACT_APP_API_URL=http://localhost:5001
```

Start the frontend:
```bash
npm start
```

Frontend runs on `http://localhost:3001`

## Deployment

### Automated Deployment with render.yaml

This project includes a `render.yaml` file for **automated deployment** of both frontend and backend on Render.

**Quick Deploy:**
1. Push code to GitHub
2. Connect repository to Render
3. Render automatically detects `render.yaml` and creates both services
4. Add environment variables in Render dashboard
5. Both services deploy automatically!

### Manual Backend Deployment (Render)

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: Node
4. Add environment variables (see table below)
5. Deploy!

### Manual Frontend Deployment (Render)

1. Create a new **Static Site** on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `cd receipt-scanner && npm install && npm run build`
   - **Publish Directory**: `receipt-scanner/build`
   - **Environment**: Static
4. Add environment variable:
   - `REACT_APP_API_URL` = `https://your-backend-url.onrender.com`
5. Add rewrite rule for SPA routing:
   ```
   Source: /*
   Destination: /index.html
   ```
6. Deploy!

### Database Setup

**Option 1: Local MySQL (Development)**
- Use local MySQL server
- Run migrations with `mysql -u root -p receipt_analyzer < config/migrations.sql`

**Option 2: Cloud MySQL (Production)**
Popular options:
- **Aiven** - Managed MySQL with free tier
- **PlanetScale** - Serverless MySQL
- **AWS RDS** - Enterprise-grade
- **Google Cloud SQL** - Managed MySQL

**Aiven Setup Example:**
1. Create a MySQL instance on Aiven
2. In Aiven console, go to **Allowed IP Addresses**
3. Add `0.0.0.0/0` to whitelist (for Render access)
4. Import schema: Upload `backend/config/migrations.sql`
5. Update Render backend environment variables:
   - `DB_HOST` = Aiven host
   - `DB_PORT` = Aiven port
   - `DB_USER` = Aiven username
   - `DB_PASSWORD` = Aiven password

### Stripe Webhook Configuration

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter URL: `https://your-backend-url.onrender.com/api/webhooks/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to Render backend environment: `STRIPE_WEBHOOK_SECRET`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/reset-password` - Reset password

### Receipts
- `GET /receipts` - Get user's receipts
- `POST /upload` - Upload receipt image
- `POST /analyze-receipt` - Analyze receipt with AI
- `POST /save-receipt` - Save receipt data
- `PUT /receipts/:id` - Update receipt
- `DELETE /receipts/:id` - Delete receipt
- `GET /receipts/export` - Export receipts (CSV/Excel/PDF)

### Spending Analytics
- `GET /api/spending/summary` - Get spending summary
- `GET /api/spending/categories` - Get category breakdown
- `GET /api/spending/trends` - Get spending trends

### Subscription & Payments
- `POST /api/payment/create-checkout-session` - Create Stripe checkout
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/webhooks/webhook` - Stripe webhook handler

## Environment Variables

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5001` |
| `NODE_ENV` | Environment | `production` |
| `DB_HOST` | MySQL host | `mysql-xxxxx.aiven.com` or `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | Database user | `root` or `avnadmin` |
| `DB_PASSWORD` | Database password | `your_password` |
| `DB_NAME` | Database name | `receipt_analyzer` |
| `JWT_SECRET` | JWT signing key (256-bit) | Random 64-char hex string |
| `MAIL_HOST` | SMTP server | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | Email username | `your-email@gmail.com` |
| `MAIL_PASSWORD` | Email password | App-specific password |
| `MAIL_FROM` | From address | `SmartSlip <noreply@smartslip.com>` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` or `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` or `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Monthly plan price ID | `price_...` |
| `STRIPE_PREMIUM_ANNUAL_PRICE_ID` | Annual plan price ID | `price_...` |
| `APP_URL` | Backend URL | `https://smartslip-backend.onrender.com` |
| `FRONTEND_URL` | Frontend URL (for CORS) | `https://smartslip-frontend.onrender.com` |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `https://smartslip.onrender.com` |

## How It Works

### Receipt Scanning Flow
1. **Upload**: User uploads receipt via camera or file upload
2. **Image Optimization**: Sharp library conditionally optimizes large images (60-75% faster)
3. **OCR**: Google Cloud Vision API extracts raw text from image
4. **AI Analysis**: OpenAI GPT-4o structures data into JSON (store, items, prices, tax, total)
5. **Validation**: Backend validates totals (ensures `total = subtotal + tax`)
6. **Duplicate Detection**: Checks for existing receipts with same store/date/total
7. **Categorization**: Items automatically categorized (Groceries, Dining, etc.)
8. **Save**: Data saved to MySQL database
9. **Display**: User can view, edit, or delete receipt

### Key Features

**🔍 Duplicate Detection**
- Compares new receipts against existing ones
- Matches on: user_id, store_name, total, date
- Returns 409 Conflict if duplicate found
- User can choose to save anyway or discard

**✅ Total Validation**
- AI sometimes calculates totals incorrectly
- Backend validates: `total = subtotal + tax` (±$0.10 tolerance)
- If mismatch detected, uses 3-strategy correction:
  1. If items sum = total → recalculate subtotal
  2. If items sum = subtotal → recalculate total
  3. Otherwise → use items sum as subtotal, recalculate total

**📧 Email Validation**
- Blocks 50+ disposable email domains
- Detects common typos (gmial→gmail, yahooo→yahoo)
- Suggests corrections to user

**⚡ Performance Optimizations**
- Conditional image resize (only if >1500px or >2MB)
- Batch database inserts for receipt items
- SQL query optimization with indexes (60-75% faster)
- React memoization for chart rendering

### Subscription System
- **Free users**: Limited to 10 receipts per month
- **Premium users**: Unlimited receipts + advanced analytics + exports
- **Payment**: Handled by Stripe Checkout (monthly/annual plans)
- **Webhooks**: Automatic subscription status updates via Stripe webhooks
- **Access Control**: `premiumGate` middleware protects premium endpoints
- **Usage Tracking**: `usageTracker` middleware monitors receipt counts

## Recent Improvements

### November 2024 Updates
- ✅ **Fixed total calculation errors** - Added validation layer to ensure accurate receipt totals
- ✅ **Improved AI model** - Switched from GPT-4o-mini to GPT-4o for better accuracy
- ✅ **Enhanced prompt engineering** - More explicit instructions for date/total extraction
- ✅ **Duplicate detection** - Prevents double-counting of receipts
- ✅ **Email validation** - Blocks disposable emails and suggests typo corrections
- ✅ **Performance optimization** - 60-75% faster receipt processing through conditional image optimization
- ✅ **Fixed authentication issues** - Extended JWT tokens to 7 days, improved error handling
- ✅ **Chart rendering optimization** - React memoization and backend aggregation
- ✅ **Mobile UI improvements** - Fixed dropdown positioning and responsive design
- ✅ **Report accuracy fixes** - Fixed SQL queries with COALESCE and COUNT DISTINCT

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please open an issue on GitHub.

## Acknowledgments

- Google Cloud Vision API for OCR capabilities
- OpenAI for intelligent data extraction
- Stripe for payment processing
- Chart.js and Recharts for visualizations
- Bootstrap for UI components
- Render for hosting
- Aiven for managed MySQL

---

**Built with ❤️ by Pankaj Bansal**

Live Demo: [https://smartslip-1.onrender.com](https://smartslip-1.onrender.com)
