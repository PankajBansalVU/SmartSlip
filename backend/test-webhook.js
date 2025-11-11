// Test script to manually update user subscription to premium
// Run this after completing a Stripe checkout to simulate the webhook
// Usage: node test-webhook.js <user_email> <stripe_customer_id> <stripe_subscription_id>

const pool = require('./config/db.config');

async function updateUserToPremium(email, customerId, subscriptionId) {
    try {
        console.log('🔍 Searching for user:', email);

        const [users] = await pool.query(
            'SELECT user_id, email, subscription_tier, subscription_status FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.error('❌ User not found with email:', email);
            return;
        }

        const user = users[0];
        console.log('✅ Found user:', {
            user_id: user.user_id,
            email: user.email,
            current_tier: user.subscription_tier,
            current_status: user.subscription_status
        });

        console.log('\n🔄 Updating subscription to premium...');

        await pool.query(
            `UPDATE users SET
                stripe_customer_id = ?,
                stripe_subscription_id = ?,
                subscription_tier = 'premium',
                subscription_status = 'active',
                subscription_start_date = NOW(),
                subscription_end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
            WHERE user_id = ?`,
            [customerId || 'manual_' + Date.now(), subscriptionId || 'manual_sub_' + Date.now(), user.user_id]
        );

        console.log('✅ Subscription updated successfully!\n');

        const [updatedUsers] = await pool.query(
            'SELECT user_id, email, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id FROM users WHERE email = ?',
            [email]
        );

        console.log('📊 Updated user details:', updatedUsers[0]);

        console.log('\n✨ Done! User is now premium. Refresh your frontend to see changes.');

    } catch (error) {
        console.error('❌ Error updating subscription:', error);
    } finally {
        process.exit();
    }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('📝 Usage: node test-webhook.js <user_email> [customer_id] [subscription_id]');
    console.log('Example: node test-webhook.js user@example.com');
    console.log('\nIf customer_id and subscription_id are not provided, dummy values will be used.');
    process.exit(1);
}

const email = args[0];
const customerId = args[1] || null;
const subscriptionId = args[2] || null;

updateUserToPremium(email, customerId, subscriptionId);
