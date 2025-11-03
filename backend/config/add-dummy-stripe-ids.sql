-- Add dummy Stripe price IDs to subscription plans
-- This allows the checkout flow to work while you set up real Stripe products

-- Update Premium Monthly plan with dummy price ID
UPDATE subscription_plans
SET stripe_price_id = 'price_dummy_monthly_5usd',
    stripe_product_id = 'prod_dummy_premium'
WHERE plan_name = 'Premium Monthly';

-- Update Premium Annual plan with dummy price ID
UPDATE subscription_plans
SET stripe_price_id = 'price_dummy_annual_48usd',
    stripe_product_id = 'prod_dummy_premium'
WHERE plan_name = 'Premium Annual';

-- Verify the update
SELECT plan_name, price, `interval`, stripe_price_id, stripe_product_id
FROM subscription_plans
WHERE plan_type = 'premium';
