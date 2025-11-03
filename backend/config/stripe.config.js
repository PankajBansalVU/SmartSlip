const Stripe = require('stripe');
require('dotenv').config();

// Initialize Stripe with secret key from environment variables
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe configuration and helper functions
const stripeConfig = {
    // Stripe instance
    stripe,

    // Webhook secret for verifying Stripe webhook signatures
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

    // Price IDs for subscription plans (set these in Stripe Dashboard)
    priceIds: {
        premiumMonthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
        premiumAnnual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
    },

    // Success and cancel URLs for checkout
    getCheckoutUrls: (env = 'development') => {
        const baseUrl = env === 'production'
            ? process.env.APP_URL_PRODUCTION || 'https://smartslip.com'
            : process.env.APP_URL || 'http://localhost:3001';

        return {
            successUrl: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${baseUrl}/payment/cancel`,
        };
    },

    // Helper function to create a Stripe customer
    createCustomer: async (email, name, userId) => {
        try {
            const customer = await stripe.customers.create({
                email,
                name,
                metadata: {
                    userId: userId.toString(),
                },
            });
            return customer;
        } catch (error) {
            console.error('Error creating Stripe customer:', error);
            throw error;
        }
    },

    // Helper function to create a checkout session
    createCheckoutSession: async (customerId, priceId, userId, metadata = {}) => {
        try {
            const urls = stripeConfig.getCheckoutUrls(process.env.NODE_ENV);

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: urls.successUrl,
                cancel_url: urls.cancelUrl,
                metadata: {
                    userId: userId.toString(),
                    ...metadata,
                },
                allow_promotion_codes: true,
                billing_address_collection: 'auto',
                // automatic_tax: { enabled: true }, // Disabled - requires Stripe Tax configuration
            });

            return session;
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw error;
        }
    },

    // Helper function to create a portal session (for managing subscriptions)
    createPortalSession: async (customerId, returnUrl) => {
        try {
            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl,
            });

            return session;
        } catch (error) {
            console.error('Error creating portal session:', error);
            throw error;
        }
    },

    // Helper function to cancel a subscription
    cancelSubscription: async (subscriptionId, cancelAtPeriodEnd = true) => {
        try {
            const subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: cancelAtPeriodEnd,
            });

            return subscription;
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            throw error;
        }
    },

    // Helper function to immediately cancel a subscription
    cancelSubscriptionImmediately: async (subscriptionId) => {
        try {
            const subscription = await stripe.subscriptions.cancel(subscriptionId);
            return subscription;
        } catch (error) {
            console.error('Error cancelling subscription immediately:', error);
            throw error;
        }
    },

    // Helper function to retrieve a subscription
    getSubscription: async (subscriptionId) => {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            return subscription;
        } catch (error) {
            console.error('Error retrieving subscription:', error);
            throw error;
        }
    },

    // Helper function to retrieve a customer
    getCustomer: async (customerId) => {
        try {
            const customer = await stripe.customers.retrieve(customerId);
            return customer;
        } catch (error) {
            console.error('Error retrieving customer:', error);
            throw error;
        }
    },

    // Helper function to get all invoices for a customer
    getCustomerInvoices: async (customerId, limit = 10) => {
        try {
            const invoices = await stripe.invoices.list({
                customer: customerId,
                limit,
            });
            return invoices.data;
        } catch (error) {
            console.error('Error retrieving invoices:', error);
            throw error;
        }
    },

    // Helper function to verify webhook signature
    verifyWebhookSignature: (rawBody, signature) => {
    // rawBody should be a Buffer
    return stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
    );
},

    // Helper function to retrieve a checkout session
    getCheckoutSession: async (sessionId) => {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            return session;
        } catch (error) {
            console.error('Error retrieving checkout session:', error);
            throw error;
        }
    },

    // Helper function to update customer
    updateCustomer: async (customerId, updates) => {
        try {
            const customer = await stripe.customers.update(customerId, updates);
            return customer;
        } catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    },
};

// Validate Stripe configuration on startup
if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠ WARNING: STRIPE_SECRET_KEY is not set in environment variables');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠ WARNING: STRIPE_WEBHOOK_SECRET is not set in environment variables');
}

if (!process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || !process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID) {
    console.warn('⚠ WARNING: Stripe price IDs are not configured. Set STRIPE_PREMIUM_MONTHLY_PRICE_ID and STRIPE_PREMIUM_ANNUAL_PRICE_ID');
}

module.exports = stripeConfig;
