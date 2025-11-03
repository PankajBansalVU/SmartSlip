const express = require('express');
const router = express.Router();
const pool = require('../config/db.config');
const stripeConfig = require('../config/stripe.config');

// Import authentication middleware from auth.routes.js
const { authenticateUser } = require('../auth.routes');

// =====================================================
// GET /api/subscription/plans
// Get all available subscription plans
// =====================================================
router.get('/plans', async (req, res) => {
    try {
        const [plans] = await pool.query(
            `SELECT
                plan_id,
                plan_name,
                plan_type,
                price,
                currency,
                \`interval\`,
                receipt_limit,
                history_days,
                can_export,
                can_advanced_analytics,
                can_scheduled_reports,
                can_bulk_operations,
                can_custom_tags,
                stripe_price_id
            FROM subscription_plans
            WHERE is_active = 1
            ORDER BY sort_order ASC`
        );

        res.json({
            success: true,
            plans: plans.map(plan => ({
                ...plan,
                features: {
                    receiptLimit: plan.receipt_limit,
                    historyDays: plan.history_days,
                    canExport: Boolean(plan.can_export),
                    canAdvancedAnalytics: Boolean(plan.can_advanced_analytics),
                    canScheduledReports: Boolean(plan.can_scheduled_reports),
                    canBulkOperations: Boolean(plan.can_bulk_operations),
                    canCustomTags: Boolean(plan.can_custom_tags),
                }
            }))
        });

    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription plans',
            error: error.message
        });
    }
});

// =====================================================
// GET /api/subscription/status
// Get current user's subscription status and usage
// =====================================================
router.get('/status', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user's subscription details
        const [users] = await pool.query(
            `SELECT
                user_id,
                email,
                name,
                subscription_tier,
                subscription_status,
                subscription_start_date,
                subscription_end_date,
                stripe_customer_id,
                stripe_subscription_id,
                monthly_receipt_count,
                last_reset_date
            FROM users
            WHERE user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // Get plan details
        const [plans] = await pool.query(
            `SELECT
                receipt_limit,
                history_days,
                can_export,
                can_advanced_analytics,
                can_scheduled_reports,
                can_bulk_operations,
                can_custom_tags
            FROM subscription_plans
            WHERE plan_type = ? AND is_active = 1
            LIMIT 1`,
            [user.subscription_tier]
        );

        const plan = plans[0] || {};

        // Check if monthly counter needs reset
        const today = new Date().toISOString().split('T')[0];
        const lastReset = user.last_reset_date
            ? new Date(user.last_reset_date).toISOString().split('T')[0]
            : null;

        let currentMonthReceipts = user.monthly_receipt_count;

        // Reset counter if it's a new month
        if (!lastReset || new Date(lastReset).getMonth() !== new Date(today).getMonth()) {
            await pool.query(
                'UPDATE users SET monthly_receipt_count = 0, last_reset_date = ? WHERE user_id = ?',
                [today, userId]
            );
            currentMonthReceipts = 0;
        }

        // Calculate usage limits
        const receiptLimit = plan.receipt_limit || null; // null means unlimited
        const canUploadReceipt = receiptLimit === null || currentMonthReceipts < receiptLimit;

        // Get Stripe subscription details if premium
        let stripeSubscription = null;
        if (user.stripe_subscription_id) {
            try {
                stripeSubscription = await stripeConfig.getSubscription(user.stripe_subscription_id);
            } catch (error) {
                console.error('Error fetching Stripe subscription:', error);
            }
        }

        res.json({
            success: true,
            subscription: {
                tier: user.subscription_tier,
                status: user.subscription_status,
                startDate: user.subscription_start_date,
                endDate: user.subscription_end_date,
                cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
                currentPeriodEnd: stripeSubscription?.current_period_end
                    ? new Date(stripeSubscription.current_period_end * 1000)
                    : null,
            },
            usage: {
                receiptsThisMonth: currentMonthReceipts,
                receiptLimit: receiptLimit,
                canUploadReceipt,
                receiptsRemaining: receiptLimit ? receiptLimit - currentMonthReceipts : null,
            },
            features: {
                receiptLimit: plan.receipt_limit,
                historyDays: plan.history_days,
                canExport: Boolean(plan.can_export),
                canAdvancedAnalytics: Boolean(plan.can_advanced_analytics),
                canScheduledReports: Boolean(plan.can_scheduled_reports),
                canBulkOperations: Boolean(plan.can_bulk_operations),
                canCustomTags: Boolean(plan.can_custom_tags),
            }
        });

    } catch (error) {
        console.error('Error fetching subscription status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription status',
            error: error.message
        });
    }
});

// =====================================================
// POST /api/subscription/cancel
// Cancel current subscription (at period end)
// =====================================================
router.post('/cancel', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user's subscription ID
        const [users] = await pool.query(
            'SELECT stripe_subscription_id, subscription_tier FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        if (!user.stripe_subscription_id || user.subscription_tier === 'free') {
            return res.status(400).json({
                success: false,
                message: 'No active subscription to cancel'
            });
        }

        // Cancel subscription at period end (don't cancel immediately)
        const subscription = await stripeConfig.cancelSubscription(
            user.stripe_subscription_id,
            true // cancel at period end
        );

        // Update user status
        await pool.query(
            `UPDATE users SET subscription_status = 'cancelled' WHERE user_id = ?`,
            [userId]
        );

        res.json({
            success: true,
            message: 'Subscription will be cancelled at the end of the billing period',
            subscription: {
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            }
        });

    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription',
            error: error.message
        });
    }
});

// =====================================================
// POST /api/subscription/reactivate
// Reactivate a cancelled subscription (before period end)
// =====================================================
router.post('/reactivate', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user's subscription ID
        const [users] = await pool.query(
            'SELECT stripe_subscription_id, subscription_status FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        if (!user.stripe_subscription_id || user.subscription_status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'No cancelled subscription to reactivate'
            });
        }

        // Reactivate subscription (remove cancel_at_period_end)
        const subscription = await stripeConfig.stripe.subscriptions.update(
            user.stripe_subscription_id,
            { cancel_at_period_end: false }
        );

        // Update user status
        await pool.query(
            `UPDATE users SET subscription_status = 'active' WHERE user_id = ?`,
            [userId]
        );

        res.json({
            success: true,
            message: 'Subscription reactivated successfully',
            subscription: {
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            }
        });

    } catch (error) {
        console.error('Error reactivating subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reactivate subscription',
            error: error.message
        });
    }
});

// =====================================================
// GET /api/subscription/invoices
// Get user's payment history/invoices
// =====================================================
router.get('/invoices', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 10;

        // Get payment history from database
        const [payments] = await pool.query(
            `SELECT
                payment_id,
                amount,
                currency,
                status,
                payment_method,
                description,
                stripe_invoice_id,
                paid_at,
                created_at
            FROM payment_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?`,
            [userId, limit]
        );

        res.json({
            success: true,
            invoices: payments
        });

    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices',
            error: error.message
        });
    }
});

// =====================================================
// GET /api/subscription/usage-stats
// Get detailed usage statistics for the user
// =====================================================
router.get('/usage-stats', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get total receipts count
        const [totalReceipts] = await pool.query(
            'SELECT COUNT(*) as total FROM receipts WHERE user_id = ?',
            [userId]
        );

        // Get receipts this month
        const [monthlyReceipts] = await pool.query(
            `SELECT COUNT(*) as count
            FROM receipts
            WHERE user_id = ?
            AND MONTH(created_at) = MONTH(CURRENT_DATE())
            AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
            [userId]
        );

        // Get total spending
        const [totalSpending] = await pool.query(
            'SELECT SUM(total) as total FROM receipts WHERE user_id = ?',
            [userId]
        );

        // Get receipts this week
        const [weeklyReceipts] = await pool.query(
            `SELECT COUNT(*) as count
            FROM receipts
            WHERE user_id = ?
            AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`,
            [userId]
        );

        // Get user's subscription info
        const [users] = await pool.query(
            'SELECT monthly_receipt_count, subscription_tier FROM users WHERE user_id = ?',
            [userId]
        );

        const user = users[0];

        // Get plan limits
        const [plans] = await pool.query(
            'SELECT receipt_limit FROM subscription_plans WHERE plan_type = ? AND is_active = 1 LIMIT 1',
            [user.subscription_tier]
        );

        const receiptLimit = plans[0]?.receipt_limit || null;

        res.json({
            success: true,
            stats: {
                totalReceipts: totalReceipts[0].total,
                receiptsThisMonth: monthlyReceipts[0].count,
                receiptsThisWeek: weeklyReceipts[0].count,
                totalSpending: parseFloat(totalSpending[0].total || 0),
                receiptLimit: receiptLimit,
                receiptsRemaining: receiptLimit ? receiptLimit - user.monthly_receipt_count : null,
                usagePercentage: receiptLimit
                    ? Math.round((user.monthly_receipt_count / receiptLimit) * 100)
                    : 0
            }
        });

    } catch (error) {
        console.error('Error fetching usage stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch usage statistics',
            error: error.message
        });
    }
});

module.exports = router;
