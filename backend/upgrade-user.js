// Quick script to manually upgrade a user to premium
// Usage: node upgrade-user.js <email>

require('dotenv').config();
const pool = require('./config/db.config');

async function upgradeUser(email) {
    try {
        // Find user
        const [users] = await pool.query(
            'SELECT user_id, email, subscription_tier FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log(`❌ User not found: ${email}`);
            process.exit(1);
        }

        const user = users[0];
        console.log(`Found user: ${user.email} (ID: ${user.user_id})`);
        console.log(`Current tier: ${user.subscription_tier}`);

        // Upgrade to premium
        await pool.query(
            `UPDATE users SET
                subscription_tier = 'premium',
                subscription_status = 'active',
                subscription_start_date = NOW(),
                subscription_end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
            WHERE user_id = ?`,
            [user.user_id]
        );

        console.log(`✅ User upgraded to Premium!`);
        console.log(`   Email: ${email}`);
        console.log(`   Subscription: Premium (Monthly)`);
        console.log(`   Valid until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.log('Usage: node upgrade-user.js <email>');
    console.log('Example: node upgrade-user.js demo@example.com');
    process.exit(1);
}

upgradeUser(email);
