const pool = require('../config/db.config');

/**
 * Get user's subscription features
 */
async function getUserFeatures(userId) {
    try {
        const [users] = await pool.query(
            `SELECT
                u.subscription_tier,
                sp.can_export,
                sp.can_advanced_analytics,
                sp.can_scheduled_reports,
                sp.can_bulk_operations,
                sp.can_custom_tags,
                sp.history_days,
                sp.receipt_limit
            FROM users u
            LEFT JOIN subscription_plans sp ON u.subscription_tier = sp.plan_type
            WHERE u.user_id = ? AND sp.is_active = 1
            LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            return null;
        }

        return users[0];

    } catch (error) {
        console.error('Error getting user features:', error);
        return null;
    }
}

/**
 * Middleware to check if user can export data
 */
async function checkExportAccess(req, res, next) {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const features = await getUserFeatures(userId);

        if (!features) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!features.can_export) {
            return res.status(403).json({
                success: false,
                message: 'Export feature requires Premium subscription',
                premiumFeature: true,
                feature: 'export',
                upgrade: {
                    message: 'Upgrade to Premium to export your data',
                    features: ['Export to PDF, CSV, and Excel', 'Unlimited exports', 'Scheduled reports']
                }
            });
        }

        next();

    } catch (error) {
        console.error('Error checking export access:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking feature access',
            error: error.message
        });
    }
}

/**
 * Middleware to check if user can access advanced analytics
 */
async function checkAdvancedAnalytics(req, res, next) {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const features = await getUserFeatures(userId);

        if (!features) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!features.can_advanced_analytics) {
            return res.status(403).json({
                success: false,
                message: 'Advanced analytics requires Premium subscription',
                premiumFeature: true,
                feature: 'advanced_analytics',
                upgrade: {
                    message: 'Upgrade to Premium for advanced analytics',
                    features: [
                        'Category breakdown charts',
                        'Spending trends over time',
                        'Store-by-store analysis',
                        'Budget tracking',
                        'Custom date ranges'
                    ]
                }
            });
        }

        next();

    } catch (error) {
        console.error('Error checking analytics access:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking feature access',
            error: error.message
        });
    }
}

/**
 * Middleware to check if user can use scheduled reports
 */
async function checkScheduledReports(req, res, next) {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const features = await getUserFeatures(userId);

        if (!features) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!features.can_scheduled_reports) {
            return res.status(403).json({
                success: false,
                message: 'Scheduled reports requires Premium subscription',
                premiumFeature: true,
                feature: 'scheduled_reports',
                upgrade: {
                    message: 'Upgrade to Premium for scheduled reports',
                    features: ['Weekly email reports', 'Monthly summaries', 'Custom report schedules']
                }
            });
        }

        next();

    } catch (error) {
        console.error('Error checking scheduled reports access:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking feature access',
            error: error.message
        });
    }
}

/**
 * Middleware to check if user can use bulk operations
 */
async function checkBulkOperations(req, res, next) {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const features = await getUserFeatures(userId);

        if (!features) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!features.can_bulk_operations) {
            return res.status(403).json({
                success: false,
                message: 'Bulk operations requires Premium subscription',
                premiumFeature: true,
                feature: 'bulk_operations',
                upgrade: {
                    message: 'Upgrade to Premium for bulk operations',
                    features: ['Bulk delete receipts', 'Bulk export', 'Bulk categorization']
                }
            });
        }

        next();

    } catch (error) {
        console.error('Error checking bulk operations access:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking feature access',
            error: error.message
        });
    }
}

/**
 * Middleware to check if user can use custom tags
 */
async function checkCustomTags(req, res, next) {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const features = await getUserFeatures(userId);

        if (!features) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!features.can_custom_tags) {
            return res.status(403).json({
                success: false,
                message: 'Custom tags requires Premium subscription',
                premiumFeature: true,
                feature: 'custom_tags',
                upgrade: {
                    message: 'Upgrade to Premium for custom tags',
                    features: ['Add custom tags', 'Advanced search', 'Filter by tags']
                }
            });
        }

        next();

    } catch (error) {
        console.error('Error checking custom tags access:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking feature access',
            error: error.message
        });
    }
}

/**
 * Middleware to filter receipts by history limit (for free users)
 * Adds a WHERE clause to limit history based on subscription tier
 */
async function applyHistoryLimit(userId) {
    try {
        const features = await getUserFeatures(userId);

        if (!features) {
            return null;
        }

        // If unlimited history (premium), return null (no filter)
        if (features.history_days === null) {
            return null;
        }

        // Return date filter for free users
        return {
            historyDays: features.history_days,
            dateFilter: `DATE_SUB(CURDATE(), INTERVAL ${features.history_days} DAY)`
        };

    } catch (error) {
        console.error('Error applying history limit:', error);
        return null;
    }
}

/**
 * Generic premium feature check
 */
async function checkPremiumAccess(req, res, next) {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const [users] = await pool.query(
            'SELECT subscription_tier FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (users[0].subscription_tier !== 'premium') {
            return res.status(403).json({
                success: false,
                message: 'This feature requires Premium subscription',
                premiumFeature: true,
                upgrade: {
                    message: 'Upgrade to Premium to unlock all features',
                    price: '$5/month'
                }
            });
        }

        next();

    } catch (error) {
        console.error('Error checking premium access:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking subscription',
            error: error.message
        });
    }
}

/**
 * Helper function to check if user is premium (for use in route logic)
 */
async function isPremiumUser(userId) {
    try {
        const [users] = await pool.query(
            'SELECT subscription_tier FROM users WHERE user_id = ?',
            [userId]
        );

        return users.length > 0 && users[0].subscription_tier === 'premium';

    } catch (error) {
        console.error('Error checking if premium user:', error);
        return false;
    }
}

module.exports = {
    checkExportAccess,
    checkAdvancedAnalytics,
    checkScheduledReports,
    checkBulkOperations,
    checkCustomTags,
    applyHistoryLimit,
    checkPremiumAccess,
    isPremiumUser,
    getUserFeatures
};
