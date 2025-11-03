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

// Test connection on startup
pool.getConnection()
    .then(connection => {
        console.log('✓ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
        process.exit(1);  // Exit if database connection fails
    });

module.exports = pool;