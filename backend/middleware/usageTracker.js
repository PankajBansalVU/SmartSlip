const pool = require('../config/db.config');

/**
 * Middleware to track and enforce receipt upload limits
 * Checks if user has reached their monthly receipt limit
 */
async function checkReceiptLimit(req, res, next) {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Get user's subscription details
        const [users] = await pool.query(
            `SELECT
                u.user_id,
                u.subscription_tier,
                u.monthly_receipt_count,
                u.last_reset_date,
                sp.receipt_limit
            FROM users u
            LEFT JOIN subscription_plans sp ON u.subscription_tier COLLATE utf8mb4_unicode_ci = sp.plan_type COLLATE utf8mb4_unicode_ci
            WHERE u.user_id = ? AND sp.is_active = 1
            LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];
        const receiptLimit = user.receipt_limit;

        // If unlimited (premium), allow
        if (receiptLimit === null) {
            return next();
        }

        // Check if monthly counter needs reset
        const today = new Date();
        const lastReset = user.last_reset_date ? new Date(user.last_reset_date) : null;

        let currentCount = user.monthly_receipt_count;

        // Reset counter if it's a new month
        if (!lastReset || lastReset.getMonth() !== today.getMonth() || lastReset.getFullYear() !== today.getFullYear()) {
            await pool.query(
                'UPDATE users SET monthly_receipt_count = 0, last_reset_date = ? WHERE user_id = ?',
                [today.toISOString().split('T')[0], userId]
            );
            currentCount = 0;
        }

        // Check if limit reached
        if (currentCount >= receiptLimit) {
            return res.status(403).json({
                success: false,
                message: 'Monthly receipt limit reached',
                limit: receiptLimit,
                used: currentCount,
                upgrade: {
                    message: 'Upgrade to Premium for unlimited receipts',
                    tier: 'premium'
                }
            });
        }

        // Allow the request to proceed
        next();

    } catch (error) {
        console.error('Error checking receipt limit:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking receipt limit',
            error: error.message
        });
    }
}

/**
 * Middleware to increment receipt count after successful upload
 * Call this AFTER the receipt has been saved
 */
async function incrementReceiptCount(req, res, next) {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return next(); // Skip if no user
        }

        // Increment the monthly receipt count
        await pool.query(
            'UPDATE users SET monthly_receipt_count = monthly_receipt_count + 1 WHERE user_id = ?',
            [userId]
        );

        // Log usage
        await pool.query(
            `INSERT INTO usage_logs (user_id, action_type, metadata)
            VALUES (?, 'receipt_upload', JSON_OBJECT('timestamp', NOW()))`,
            [userId]
        );

        next();

    } catch (error) {
        console.error('Error incrementing receipt count:', error);
        // Don't fail the request if logging fails
        next();
    }
}

/**
 * Middleware to log API usage
 */
async function logUsage(actionType) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                return next();
            }

            // Log the action
            await pool.query(
                `INSERT INTO usage_logs (user_id, action_type, metadata)
                VALUES (?, ?, JSON_OBJECT('path', ?, 'method', ?))`,
                [userId, actionType, req.path, req.method]
            );

            next();

        } catch (error) {
            console.error('Error logging usage:', error);
            // Don't fail the request if logging fails
            next();
        }
    };
}

/**
 * Get user's current usage stats
 */
async function getUserUsage(userId) {
    try {
        const [users] = await pool.query(
            `SELECT
                u.monthly_receipt_count,
                u.last_reset_date,
                u.subscription_tier,
                sp.receipt_limit,
                sp.history_days
            FROM users u
            LEFT JOIN subscription_plans sp ON u.subscription_tier COLLATE utf8mb4_unicode_ci = sp.plan_type COLLATE utf8mb4_unicode_ci
            WHERE u.user_id = ? AND sp.is_active = 1
            LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            return null;
        }

        const user = users[0];

        return {
            receiptsThisMonth: user.monthly_receipt_count,
            receiptLimit: user.receipt_limit,
            historyDays: user.history_days,
            tier: user.subscription_tier,
            canUpload: user.receipt_limit === null || user.monthly_receipt_count < user.receipt_limit,
            receiptsRemaining: user.receipt_limit === null
                ? null
                : user.receipt_limit - user.monthly_receipt_count
        };

    } catch (error) {
        console.error('Error getting user usage:', error);
        return null;
    }
}

/**
 * Reset monthly counters for all users (to be run as a cron job)
 */
async function resetMonthlyCounters() {
    try {
        const today = new Date().toISOString().split('T')[0];

        await pool.query(
            `UPDATE users
            SET monthly_receipt_count = 0, last_reset_date = ?
            WHERE last_reset_date IS NULL
            OR MONTH(last_reset_date) != MONTH(CURRENT_DATE())
            OR YEAR(last_reset_date) != YEAR(CURRENT_DATE())`,
            [today]
        );

        console.log('Monthly counters reset successfully');
        return true;

    } catch (error) {
        console.error('Error resetting monthly counters:', error);
        return false;
    }
}

/**
 * Check if user should receive usage warning (e.g., at 80% of limit)
 */
async function checkUsageWarning(userId) {
    try {
        const usage = await getUserUsage(userId);

        if (!usage || usage.receiptLimit === null) {
            return null; // No warning for unlimited users
        }

        const usagePercent = (usage.receiptsThisMonth / usage.receiptLimit) * 100;

        if (usagePercent >= 80 && usagePercent < 100) {
            return {
                shouldWarn: true,
                level: usagePercent >= 90 ? 'critical' : 'warning',
                message: `You've used ${usage.receiptsThisMonth} of ${usage.receiptLimit} receipts this month`,
                receiptsRemaining: usage.receiptsRemaining
            };
        }

        return null;

    } catch (error) {
        console.error('Error checking usage warning:', error);
        return null;
    }
}

module.exports = {
    checkReceiptLimit,
    incrementReceiptCount,
    logUsage,
    getUserUsage,
    resetMonthlyCounters,
    checkUsageWarning
};
