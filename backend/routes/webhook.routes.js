const express = require('express');
const router = express.Router();
const stripeConfig = require('../config/stripe.config');
const pool = require('../config/db.config');

// =====================================================
// POST /api/webhooks/test-webhook (DEVELOPMENT ONLY)
// Test webhook without signature verification
// Use this for local testing without Stripe CLI
// =====================================================
router.post('/test-webhook', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Test endpoint disabled in production' });
    }

    console.log('🧪 TEST WEBHOOK RECEIVED:', JSON.stringify(req.body, null, 2));

    const event = req.body;

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

        res.json({ received: true, message: 'Test webhook processed successfully' });

    } catch (error) {
        console.error('Error processing test webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed', details: error.message });
    }
});

// =====================================================
// POST /api/webhooks/webhook
// Handle Stripe webhook events
// NOTE: express.raw() middleware is applied in server.js
// =====================================================
router.post('/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;

    try {
        // req.body should be a Buffer from express.raw() middleware
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
    const status = subscription.status;
    const periodEnd = new Date(subscription.current_period_end * 1000);

    let subscriptionStatus = 'active';
    if (subscription.cancel_at_period_end) {
        subscriptionStatus = 'cancelled';
    } else if (status === 'past_due') {
        subscriptionStatus = 'expired';
    } else if (status === 'canceled') {
        subscriptionStatus = 'expired';
    }

    const [users] = await pool.query(
        'SELECT user_id FROM users WHERE stripe_customer_id = ?',
        [customerId]
    );

    if (users.length === 0) {
        console.error('User not found for customer:', customerId);
        return;
    }

    const userId = users[0].user_id;

    await pool.query(
        `UPDATE users SET
            subscription_status = ?,
            subscription_end_date = ?
        WHERE user_id = ?`,
        [subscriptionStatus, periodEnd, userId]
    );

    console.log(`Subscription updated for user ${userId}`);
}

async function handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);

    const customerId = subscription.customer;

    const [users] = await pool.query(
        'SELECT user_id FROM users WHERE stripe_customer_id = ?',
        [customerId]
    );

    if (users.length === 0) {
        console.error('User not found for customer:', customerId);
        return;
    }

    const userId = users[0].user_id;

    await pool.query(
        `UPDATE users SET
            subscription_tier = 'free',
            subscription_status = 'expired',
            subscription_end_date = NOW()
        WHERE user_id = ?`,
        [userId]
    );

    console.log(`Subscription cancelled for user ${userId}`);
}

async function handleInvoicePaid(invoice) {
    console.log('Invoice paid:', invoice.id);
}

async function handleInvoicePaymentFailed(invoice) {
    console.log('Invoice payment failed:', invoice.id);
}

module.exports = router;
