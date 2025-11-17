// spending.routes.js
const express = require('express');
const router = express.Router();
const pool = require('./config/db.config');
const { authenticateUser } = require('./auth.routes');

// Get spending by category
router.get('/by-category', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get date range parameters with defaults
            const startDate = req.query.startDate || '1970-01-01';
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
            const userId = req.user.userId;
            
            // Query to get spending by category
            const [results] = await connection.query(`
                SELECT 
                    ri.category_id,
                    ri.category_name,
                    SUM(ri.total_price) as total_spent,
                    COUNT(ri.item_id) as item_count
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date BETWEEN ? AND ?
                GROUP BY 
                    ri.category_id, ri.category_name
                ORDER BY 
                    total_spent DESC
            `, [userId, startDate, endDate]);
            
            // FIXED: Get total spending from receipts table (authoritative source)
            const [summaryResults] = await connection.query(`
                SELECT
                    COUNT(DISTINCT r.receipt_id) as transaction_count,
                    COALESCE(SUM(r.total), 0) as total_spending
                FROM receipts r
                WHERE r.user_id = ?
                AND r.receipt_date BETWEEN ? AND ?
            `, [userId, startDate, endDate]);

            // Use authoritative receipt total instead of calculating from items
            const totalSpending = Number(summaryResults[0]?.total_spending) || 0;
            const transactionCount = Number(summaryResults[0]?.transaction_count) || 0;
            
            // Add percentage to each category
            const categoriesWithPercentage = results.map(cat => ({
                ...cat,
                total_spent: Number(cat.total_spent),
                percentage: totalSpending > 0 ? Math.round((Number(cat.total_spent) / totalSpending) * 100) : 0
            }));
            
            res.json({
                success: true,
                data: {
                    categories: categoriesWithPercentage,
                    totalSpending,
                    transactionCount  // ✅ FIXED: Added missing transaction count
                }
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});


// Get spending over time
router.get('/by-month', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get parameters
            const months = parseInt(req.query.months) || 6; // Default to 6 months
            const userId = req.user.userId;
            
            // Query to get spending by month
            // FIXED: Use receipts.total instead of SUM(items) for accurate totals
            const [results] = await connection.query(`
                SELECT
                    DATE_FORMAT(r.receipt_date, '%Y-%m') as month,
                    COALESCE(SUM(r.total), 0) as total_spent
                FROM receipts r
                WHERE
                    r.user_id = ?
                    AND r.receipt_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? MONTH)
                GROUP BY
                    DATE_FORMAT(r.receipt_date, '%Y-%m')
                ORDER BY
                    month
            `, [userId, months]);
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get top spending items
router.get('/top-items', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get parameters
            const limit = parseInt(req.query.limit) || 10; // Default to top 10
            const userId = req.user.userId;
            const startDate = req.query.startDate || '1970-01-01';
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
            
            // Query to get top spending items
            const [results] = await connection.query(`
                SELECT 
                    ri.name,
                    ri.category_name,
                    SUM(ri.total_price) as total_spent,
                    SUM(ri.quantity) as quantity
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date BETWEEN ? AND ?
                GROUP BY 
                    ri.name, ri.category_name
                ORDER BY 
                    total_spent DESC
                LIMIT ?
            `, [userId, startDate, endDate, limit]);
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});
// Get spending by day of week
router.get('/by-day', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get date range parameters with defaults
            const startDate = req.query.startDate || '1970-01-01';
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
            const userId = req.user.userId;
            
            // Query to get spending by day of week
            const [results] = await connection.query(`
                SELECT 
                    DAYNAME(r.receipt_date) as day_of_week,
                    SUM(ri.total_price) as total_spent,
                    COUNT(DISTINCT r.receipt_id) as receipt_count
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date BETWEEN ? AND ?
                GROUP BY 
                    DAYNAME(r.receipt_date)
                ORDER BY 
                    FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
            `, [userId, startDate, endDate]);
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get spending by hour of day
router.get('/by-hour', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get date range parameters with defaults
            const startDate = req.query.startDate || '1970-01-01';
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
            const userId = req.user.userId;
            
            // Query to get spending by hour
            const [results] = await connection.query(`
                SELECT 
                    HOUR(r.receipt_date) as hour_of_day,
                    SUM(ri.total_price) as total_spent,
                    COUNT(DISTINCT r.receipt_id) as receipt_count
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date BETWEEN ? AND ?
                GROUP BY 
                    HOUR(r.receipt_date)
                ORDER BY 
                    hour_of_day
            `, [userId, startDate, endDate]);
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Add this new endpoint to spending.routes.js
router.get('/summary', authenticateUser, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const userId = req.user.userId;
        
        // Get all unique stores
        const [stores] = await connection.query(`
            SELECT DISTINCT store_name 
            FROM receipts 
            WHERE user_id = ? AND store_name IS NOT NULL AND store_name != ''
            ORDER BY store_name
        `, [userId]);
        
        // Get all unique categories
        const [categories] = await connection.query(`
            SELECT DISTINCT category_name 
            FROM receipt_items ri
            JOIN receipts r ON ri.receipt_id = r.receipt_id
            WHERE r.user_id = ? AND ri.category_name IS NOT NULL
            ORDER BY category_name
        `, [userId]);
        
        // Get user's budget if it exists
        const [budgetResults] = await connection.query(`
            SELECT amount FROM user_budgets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
        `, [userId]);
        
        // Get transactions data
        const [transactions] = await connection.query(`
            SELECT 
                r.receipt_id,
                r.receipt_date,
                r.store_name,
                ri.category_id,
                ri.category_name,
                ri.total_price as amount,
                ri.total_price as category_amount
            FROM 
                receipts r
            JOIN 
                receipt_items ri ON r.receipt_id = ri.receipt_id
            WHERE 
                r.user_id = ?
            ORDER BY 
                r.receipt_date DESC
            LIMIT 100
        `, [userId]);
        
        res.json({
            success: true,
            stores: stores.map(s => s.store_name),
            categories: categories.map(c => c.category_name),
            budget: budgetResults.length > 0 ? budgetResults[0].amount : null,
            transactions: transactions
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving spending summary',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/budget', authenticateUser, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const { amount } = req.body;
        const userId = req.user.userId;
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid budget amount'
            });
        }
        
        // Insert new budget into your existing user_budgets table
        await connection.query(`
            INSERT INTO user_budgets (user_id, amount) VALUES (?, ?)
        `, [userId, amount]);
        
        res.json({
            success: true,
            message: 'Budget set successfully',
            budget: parseFloat(amount)
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting budget',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// Get spending by store
router.get('/by-store', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get date range parameters with defaults
            const startDate = req.query.startDate || '1970-01-01';
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
            const userId = req.user.userId;
            
            // Query to get spending by store
            const [results] = await connection.query(`
                SELECT 
                    r.store_name,
                    SUM(ri.total_price) as total_spent,
                    COUNT(DISTINCT r.receipt_id) as visit_count,
                    SUM(ri.total_price) / COUNT(DISTINCT r.receipt_id) as avg_per_visit
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date BETWEEN ? AND ?
                    AND r.store_name IS NOT NULL
                    AND r.store_name != ''
                GROUP BY 
                    r.store_name
                ORDER BY 
                    total_spent DESC
            `, [userId, startDate, endDate]);
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get spending trends with category breakdown
router.get('/trends', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get date range parameters with defaults
            const months = parseInt(req.query.months) || 6; // Default to 6 months
            const userId = req.user.userId;
            
            // Query to get spending by month with category breakdown
            const [results] = await connection.query(`
                SELECT 
                    DATE_FORMAT(r.receipt_date, '%Y-%m') as month,
                    ri.category_name,
                    SUM(ri.total_price) as total_spent
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? MONTH)
                GROUP BY 
                    DATE_FORMAT(r.receipt_date, '%Y-%m'),
                    ri.category_name
                ORDER BY 
                    month, total_spent DESC
            `, [userId, months]);
            
            // Convert to more usable format
            const trendsByMonth = {};
            results.forEach(row => {
                if (!trendsByMonth[row.month]) {
                    trendsByMonth[row.month] = {
                        month: row.month,
                        categories: {}
                    };
                }
                trendsByMonth[row.month].categories[row.category_name] = row.total_spent;
            });
            
            res.json({
                success: true,
                data: Object.values(trendsByMonth)
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get spending heatmap data (day of week x hour of day)
router.get('/heatmap', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get date range parameters with defaults
            const startDate = req.query.startDate || '1970-01-01';
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
            const userId = req.user.userId;
            
            // Query to get spending by day of week and hour
            const [results] = await connection.query(`
                SELECT 
                    DAYNAME(r.receipt_date) as day_of_week,
                    HOUR(r.receipt_date) as hour_of_day,
                    SUM(ri.total_price) as total_spent,
                    COUNT(DISTINCT r.receipt_id) as receipt_count
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date BETWEEN ? AND ?
                GROUP BY 
                    DAYNAME(r.receipt_date),
                    HOUR(r.receipt_date)
                ORDER BY 
                    FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
                    hour_of_day
            `, [userId, startDate, endDate]);
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get historical receipt totals for time series analysis
router.get('/time-series', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get date range parameters with defaults
            const startDate = req.query.startDate || '1970-01-01';
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
            const userId = req.user.userId;
            
            // Query to get receipt totals over time
            const [results] = await connection.query(`
                SELECT 
                    r.receipt_id,
                    r.receipt_date,
                    r.total,
                    r.store_name
                FROM 
                    receipts r
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date BETWEEN ? AND ?
                ORDER BY 
                    r.receipt_date
            `, [userId, startDate, endDate]);
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get spending by category with month-over-month comparison
router.get('/category-comparison', authenticateUser, async (req, res) => {
    try {
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Get parameters
            const userId = req.user.userId;
            const currentMonth = req.query.month || new Date().toISOString().substring(0, 7); // Format: YYYY-MM
            
            // Parse current month
            const [year, month] = currentMonth.split('-').map(num => parseInt(num));
            
            // Calculate previous month
            let prevYear = year;
            let prevMonth = month - 1;
            if (prevMonth === 0) {
                prevYear -= 1;
                prevMonth = 12;
            }
            const previousMonth = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
            
            // Query for current month
            const [currentResults] = await connection.query(`
                SELECT 
                    ri.category_name,
                    SUM(ri.total_price) as total_spent
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND DATE_FORMAT(r.receipt_date, '%Y-%m') = ?
                GROUP BY 
                    ri.category_name
                ORDER BY 
                    total_spent DESC
            `, [userId, currentMonth]);
            
            // Query for previous month
            const [previousResults] = await connection.query(`
              SELECT 
                    ri.category_name,
                    SUM(ri.total_price) as total_spent
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND DATE_FORMAT(r.receipt_date, '%Y-%m') = ?
                GROUP BY 
                    ri.category_name
                ORDER BY 
                    total_spent DESC  
            `, [userId, previousMonth]);
            
            // Create lookup for previous month data
            const previousData = {};
            previousResults.forEach(item => {
                previousData[item.category_name] = item.total_spent;
            });
            
            // Combine data
            const comparisonData = currentResults.map(item => {
                const previousSpent = previousData[item.category_name] || 0;
                const difference = item.total_spent - previousSpent;
                const percentChange = previousSpent > 0 
                    ? ((difference / previousSpent) * 100).toFixed(1)
                    : null;
                
                return {
                    category: item.category_name,
                    currentSpent: item.total_spent,
                    previousSpent,
                    difference,
                    percentChange
                };
            });
            
            res.json({
                success: true,
                data: {
                    currentMonth,
                    previousMonth,
                    comparison: comparisonData
                }
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Handle /api/spending/report endpoint
router.post('/report', authenticateUser, async (req, res) => {
    try {
        console.log('Report request received via /api/spending/report endpoint');
        
        // Extract parameters from request body
        const { 
            startDate, 
            endDate, 
            categoryId, 
            reportFormat = 'pdf', 
            reportTitle = 'Spending Analysis Report'
        } = req.body;

        return res.redirect(307, '/api/reports/generate');
        
    } catch (error) {
        console.error('Report forwarding error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate spending report',
            error: error.message
        });
    }
});

// Handle /api/spending/filtered endpoint
router.get('/filtered', authenticateUser, async (req, res) => {
    try {
        const { dateRange } = req.query;
        console.log(`Filtered spending request received with dateRange: ${dateRange}`);
        
        let connection;
        try {
            connection = await pool.getConnection();
            
            // Calculate date range based on the dateRange parameter
            let startDate, endDate;
            const today = new Date();
            
            switch(dateRange) {
                case 'today':
                    startDate = new Date(today);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                    
                case 'this_week':
                    // Get first day of the week (Sunday)
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay());
                    startDate.setHours(0, 0, 0, 0);
                    
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                    
                case 'last_week':
                    // Previous week (Sunday to Saturday)
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay() - 7);
                    startDate.setHours(0, 0, 0, 0);
                    
                    endDate = new Date(today);
                    endDate.setDate(today.getDate() - today.getDay() - 1);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                    
                case 'this_month':
                    // Start of current month
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    startDate.setHours(0, 0, 0, 0);
                    
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                    
                case 'last_month':
                    // Previous month
                    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    startDate.setHours(0, 0, 0, 0);
                    
                    endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                    
                case 'last_3_months':
                    // Last 3 months
                    startDate = new Date(today);
                    startDate.setMonth(today.getMonth() - 3);
                    startDate.setHours(0, 0, 0, 0);
                    
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                    
                case 'this_year':
                    // Start of current year
                    startDate = new Date(today.getFullYear(), 0, 1);
                    startDate.setHours(0, 0, 0, 0);
                    
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                    
                case 'last_year':
                    // Previous year
                    startDate = new Date(today.getFullYear() - 1, 0, 1);
                    startDate.setHours(0, 0, 0, 0);
                    
                    endDate = new Date(today.getFullYear() - 1, 11, 31);
                    endDate.setHours(23, 59, 59, 999);
                    break;

                    case 'custom':
   
                    if (req.query.startDate && req.query.endDate) {
                    startDate = new Date(req.query.startDate);
                    startDate.setHours(0, 0, 0, 0);
        
                    endDate = new Date(req.query.endDate);
                    endDate.setHours(23, 59, 59, 999);
                    } else {
                    // Fallback to all time if dates not provided
                    startDate = new Date(1970, 0, 1);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                }

            }
            
            
            // Format dates for MySQL
            const formatDate = (date) => {
                return date.toISOString().slice(0, 19).replace('T', ' ');
            };
            
            const mysqlStartDate = formatDate(startDate);
            const mysqlEndDate = formatDate(endDate);
            
            // Get user ID from the authenticated user
            const userId = req.user.userId;
            
            // Fetch all relevant data for the dashboard
            
            // 1. Total spending for the period
            const [totalResults] = await connection.query(`
                SELECT SUM(r.total) as total_spent
                FROM receipts r
                WHERE r.user_id = ?
                AND r.receipt_date BETWEEN ? AND ?
            `, [userId, mysqlStartDate, mysqlEndDate]);
            
            // 2. Category breakdown
            const [categoryResults] = await connection.query(`
                SELECT 
                    ri.category_id,
                    ri.category_name,
                    SUM(ri.total_price) as total_spent,
                    COUNT(ri.item_id) as item_count
                FROM 
                    receipt_items ri
                JOIN 
                    receipts r ON ri.receipt_id = r.receipt_id
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date BETWEEN ? AND ?
                GROUP BY 
                    ri.category_id, ri.category_name
                ORDER BY 
                    total_spent DESC
            `, [userId, mysqlStartDate, mysqlEndDate]);
            
            // 3. Store breakdown
            const [storeResults] = await connection.query(`
                SELECT 
                    r.store_name,
                    COUNT(DISTINCT r.receipt_id) as visit_count,
                    SUM(r.total) as total_spent
                FROM 
                    receipts r
                WHERE 
                    r.user_id = ?
                    AND r.receipt_date BETWEEN ? AND ?
                    AND r.store_name IS NOT NULL
                    AND r.store_name != ''
                GROUP BY 
                    r.store_name
                ORDER BY 
                    total_spent DESC
                LIMIT 10
            `, [userId, mysqlStartDate, mysqlEndDate]);
            
            // 4. Receipt count
            const [receiptCountResults] = await connection.query(`
                SELECT COUNT(*) as receipt_count
                FROM receipts r
                WHERE r.user_id = ?
                AND r.receipt_date BETWEEN ? AND ?
            `, [userId, mysqlStartDate, mysqlEndDate]);
            
            // 5. Get detailed transactions for frontend compatibility
const [transactionResults] = await connection.query(`
    SELECT 
        r.receipt_id,
        r.receipt_date,
        r.store_name,
        ri.category_id,
        ri.category_name,
        ri.total_price as amount,
        ri.total_price as category_amount
    FROM 
        receipts r
    JOIN 
        receipt_items ri ON r.receipt_id = ri.receipt_id
    WHERE 
        r.user_id = ?
        AND r.receipt_date BETWEEN ? AND ?
    ORDER BY 
        r.receipt_date DESC
`, [userId, mysqlStartDate, mysqlEndDate]);

// Return compiled data
res.json({
    success: true,
    data: {
        dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            label: dateRange
        },
        totals: {
            spent: totalResults[0]?.total_spent || 0,
            receipts: receiptCountResults[0]?.receipt_count || 0
        },
        categories: categoryResults,
        stores: storeResults
    },
    transactions: transactionResults  // This is the key addition
});
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving filtered spending data',
                error: error.message
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});




module.exports = router;