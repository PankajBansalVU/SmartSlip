const mysql = require('mysql2');
require('dotenv').config();

// Create MySQL connection pool with environment variables for security
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,  // Use environment variable for security
    database: process.env.DB_NAME || 'receipt_analyzer',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00'  // Use UTC timezone
}).promise();  // Convert pool to promise-based

// Test connection on startup with retry logic for Railway
async function testConnection(retries = 5, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            const connection = await pool.getConnection();
            console.log('✓ Database connected successfully');
            connection.release();
            return;
        } catch (err) {
            console.error(`✗ Database connection failed (attempt ${i + 1}/${retries}):`, err.message);
            if (i === retries - 1) {
                console.error('✗ Failed to connect to database after multiple attempts');
                // Don't exit in production, allow server to start
                if (process.env.NODE_ENV !== 'production') {
                    process.exit(1);
                }
            } else {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

testConnection();

module.exports = pool;