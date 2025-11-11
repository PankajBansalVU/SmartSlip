const mysql = require('mysql2');
require('dotenv').config();

// Create MySQL connection pool with environment variables for security
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'receipt_analyzer',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
    connectTimeout: 30000  // 30 seconds timeout for Aiven
};

// Add SSL configuration if required (e.g., for Aiven)
if (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') {
    poolConfig.ssl = {
        rejectUnauthorized: false  // Required for Aiven and other managed databases
    };
}

const pool = mysql.createPool(poolConfig).promise();

// Test connection on startup with retry logic for Railway
async function testConnection(retries = 5, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            const connection = await pool.getConnection();
            console.log('✓ Database connected successfully');
            connection.release();
            return;
        } catch (err) {
            console.error(`✗ Database connection failed (attempt ${i + 1}/${retries}):`, err.message);
            if (i === retries - 1) {
                console.error('⚠️  Failed to connect to database after multiple attempts');
                console.error('⚠️  Server will start but database operations will fail');
                console.error('⚠️  Check environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT');
                // Don't exit - allow server to start anyway
                return;
            } else {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

// Only test connection after a delay to let Railway set up services
setTimeout(() => {
    testConnection();
}, 2000);

module.exports = pool;