const express = require('express');
const router = express.Router();
const stripeConfig = require('../config/stripe.config');
const pool = require('../config/db.config');

// Import authentication middleware from auth.routes.js
const { authenticateUser } = require('../auth.routes');

// =====================================================
// POST /api/payment/create-checkout-session
// Create a Stripe checkout session for subscription
// =====================================================
router.post('/create-checkout-session', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { priceId, planType } = req.body; // 'monthly' or 'annual'

        if (!priceId) {
            return res.status(400).json({
                success: false,
                message: 'Price ID is required'
            });
        }

        // Get user details from database
        const [users] = await pool.query(
            'SELECT user_id, email, name, stripe_customer_id FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];
        let customerId = user.stripe_customer_id;

        // Create Stripe customer if doesn't exist
        if (!customerId) {
            const customer = await stripeConfig.createCustomer(
                user.email,
                user.name,
                user.user_id
            );
            customerId = customer.id;

            // Update user with Stripe customer ID
            await pool.query(
                'UPDATE users SET stripe_customer_id = ? WHERE user_id = ?',
                [customerId, userId]
            );
        }

        // Create checkout session
        const session = await stripeConfig.createCheckoutSession(
            customerId,
            priceId,
            userId,
            { planType }
        );

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create checkout session',
            error: error.message
        });
    }
});

// =====================================================
// POST /api/payment/create-portal-session
// Create a Stripe customer portal session for managing subscription
// =====================================================
router.post('/create-portal-session', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user's Stripe customer ID
        const [users] = await pool.query(
            'SELECT stripe_customer_id FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0 || !users[0].stripe_customer_id) {
            return res.status(404).json({
                success: false,
                message: 'No active subscription found'
            });
        }

        const customerId = users[0].stripe_customer_id;
        const returnUrl = `${process.env.APP_URL || 'http://localhost:3001'}/subscription`;

        // Create portal session
        const session = await stripeConfig.createPortalSession(customerId, returnUrl);

        res.json({
            success: true,
            url: session.url
        });

    } catch (error) {
        console.error('Error creating portal session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create portal session',
            error: error.message
        });
    }
});

// =====================================================
// POST /api/payment/webhook
// Handle Stripe webhook events
// IMPORTANT: This endpoint should NOT use authenticateUser middleware
// =====================================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];

    let event;

    try {
        // Verify webhook signature
        event = stripeConfig.verifyWebhookSignature(req.body, signature);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;

            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// =====================================================
// Webhook Handler Functions
// =====================================================

async function handleCheckoutSessionCompleted(session) {
    console.log('Checkout session completed:', session.id);

    const userId = session.metadata.userId;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    if (!userId) {
        console.error('No userId in session metadata');
        return;
    }

    // Update user with subscription details
    await pool.query(
        `UPDATE users SET
            stripe_customer_id = ?,
            stripe_subscription_id = ?,
            subscription_tier = 'premium',
            subscription_status = 'active',
            subscription_start_date = NOW()
        WHERE user_id = ?`,
        [customerId, subscriptionId, userId]
    );

    console.log(`User ${userId} subscribed successfully`);
}

async function handleSubscriptionCreated(subscription) {
    console.log('Subscription created:', subscription.id);

    const customerId = subscription.customer;

    // Find user by stripe_customer_id
    const [users] = await pool.query(
        'SELECT user_id FROM users WHERE stripe_customer_id = ?',
        [customerId]
    );

    if (users.length === 0) {
        console.error('User not found for customer:', customerId);
        return;
    }

    const userId = users[0].user_id;
    const periodEnd = new Date(subscription.current_period_end * 1000);

    await pool.query(
        `UPDATE users SET
            stripe_subscription_id = ?,
            subscription_tier = 'premium',
            subscription_status = 'active',
            subscription_start_date = NOW(),
            subscription_end_date = ?
        WHERE user_id = ?`,
        [subscription.id, periodEnd, userId]
    );

    console.log(`Subscription activated for user ${userId}`);
}

async function handleSubscriptionUpdated(subscription) {
    console.log('Subscription updated:', subscription.id);

    const customerId = subscription.customer;
    const status = subscription.status; // active, past_due, canceled, etc.
    const periodEnd = new Date(subscription.current_period_end * 1000);

    // Map Stripe status to our status
    let subscriptionStatus = 'active';
    if (subscription.cancel_at_period_end) {
        subscriptionStatus = 'cancelled';
    } else if (status === 'past_due') {
        subscriptionStatus = 'expired';
    } else if (status === 'canceled') {
        subscriptionStatus = 'expired';
    }

    await pool.query(
        `UPDATE users SET
            subscription_status = ?,
            subscription_end_date = ?
        WHERE stripe_customer_id = ?`,
        [subscriptionStatus, periodEnd, customerId]
    );

    console.log(`Subscription ${subscription.id} status updated to ${subscriptionStatus}`);
}

async function handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);

    const customerId = subscription.customer;

    // Downgrade user to free tier
    await pool.query(
        `UPDATE users SET
            subscription_tier = 'free',
            subscription_status = 'expired',
            subscription_end_date = NOW(),
            stripe_subscription_id = NULL
        WHERE stripe_customer_id = ?`,
        [customerId]
    );

    console.log(`User downgraded to free tier for subscription ${subscription.id}`);
}

async function handleInvoicePaid(invoice) {
    console.log('Invoice paid:', invoice.id);

    const customerId = invoice.customer;
    const amount = invoice.amount_paid / 100; // Convert from cents
    const currency = invoice.currency.toUpperCase();

    // Find user
    const [users] = await pool.query(
        'SELECT user_id FROM users WHERE stripe_customer_id = ?',
        [customerId]
    );

    if (users.length === 0) {
        console.error('User not found for customer:', customerId);
        return;
    }

    const userId = users[0].user_id;

    // Record payment in payment_history
    await pool.query(
        `INSERT INTO payment_history (
            user_id,
            amount,
            currency,
            status,
            stripe_payment_intent_id,
            stripe_invoice_id,
            payment_method,
            description,
            paid_at
        ) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, NOW())`,
        [
            userId,
            amount,
            currency,
            invoice.payment_intent,
            invoice.id,
            invoice.payment_method_types?.[0] || 'card',
            `Subscription payment - Invoice ${invoice.number}`
        ]
    );

    console.log(`Payment recorded for user ${userId}: ${currency} ${amount}`);
}

async function handleInvoicePaymentFailed(invoice) {
    console.log('Invoice payment failed:', invoice.id);

    const customerId = invoice.customer;
    const amount = invoice.amount_due / 100;
    const currency = invoice.currency.toUpperCase();

    // Find user
    const [users] = await pool.query(
        'SELECT user_id FROM users WHERE stripe_customer_id = ?',
        [customerId]
    );

    if (users.length === 0) {
        console.error('User not found for customer:', customerId);
        return;
    }

    const userId = users[0].user_id;

    // Record failed payment
    await pool.query(
        `INSERT INTO payment_history (
            user_id,
            amount,
            currency,
            status,
            stripe_payment_intent_id,
            stripe_invoice_id,
            description
        ) VALUES (?, ?, ?, 'failed', ?, ?, ?)`,
        [
            userId,
            amount,
            currency,
            invoice.payment_intent,
            invoice.id,
            `Failed payment - Invoice ${invoice.number}`
        ]
    );

    // TODO: Send email notification about failed payment
    console.log(`Failed payment recorded for user ${userId}`);
}

module.exports = router;
