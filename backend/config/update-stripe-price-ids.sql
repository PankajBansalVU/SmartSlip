-- Update subscription plans with real Stripe price IDs
-- These match the price IDs configured in backend/.env

UPDATE subscription_plans
SET stripe_price_id = 'price_1SPBxR2MmrX3r0m5j8Fx0423',
    stripe_product_id = 'prod_premium'
WHERE plan_name = 'Premium Monthly';

UPDATE subscription_plans
SET stripe_price_id = 'price_1SPC2V2MmrX3r0m53Dsc1rEq',
    stripe_product_id = 'prod_premium'
WHERE plan_name = 'Premium Annual';

-- Verify the update
SELECT
    plan_name,
    price,
    `interval`,
    stripe_price_id,
    CASE
        WHEN stripe_price_id IS NOT NULL THEN '✓ Ready'
        ELSE '✗ Missing Price ID'
    END as status
FROM subscription_plans
WHERE plan_type = 'premium';
