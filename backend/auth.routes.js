const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const pool = require('./config/db.config');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { validateEmailSync } = require('./utils/emailValidation');

// Configure mail transporter
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
    }
});


// User registration route
router.post('/register', async (req, res) => {
    let connection;
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        // Enhanced email validation (blocks fake/disposable emails)
        const emailValidation = validateEmailSync(email);
        if (!emailValidation.valid) {
            return res.status(400).json({
                success: false,
                message: emailValidation.errors[0] || 'Invalid email address',
                suggestion: emailValidation.suggestion // Suggest correction if typo detected
            });
        }

        // Warn user if email looks like a typo (optional: could return warning to frontend)
        if (emailValidation.suggestion) {
            console.log(`⚠️  Possible email typo during registration: ${email}, suggested: ${emailValidation.suggestion}`);
        }

        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        connection = await pool.getConnection();

        // Check if user already exists
        const [existingUsers] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user (defaults to 'free' tier set by database)
        const [result] = await connection.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // Get the newly created user with subscription details
        const [newUser] = await connection.execute(
            `SELECT user_id, name, email, subscription_tier, subscription_status,
                    monthly_receipt_count
             FROM users WHERE user_id = ?`,
            [result.insertId]
        );

        const userData = newUser[0];

        // Generate JWT token
        const token = jwt.sign(
            { userId: userData.user_id, name: userData.name, email: userData.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: userData.user_id,
                name: userData.name,
                email: userData.email,
                subscription: {
                    tier: userData.subscription_tier,
                    status: userData.subscription_status,
                    receiptsThisMonth: userData.monthly_receipt_count
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// User login route
router.post('/login', async (req, res) => {
    let connection;
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        connection = await pool.getConnection();

        // Find user by email with subscription details
        const [users] = await connection.execute(
            `SELECT user_id, name, email, password, subscription_tier, subscription_status,
                    subscription_start_date, subscription_end_date, monthly_receipt_count
             FROM users WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.user_id, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                subscription: {
                    tier: user.subscription_tier,
                    status: user.subscription_status,
                    startDate: user.subscription_start_date,
                    endDate: user.subscription_end_date,
                    receiptsThisMonth: user.monthly_receipt_count
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Authentication middleware
const authenticateUser = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add user info to request
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Get user profile
router.get('/profile', authenticateUser, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // Get user details with subscription info
        const [users] = await connection.execute(
            `SELECT user_id, name, email, created_at, subscription_tier, subscription_status,
                    subscription_start_date, subscription_end_date, monthly_receipt_count
             FROM users WHERE user_id = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        res.json({
            success: true,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                createdAt: user.created_at,
                subscription: {
                    tier: user.subscription_tier,
                    status: user.subscription_status,
                    startDate: user.subscription_start_date,
                    endDate: user.subscription_end_date,
                    receiptsThisMonth: user.monthly_receipt_count
                }
            }
        });
        
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Forgot password route - request a password reset
router.post('/forgot-password', async (req, res) => {
    let connection;
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format (prevent fake emails in password reset)
        const emailValidation = validateEmailSync(email);
        if (!emailValidation.valid) {
            // Return success anyway for security (don't reveal invalid emails)
            return res.json({
                success: true,
                message: 'If your email is registered, you will receive a password reset link'
            });
        }

        connection = await pool.getConnection();

        // Check if user exists
        const [users] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // Don't reveal that the user doesn't exist for security
            return res.json({
                success: true,
                message: 'If your email is registered, you will receive a password reset link'
            });
        }

        // Generate a reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour from now

        // Store the token in the database
        await connection.execute(
            `INSERT INTO password_resets (user_id, token, expires_at) 
             VALUES (?, ?, ?)`,
            [users[0].user_id, token, expires]
        );

        // Create password reset URL
        const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

        // Send email
        const mailOptions = {
            from: process.env.MAIL_FROM,
            to: email,
            subject: 'Password Reset - Receipt Scanner',
            html: `
                <h1>Password Reset</h1>
                <p>You requested a password reset for your Receipt Scanner account.</p>
                <p>Please click the link below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'If your email is registered, you will receive a password reset link'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing password reset request',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Reset password route - verify token and update password
router.post('/reset-password', async (req, res) => {
    let connection;
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token and password are required'
            });
        }

        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Find the valid token
        const [tokens] = await connection.execute(
            `SELECT * FROM password_resets 
             WHERE token = ? AND expires_at > NOW() AND used = 0`,
            [token]
        );

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        const resetRecord = tokens[0];

        // Get user
        const [users] = await connection.execute(
            'SELECT * FROM users WHERE user_id = ?',
            [resetRecord.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update user's password
        await connection.execute(
            'UPDATE users SET password = ? WHERE user_id = ?',
            [hashedPassword, resetRecord.user_id]
        );

        // Mark token as used
        await connection.execute(
            'UPDATE password_resets SET used = 1 WHERE id = ?',
            [resetRecord.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = { router, authenticateUser };