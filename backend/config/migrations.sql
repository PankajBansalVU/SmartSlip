-- SmartSlip Database Migration Script
-- Premium Subscription Feature Implementation
-- This script creates all missing tables and updates existing ones

-- =====================================================
-- 1. CREATE USERS TABLE (MISSING - REFERENCED IN CODE)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,

    -- Subscription fields
    subscription_tier ENUM('free', 'premium') DEFAULT 'free',
    subscription_status ENUM('active', 'cancelled', 'expired', 'trial') DEFAULT 'active',
    subscription_start_date DATETIME NULL,
    subscription_end_date DATETIME NULL,

    -- Stripe integration
    stripe_customer_id VARCHAR(255) NULL UNIQUE,
    stripe_subscription_id VARCHAR(255) NULL UNIQUE,

    -- Usage tracking
    monthly_receipt_count INT DEFAULT 0,
    last_reset_date DATE NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_stripe_customer (stripe_customer_id),
    INDEX idx_subscription_tier (subscription_tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. CREATE PASSWORD_RESETS TABLE (MISSING - REFERENCED IN CODE)
-- =====================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. CREATE USER_BUDGETS TABLE (MISSING - REFERENCED IN CODE)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    period ENUM('monthly', 'yearly') DEFAULT 'monthly',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    UNIQUE KEY unique_user_budget (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. CREATE SUBSCRIPTION_PLANS TABLE (NEW)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(50) NOT NULL UNIQUE,
    plan_type ENUM('free', 'premium', 'team') NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    `interval` ENUM('month', 'year') DEFAULT 'month',

    -- Feature limits
    receipt_limit INT NULL COMMENT 'NULL means unlimited',
    history_days INT NULL COMMENT 'NULL means unlimited',
    can_export TINYINT(1) DEFAULT 0,
    can_advanced_analytics TINYINT(1) DEFAULT 0,
    can_scheduled_reports TINYINT(1) DEFAULT 0,
    can_bulk_operations TINYINT(1) DEFAULT 0,
    can_custom_tags TINYINT(1) DEFAULT 0,

    -- Stripe integration
    stripe_price_id VARCHAR(255) NULL,
    stripe_product_id VARCHAR(255) NULL,

    -- Status
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_plan_type (plan_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. CREATE PAYMENT_HISTORY TABLE (NEW)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_history (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,

    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') NOT NULL,

    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255) NULL,
    stripe_charge_id VARCHAR(255) NULL,
    stripe_invoice_id VARCHAR(255) NULL,

    -- Payment metadata
    payment_method VARCHAR(50) NULL COMMENT 'card, paypal, etc',
    payment_method_details JSON NULL,
    description TEXT NULL,

    -- Subscription context
    subscription_plan_id INT NULL,
    subscription_period_start DATE NULL,
    subscription_period_end DATE NULL,

    -- Timestamps
    paid_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(plan_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_stripe_payment_intent (stripe_payment_intent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. ALTER RECEIPTS TABLE - ADD MISSING COLUMNS
-- =====================================================
-- Check if columns exist before adding them

-- Add user_id column
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'receipts'
    AND COLUMN_NAME = 'user_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE receipts ADD COLUMN user_id INT NULL AFTER receipt_id',
    'SELECT "user_id column already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add store_abn column
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'receipts'
    AND COLUMN_NAME = 'store_abn'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE receipts ADD COLUMN store_abn VARCHAR(50) NULL AFTER store_location',
    'SELECT "store_abn column already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add original_date_string column
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'receipts'
    AND COLUMN_NAME = 'original_date_string'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE receipts ADD COLUMN original_date_string VARCHAR(100) NULL AFTER receipt_date',
    'SELECT "original_date_string column already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for user_id (if not exists)
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'receipts'
    AND CONSTRAINT_NAME = 'fk_receipts_user'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE receipts ADD CONSTRAINT fk_receipts_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE',
    'SELECT "foreign key constraint already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on user_id
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'receipts'
    AND INDEX_NAME = 'idx_user_id'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE receipts ADD INDEX idx_user_id (user_id)',
    'SELECT "index on user_id already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 7. SEED SUBSCRIPTION PLANS DATA
-- =====================================================
INSERT INTO subscription_plans (
    plan_name,
    plan_type,
    price,
    currency,
    `interval`,
    receipt_limit,
    history_days,
    can_export,
    can_advanced_analytics,
    can_scheduled_reports,
    can_bulk_operations,
    can_custom_tags,
    sort_order
) VALUES
(
    'Free Plan',
    'free',
    0.00,
    'USD',
    'month',
    10,                -- 10 receipts per month
    30,                -- 30-day history
    0,                 -- No export
    0,                 -- No advanced analytics
    0,                 -- No scheduled reports
    0,                 -- No bulk operations
    0,                 -- No custom tags
    1
),
(
    'Premium Monthly',
    'premium',
    5.00,
    'USD',
    'month',
    NULL,              -- Unlimited receipts
    NULL,              -- Unlimited history
    1,                 -- Can export
    1,                 -- Can use advanced analytics
    1,                 -- Can schedule reports
    1,                 -- Can use bulk operations
    1,                 -- Can use custom tags
    2
),
(
    'Premium Annual',
    'premium',
    48.00,             -- $4/month when paid annually (20% savings)
    'USD',
    'year',
    NULL,              -- Unlimited receipts
    NULL,              -- Unlimited history
    1,                 -- Can export
    1,                 -- Can use advanced analytics
    1,                 -- Can schedule reports
    1,                 -- Can use bulk operations
    1,                 -- Can use custom tags
    3
)
ON DUPLICATE KEY UPDATE
    plan_name = VALUES(plan_name);

-- =====================================================
-- 8. CREATE USAGE_LOGS TABLE (OPTIONAL - FOR ANALYTICS)
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_type ENUM('receipt_upload', 'receipt_scan', 'export', 'report_generate', 'api_call') NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. CREATE NOTIFICATION_PREFERENCES TABLE (FOR FUTURE)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,

    -- Email notification preferences
    email_spending_alerts TINYINT(1) DEFAULT 1,
    email_budget_warnings TINYINT(1) DEFAULT 1,
    email_receipt_limits TINYINT(1) DEFAULT 1,
    email_weekly_summary TINYINT(1) DEFAULT 0,
    email_monthly_report TINYINT(1) DEFAULT 0,
    email_subscription_updates TINYINT(1) DEFAULT 1,
    email_promotional TINYINT(1) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_prefs (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================
-- Uncomment these to verify the migration

-- SELECT 'Users table' AS table_name, COUNT(*) AS count FROM users;
-- SELECT 'Password resets table' AS table_name, COUNT(*) AS count FROM password_resets;
-- SELECT 'User budgets table' AS table_name, COUNT(*) AS count FROM user_budgets;
-- SELECT 'Subscription plans' AS table_name, COUNT(*) AS count FROM subscription_plans;
-- SELECT 'Payment history' AS table_name, COUNT(*) AS count FROM payment_history;
-- SELECT 'Usage logs' AS table_name, COUNT(*) AS count FROM usage_logs;
-- SELECT 'Notification preferences' AS table_name, COUNT(*) AS count FROM notification_preferences;

-- Show subscription plans
-- SELECT * FROM subscription_plans;

-- Show receipts table structure
-- DESCRIBE receipts;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================
-- These indexes improve query performance for common operations

-- Index for date-based receipt queries (most common sort)
CREATE INDEX IF NOT EXISTS idx_receipt_date ON receipts(receipt_date DESC);

-- Composite index for user receipt queries with date sorting
CREATE INDEX IF NOT EXISTS idx_user_date ON receipts(user_id, receipt_date DESC);

-- Index for created_at timestamp queries
CREATE INDEX IF NOT EXISTS idx_created_at ON receipts(created_at DESC);

-- Index for category-based item queries
CREATE INDEX IF NOT EXISTS idx_category ON receipt_items(category_id);

-- Index for subscription plan active status
CREATE INDEX IF NOT EXISTS idx_active_plans ON subscription_plans(is_active);

-- Index for usage logs by date (for analytics)
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_logs(created_at DESC);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration: mysql -u root -p receipt_analyzer < migrations.sql
-- 2. Update backend code to use new subscription fields
-- 3. Integrate Stripe payment processing
-- 4. Implement feature gating middleware
-- =====================================================
