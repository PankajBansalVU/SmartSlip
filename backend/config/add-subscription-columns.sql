-- Add subscription columns to existing users table
-- Run this if you get "Unknown column 'subscription_tier'" error

-- Add subscription_tier column
ALTER TABLE users
ADD COLUMN subscription_tier ENUM('free', 'premium') DEFAULT 'free' AFTER password;

-- Add subscription_status column
ALTER TABLE users
ADD COLUMN subscription_status ENUM('active', 'cancelled', 'expired', 'trial') DEFAULT 'active' AFTER subscription_tier;

-- Add subscription_start_date column
ALTER TABLE users
ADD COLUMN subscription_start_date DATETIME NULL AFTER subscription_status;

-- Add subscription_end_date column
ALTER TABLE users
ADD COLUMN subscription_end_date DATETIME NULL AFTER subscription_start_date;

-- Add stripe_customer_id column
ALTER TABLE users
ADD COLUMN stripe_customer_id VARCHAR(255) NULL UNIQUE AFTER subscription_end_date;

-- Add stripe_subscription_id column
ALTER TABLE users
ADD COLUMN stripe_subscription_id VARCHAR(255) NULL UNIQUE AFTER stripe_customer_id;

-- Add monthly_receipt_count column
ALTER TABLE users
ADD COLUMN monthly_receipt_count INT DEFAULT 0 AFTER stripe_subscription_id;

-- Add last_reset_date column
ALTER TABLE users
ADD COLUMN last_reset_date DATE NULL AFTER monthly_receipt_count;

-- Add indexes
ALTER TABLE users
ADD INDEX idx_stripe_customer (stripe_customer_id);

ALTER TABLE users
ADD INDEX idx_subscription_tier (subscription_tier);

-- Verify columns were added
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'receipt_analyzer'
AND TABLE_NAME = 'users'
AND COLUMN_NAME LIKE '%subscription%' OR COLUMN_NAME LIKE '%stripe%' OR COLUMN_NAME LIKE '%receipt_count%';
