-- =====================================================
-- SmartSlip Performance Indexes (Aiven Version)
-- =====================================================
-- Run this to add performance indexes to Aiven database
-- Usage: mysql -h "smartslip-mysql-live-0b7b.j.aivencloud.com" -P 23718 -u avnadmin -p --ssl-mode=REQUIRED defaultdb < add_performance_indexes_aiven.sql

USE defaultdb;

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

-- Verify indexes were created
SHOW INDEX FROM receipts;
SHOW INDEX FROM receipt_items;
SHOW INDEX FROM subscription_plans;
SHOW INDEX FROM usage_logs;

SELECT 'Performance indexes added successfully!' AS status;
