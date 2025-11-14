const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const PDF = require('pdf-parse');
require('dotenv').config();

// Debug: Log database configuration on startup
console.log('🔍 Database Configuration Check:');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET (will default to localhost)');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET (will default to root)');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET (will default to receipt_analyzer)');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET (will default to 3306)');

const OpenAI = require('openai');
const pool = require('./config/db.config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { router: authRouter, authenticateUser } = require('./auth.routes');
const serverless = require('serverless-http');
const cors = require('cors');
const morgan = require('morgan');
const ocrRoutes = require('./cloud-vision-api');
const spendingRoutes = require('./spending.routes');
const paymentRoutes = require('./routes/payment.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const webhookRoutes = require('./routes/webhook.routes');
const { checkReceiptLimit, incrementReceiptCount } = require('./middleware/usageTracker');
const { checkExportAccess } = require('./middleware/premiumGate');
const app = express();
const PDFDocument = require('pdfkit');
const mkdirp = require('mkdirp');
const reportsRoutes = require('./reports.routes');

// CORS configuration - Allow frontend to communicate with backend
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://smartslip-1.onrender.com', // Frontend on Render
    'https://smartslip.onrender.com',   // Alternative frontend URL
    process.env.FRONTEND_URL,           // Environment variable for frontend URL
];

// Filter out undefined values and add wildcard patterns
const corsOrigins = allowedOrigins.filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin is in allowed list or matches wildcard
        if (corsOrigins.includes(origin) ||
            origin.includes('.ngrok.io') ||
            origin.includes('.ngrok-free.app') ||
            origin.includes('.vercel.app')) {
            callback(null, true);
        } else {
            console.warn('CORS blocked origin:', origin);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization'
    ]
}));

// IMPORTANT: Stripe webhook must be registered BEFORE express.json() middleware
// because webhooks need raw body for signature verification
// Mounting at /api/webhooks to avoid path collision with /api/payment routes
// IMPORTANT: Stripe webhook must be registered BEFORE express.json() middleware
// because webhooks need raw body for signature verification
// Mounting at /api/webhooks to avoid path collision with /api/payment routes
// Custom middleware to get raw body for Stripe webhooks
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json({
    limit: '10mb',
    parameterLimit: 20000
}));

app.use(express.static('public'));
app.use('/auth', authRouter);
app.use(morgan('dev')); // Logging
app.use('/api/ocr', ocrRoutes);
app.use('/api/spending', spendingRoutes);
app.use('/api/reports', reportsRoutes);

// Payment routes (checkout session, portal, etc.) - these need JSON parsing
app.use('/api/payment', paymentRoutes);

// Subscription routes
app.use('/api/subscription', subscriptionRoutes);


// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}


// Optimized storage configuration
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Images and PDFs only!');
        }
    }
}).single('file');

// Image optimization function with conditional optimization
async function optimizeImage(filePath) {
    try {
        // Get image metadata without processing
        const metadata = await sharp(filePath).metadata();
        const fileSize = fs.statSync(filePath).size;

        // Only optimize if image is large or high resolution
        const needsOptimization =
            metadata.width > 1500 ||
            metadata.height > 1500 ||
            fileSize > 2 * 1024 * 1024;  // > 2MB

        if (!needsOptimization) {
            console.log('Image already optimized, skipping resize...');
            return filePath;  // Return original file
        }

        console.log('Optimizing large image...');
        const optimizedPath = filePath + '-optimized.jpg';
        await sharp(filePath)
            .resize(1500, 1500, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toFile(optimizedPath);
        return optimizedPath;
    } catch (error) {
        console.error('Optimization check failed, using original:', error);
        return filePath;  // Fallback to original
    }
}

// OCR Processing endpoint
app.post('/upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ 
                status: 'error', 
                message: err.toString() 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'No file uploaded' 
            });
        }

        try {
            console.log('Processing file:', req.file.filename);
            let extractedText = '';
            let ocrSource = '';

            // Check if file is PDF
            if (req.file.mimetype === 'application/pdf') {
                console.log('Processing PDF file...');
                const dataBuffer = fs.readFileSync(req.file.path);
                const pdfData = await PDF(dataBuffer);  // Changed from pdfParse to PDF
                extractedText = pdfData.text;
                console.log('PDF text extracted:', extractedText.substring(0, 100) + '...');
            } else {
                // Process image file
                let fileToProcess = req.file.path;
                if (req.file.mimetype.startsWith('image/')) {
                    console.log('Optimizing image...');
                    fileToProcess = await optimizeImage(req.file.path);
                }

                console.log('Starting OCR processing...');
                const result = await Tesseract.recognize(
                    fileToProcess,
                    'eng',
                    {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                            }
                        }
                    }
                );
                extractedText = result.data.text;

                // Check Tesseract confidence and completeness
                const confidence = result.data.confidence;
                const text = result.data.text;
                console.log(`Tesseract confidence: ${confidence}%`);
                
                // Function to check if the extracted text is complete enough
                const isDataComplete = (text) => {
                    // Check for expected patterns in a receipt
                    const hasDate = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(text);
                    const hasAmount = /\$?\d+\.\d{2}/.test(text);
                    const hasEnoughLines = text.split('\n').length > 5;
                    
                    return hasDate && hasAmount && hasEnoughLines;
                };
                
                // If Tesseract result is good enough, use it
                if (confidence > 75 && isDataComplete(text)) {
                    extractedText = text;
                    ocrSource = 'tesseract';
                    console.log('Using Tesseract result due to high confidence');
                } else {
                    // Fall back to Google Cloud Vision API
                    console.log('Tesseract confidence too low, falling back to Cloud Vision API...');
                    
                    // Read the file as a buffer
                    const imageBuffer = fs.readFileSync(req.file.path);
                    
                    // Get access to your Cloud Vision client
                    const visionClient = require('./cloud-vision-api').getVisionClient();
                    
                    // Call the Cloud Vision API
                    const [result] = await visionClient.textDetection({
                        image: {
                            content: imageBuffer
                        }
                    });
                    
                    const detections = result.textAnnotations;
                    if (detections && detections.length > 0) {
                        extractedText = detections[0].description;
                        ocrSource = 'cloud-vision';
                        console.log('Using Cloud Vision result');
                    } else {
                        // If Cloud Vision also fails, use the Tesseract result anyway
                        extractedText = text;
                        ocrSource = 'tesseract-fallback';
                        console.log('Cloud Vision returned no text, using Tesseract result as fallback');
                    }
                }

                // Clean up optimized image if it was created
                if (fileToProcess !== req.file.path) {
                    fs.unlink(fileToProcess, () => {
                        console.log('Optimized file cleaned up');
                    });
                }
            }

            // Clean up original uploaded file
            fs.unlink(req.file.path, () => {
                console.log('Original file cleaned up');
            });

            res.json({
                status: 'success',
                text: extractedText
            });

        } catch (error) {
            console.error('Processing error:', error);
            // Clean up file on error
            if (req.file.path) {
                fs.unlink(req.file.path, () => {
                    console.log('Cleaned up file after error');
                });
            }
            res.status(500).json({
                status: 'error',
                message: 'Error processing file',
                details: error.message
            });
        }
    });
});

// Receipt Analysis endpoint
const CATEGORIES = {
    1: "Groceries",
    2: "Electronics",
    3: "Clothing & Accessories",
    4: "Food & Dining",
    5: "Household Items",
    6: "Health & Beauty",
    7: "Office Supplies",
    8: "Entertainment",
    9: "Transportation",
    10: "Services",
    11: "Others"
};

function categorizeItem(itemName) {
    const name = itemName.toLowerCase();
    
    // Category 1: Groceries
    if (/cheese|snack|cracker|vegetables|fruits|cauliflower|tomatos|nectarines|smiths|cheezels|chips|food|grocery|rice|bread|milk|egg|butter|yogurt|cereal|pasta|noodle|sauce|oil|sugar|flour|spice|vegetable|fruit|meat|chicken|fish|seafood|cookie|chocolate|candy|nuts/.test(name)) {
        return { id: 1, name: "Groceries" };
    }

    // Category 2: Electronics
    if (/phone|charger|cable|battery|laptop|computer|tablet|tv|television|headphone|speaker|camera|mouse|keyboard|printer|monitor|usb|drive|memory|card|adapter|power bank|gaming|console|smart|watch|electronic/.test(name)) {
        return { id: 2, name: "Electronics" };
    }

    // Category 3: Clothing & Accessories
    if (/shirt|pant|dress|jean|jacket|coat|sock|shoe|sneaker|boot|belt|scarf|hat|cap|glove|wallet|bag|purse|jewelry|watch|accessory|clothing|wear|fashion|apparel/.test(name)) {
        return { id: 3, name: "Clothing & Accessories" };
    }

    // Category 4: Food & Dining
    if (/restaurant|cafe|coffee|tea|burger|pizza|sandwich|meal|breakfast|lunch|dinner|takeout|delivery|drink|beverage|cola|pepsi|solo|juice|mango|fruit|lemon|water|soda|smoothie/.test(name)) {
        return { id: 4, name: "Food & Dining" };
    }

    // Category 5: Household Items
    if (/paper|cup|plate|napkin|tissue|household|cleaner|detergent|soap|towel|blanket|pillow|sheet|furniture|lamp|light|bulb|battery|tool|storage|container|bin|bag|hanger|brush|broom|mop/.test(name)) {
        return { id: 5, name: "Household Items" };
    }

    // Category 6: Health & Beauty
    if (/medicine|vitamin|supplement|bandage|first aid|dental|toothbrush|toothpaste|shampoo|conditioner|soap|lotion|cream|cosmetic|makeup|perfume|deodorant|razor|tissue|cotton|beauty|health|personal care/.test(name)) {
        return { id: 6, name: "Health & Beauty" };
    }

    // Category 7: Office Supplies
    if (/pen|pencil|marker|keji|officeworks|highlighter|paper|notebook|folder|file|binder|clip|stapler|tape|scissor|envelope|stamp|ink|toner|printer|calculator|desk|chair|office|stand|paper|stationery/.test(name)) {
        return { id: 7, name: "Office Supplies" };
    }

    // Category 8: Entertainment
    if (/movie|ticket|game|book|magazine|toy|sport|gym|fitness|hobby|music|concert|show|event|entertainment|streaming|subscription|dvd|video/.test(name)) {
        return { id: 8, name: "Entertainment" };
    }

    // Category 9: Transportation
    if (/fuel|gas|petrol|diesel|car|wash|parking|ticket|fare|bus|train|taxi|uber|transport|travel|toll|service|maintenance|repair/.test(name)) {
        return { id: 9, name: "Transportation" };
    }

    // Category 10: Services
    if (/service|repair|maintenance|cleaning|laundry|dry clean|salon|haircut|massage|spa|insurance|banking|fee|subscription|membership|consultation|installation/.test(name)) {
        return { id: 10, name: "Services" };
    }

    return { id: 11, name: "Others" }; // Default category
}


// Update the OpenAI prompt
app.post('/analyze-receipt', async (req, res) => {
    try {
        const { text } = req.body;
        console.log('Analyzing text:', text);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:  `You are a receipt analyzer. Categorize items based on these strict categories:
                    1: Groceries & Snacks - Snacks, food items, crackers
                    2: Beverages - Drinks, sodas, water, juices
                    3: Household Items - Paper products, cleaning supplies
                    4: Food & Dining - Prepared meals, takeout
                    5: Household Items - Home goods, supplies
                    6: Health & Beauty - Personal care items
                    7: Office Supplies - Stationery, office materials
                    8: Entertainment - Recreational items
                    9: Transportation - Travel related
                    10: Services - Professional services
                    11: Others - Uncategorized items

                    Format the response with proper categorization for each item.

                        Extract the following information and return in JSON format:
                        - Store name and location and ABN number
                        - Date and time
                        - Items purchased with quantities, prices, and categories
                        - Total amount
                        - Payment method
                        - Tax amount (if available)
                        - Any discounts applied
                        
                        IMPORTANT: For the date field, try to preserve the exact date format from the receipt. If the date is in a format like "DD/MM/YYYY", keep it that way. If it's in a format like "January 15, 2024", keep it that way. Don't convert to another format.
                        Other tings to consider: Always think deeply and try to guess from the Name of the Business what kind of Business is this refering too.

                        
                        Format the response exactly as:
                        {
                            "store": { 
                                "name": "", 
                                "location": "" 
                                "abn": ""  // Look for ABN number in the format XX XXX XXX XXX
                            },
                            "date": "",
                            "items": [
                                { 
                                    "name": "", 
                                    "quantity": 0, 
                                    "price": 0.00,
                                    "total": 0.00,
                                    "category_id": 0,
                                    "category_name": ""
                                }
                            ],
                            "totals": {
                                "subtotal": 0.00,
                                "tax": 0.00,
                                "total": 0.00
                            },
                            "payment": {
                                "method": "",
                                "reference": ""
                            }
                        }
                        
                        Assign appropriate category_id and category_name to each item based on the category list provided.
                        If you cannot determine a date, do NOT default to 01/01/1970. Instead, leave it as an empty string or try to extract any date-like information from the receipt, even if partial.`
                    },
                {
                    role: "user",
                    content: text
                }
            ],
            temperature: 0.1,
            max_tokens: 1200
        });

       try {
    // Get the raw response from OpenAI
    let rawContent = completion.choices[0].message.content;
    
    // Function to clean and parse OpenAI response
    function parseOpenAIResponse(content) {
        // Remove markdown code blocks
        let cleaned = content.replace(/```(?:json)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
        
        // If no code blocks were found, use original content
        if (cleaned === content.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '')) {
            cleaned = content.trim();
        }
        
        // Try to extract JSON object
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        // Try direct parse as fallback
        return JSON.parse(cleaned);
    }
    
    console.log('Raw OpenAI response:', rawContent);
    
    let analysisResult = parseOpenAIResponse(rawContent);
    
    // Validate the structure
    if (!analysisResult.items || !Array.isArray(analysisResult.items)) {
        throw new Error('Invalid response structure: missing items array');
    }
    
    // Post-process to ensure categories are properly assigned
    analysisResult.items = analysisResult.items.map(item => {
        const category = categorizeItem(item.name);
        return {
            ...item,
            category_id: category.id,
            category_name: category.name
        };
    });
    
    // Send successful response
    res.json({
        success: true,
        data: analysisResult
    });
    
} catch (error) {
    console.error('Analysis error:', error);
    console.error('Raw OpenAI response:', completion.choices[0].message.content);
    
    res.status(500).json({
        error: 'Failed to process receipt analysis',
        details: error.message
    })
}
} catch (error) {
    console.error('Overall analysis error:', error);
    res.status(500).json({
        success: false,
        message: 'Failed to analyze receipt',
        error: error.message
    });
}
});
// Save receipt to database
app.post('/save-receipt', authenticateUser, checkReceiptLimit, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { analysis } = req.body;

        // Parse the date
        const parsedDate = parseReceiptDate(analysis.date);

        // Format for MySQL (YYYY-MM-DD HH:MM:SS)
        const formattedDate = parsedDate ?
            parsedDate.toISOString().slice(0, 19).replace('T', ' ') :
            null;

        // ============================================
        // DUPLICATE DETECTION - Check before saving
        // ============================================
        const [duplicateCheck] = await connection.execute(`
            SELECT
                receipt_id,
                store_name,
                total,
                receipt_date,
                created_at
            FROM receipts
            WHERE user_id = ?
            AND store_name = ?
            AND total = ?
            AND DATE(receipt_date) = DATE(?)
            LIMIT 1
        `, [
            req.user.userId,
            analysis.store.name,
            analysis.totals.total,
            formattedDate || new Date()
        ]);

        if (duplicateCheck.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                isDuplicate: true,
                message: 'Possible duplicate receipt detected',
                duplicateReceipt: {
                    id: duplicateCheck[0].receipt_id,
                    store: duplicateCheck[0].store_name,
                    total: duplicateCheck[0].total,
                    date: duplicateCheck[0].receipt_date,
                    savedAt: duplicateCheck[0].created_at
                },
                currentReceipt: {
                    store: analysis.store.name,
                    total: analysis.totals.total,
                    date: formattedDate
                }
            });
        }
        // ============================================

        // Insert receipt with both original and parsed date
        const [receiptResult] = await connection.execute(
            `INSERT INTO receipts (
                store_name, 
                store_location, 
                store_abn,
                receipt_date,
                original_date_string, 
                subtotal, 
                tax, 
                total, 
                payment_method,
                user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                analysis.store.name,
                analysis.store.location,
                analysis.store.abn || null,
                formattedDate,  // Now we use the parsed date
                analysis.date,  // Still store original date string
                analysis.totals.subtotal,
                analysis.totals.tax,
                analysis.totals.total,
                analysis.payment.method,
                req.user.userId
            ]
        );
        const receiptId = receiptResult.insertId;

        // Batch insert all items at once for better performance
        if (analysis.items && analysis.items.length > 0) {
            const itemValues = analysis.items.map(item => [
                receiptId,
                item.name,
                item.quantity,
                item.price,
                item.total,
                item.category_id,
                item.category_name
            ]);

            await connection.query(
                `INSERT INTO receipt_items
                 (receipt_id, name, quantity, price, total_price, category_id, category_name)
                 VALUES ?`,
                [itemValues]
            );
        }

        // Increment user's monthly receipt count (inside transaction)
        await connection.execute(
            'UPDATE users SET monthly_receipt_count = monthly_receipt_count + 1 WHERE user_id = ?',
            [req.user.userId]
        );

        // Log usage (inside transaction)
        await connection.execute(
            `INSERT INTO usage_logs (user_id, action_type, metadata)
            VALUES (?, 'receipt_upload', JSON_OBJECT('receipt_id', ?))`,
            [req.user.userId, receiptId]
        ).catch(err => console.error('Error logging usage:', err));

        await connection.commit();

        res.json({
            success: true,
            message: 'Receipt saved successfully',
            receiptId
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Save error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save receipt',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});
// Get all receipts
app.get('/receipts', authenticateUser, async (req, res) => {
    try {
        const [receipts] = await pool.query(`
            SELECT * FROM receipts
            WHERE user_id = ? OR user_id IS NULL
            ORDER BY receipt_date DESC
        `, [req.user.userId]);

        res.json({
            success: true,
            receipts
        });

    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch receipts',
            error: error.message
        });
    }
});

// NEW: Get duplicate receipts for user review
app.get('/receipts/duplicates', authenticateUser, async (req, res) => {
    try {
        const [duplicates] = await pool.query(`
            SELECT
                GROUP_CONCAT(receipt_id ORDER BY receipt_id) as receipt_ids,
                store_name,
                total,
                receipt_date,
                COUNT(*) as duplicate_count,
                MIN(created_at) as first_saved,
                MAX(created_at) as last_saved
            FROM receipts
            WHERE user_id = ?
            GROUP BY user_id, store_name, total, DATE(receipt_date)
            HAVING COUNT(*) > 1
            ORDER BY last_saved DESC
        `, [req.user.userId]);

        // Get detailed info for each duplicate group
        const duplicateDetails = await Promise.all(duplicates.map(async (dup) => {
            const receiptIds = dup.receipt_ids.split(',').map(id => parseInt(id));

            const [receipts] = await pool.query(`
                SELECT
                    r.receipt_id,
                    r.store_name,
                    r.total,
                    r.receipt_date,
                    r.created_at,
                    COUNT(ri.item_id) as item_count
                FROM receipts r
                LEFT JOIN receipt_items ri ON r.receipt_id = ri.receipt_id
                WHERE r.receipt_id IN (?)
                GROUP BY r.receipt_id
                ORDER BY r.created_at ASC
            `, [receiptIds]);

            return {
                duplicateGroup: {
                    store: dup.store_name,
                    total: dup.total,
                    date: dup.receipt_date,
                    count: dup.duplicate_count
                },
                receipts: receipts
            };
        }));

        res.json({
            success: true,
            duplicateCount: duplicates.length,
            duplicates: duplicateDetails
        });

    } catch (error) {
        console.error('Fetch duplicates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch duplicate receipts',
            error: error.message
        });
    }
});

// Get receipt details by ID
app.get('/receipts/:id', authenticateUser, async (req, res) => {
    try {
        // Get receipt details - ensure it belongs to the user
        const [receipts] = await pool.query(
            'SELECT * FROM receipts WHERE receipt_id = ? AND (user_id = ? OR user_id IS NULL)',
            [req.params.id, req.user.userId]
        );

        if (receipts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receipt not found'
            });
        }

        // Get receipt items
        const [items] = await pool.query(
            'SELECT * FROM receipt_items WHERE receipt_id = ?',
            [req.params.id]
        );

        res.json({
            success: true,
            receipt: {
                ...receipts[0],
                items
            }
        });

    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch receipt details',
            error: error.message
        });
    }
});

// Update receipt
app.put('/receipts/:id', authenticateUser, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // Verify receipt belongs to the user
        const [receipts] = await connection.query(
            'SELECT * FROM receipts WHERE receipt_id = ? AND (user_id = ? OR user_id IS NULL)',
            [req.params.id, req.user.userId]
        );

        if (receipts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receipt not found or unauthorized'
            });
        }

        const { store_name, store_location, receipt_date, total, payment_method } = req.body;

        // Validate required fields
        if (!store_name || !receipt_date || total === undefined || !payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate non-negative total
        if (parseFloat(total) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Total cannot be negative'
            });
        }

        // Parse the date if it's provided
        let formattedDate = receipt_date;
        if (receipt_date) {
            const parsedDate = parseReceiptDate(receipt_date);
            formattedDate = parsedDate ?
                parsedDate.toISOString().slice(0, 19).replace('T', ' ') :
                receipt_date;
        }

        await connection.execute(
            `UPDATE receipts
            SET store_name = ?,
                store_location = ?,
                receipt_date = ?,
                total = ?,
                payment_method = ?
            WHERE receipt_id = ?`,
            [store_name, store_location, formattedDate, total, payment_method, req.params.id]
        );

        res.json({
            success: true,
            message: 'Receipt updated successfully'
        });

    } catch (error) {
        console.error('Update receipt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update receipt',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Update receipt item
app.put('/receipts/:receiptId/items/:itemId', authenticateUser, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // Verify receipt belongs to the user
        const [receipts] = await connection.query(
            'SELECT * FROM receipts WHERE receipt_id = ? AND (user_id = ? OR user_id IS NULL)',
            [req.params.receiptId, req.user.userId]
        );

        if (receipts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receipt not found or unauthorized'
            });
        }

        const { name, quantity, price, total_price, category_id, category_name } = req.body;

        // Validate required fields
        if (!name || quantity === undefined || price === undefined || total_price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate non-negative values
        if (parseFloat(quantity) < 0 || parseFloat(price) < 0 || parseFloat(total_price) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity, price, and total cannot be negative'
            });
        }

        await connection.execute(
            `UPDATE receipt_items
            SET name = ?,
                quantity = ?,
                price = ?,
                total_price = ?,
                category_id = ?,
                category_name = ?
            WHERE item_id = ? AND receipt_id = ?`,
            [name, quantity, price, total_price, category_id, category_name, req.params.itemId, req.params.receiptId]
        );

        res.json({
            success: true,
            message: 'Item updated successfully'
        });

    } catch (error) {
        console.error('Update item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update item',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Delete receipt
app.delete('/receipts/:id', authenticateUser, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Verify receipt belongs to the user
        const [receipts] = await connection.query(
            'SELECT * FROM receipts WHERE receipt_id = ? AND (user_id = ? OR user_id IS NULL)',
            [req.params.id, req.user.userId]
        );

        if (receipts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receipt not found or unauthorized'
            });
        }

        // Delete receipt items first (foreign key constraint)
        await connection.execute(
            'DELETE FROM receipt_items WHERE receipt_id = ?',
            [req.params.id]
        );

        // Delete the receipt
        await connection.execute(
            'DELETE FROM receipts WHERE receipt_id = ?',
            [req.params.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Receipt deleted successfully'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Delete receipt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete receipt',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Delete receipt item
app.delete('/receipts/:receiptId/items/:itemId', authenticateUser, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // Verify receipt belongs to the user
        const [receipts] = await connection.query(
            'SELECT * FROM receipts WHERE receipt_id = ? AND (user_id = ? OR user_id IS NULL)',
            [req.params.receiptId, req.user.userId]
        );

        if (receipts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receipt not found or unauthorized'
            });
        }

        // Delete the item
        const [result] = await connection.execute(
            'DELETE FROM receipt_items WHERE item_id = ? AND receipt_id = ?',
            [req.params.itemId, req.params.receiptId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        res.json({
            success: true,
            message: 'Item deleted successfully'
        });

    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete item',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

function parseReceiptDate(dateString) {
    if (!dateString) return null;
    
    // Remove any leading/trailing whitespace
    dateString = dateString.trim();
    
    // Try to detect and parse various date formats
    
    // Format: DD/MM/YYYY
    let match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        return new Date(year, month - 1, day);
    }
    
    // Format: DD/MM/YY
    match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
    if (match) {
        const [_, day, month, year] = match;
        // Determine century - if year > current 2-digit year + 20, assume 1900s, else 2000s
        const currentYear = new Date().getFullYear() % 100;
        const fullYear = parseInt(year) > currentYear + 20 ? 1900 + parseInt(year) : 2000 + parseInt(year);
        return new Date(fullYear, month - 1, day);
    }
    
    // Format: DD-MM-YYYY
    match = dateString.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        return new Date(year, month - 1, day);
    }
    
    // Format: YYYY-MM-DD
    match = dateString.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
        const [_, year, month, day] = match;
        return new Date(year, month - 1, day);
    }
    
    // Format: MM/DD/YYYY (US format)
    match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
        // This is ambiguous with DD/MM/YYYY format
        // For now, we'll assume Australian format (DD/MM/YYYY) is more likely
        // But you might want to add logic to detect US format specifically
        const [_, first, second, year] = match;
        // If first number is > 12, it must be a day
        if (parseInt(first) > 12) {
            return new Date(year, second - 1, first);
        }
    }
    
    // Format: DD/MM/YYYY HH:MM or DD/MM/YYYY HH:MM:SS
    match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (match) {
        const [_, day, month, year, hours, minutes, seconds = 0] = match;
        return new Date(year, month - 1, day, hours, minutes, seconds);
    }
    
    // Format: D/M/YYYY
    match = dateString.match(/(\d{1})\/(\d{1})\/(\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        return new Date(year, month - 1, day);
    }
    
    // Format: DD MMM YYYY (e.g., 15 Jan 2024)
    match = dateString.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
    if (match) {
        const [_, day, monthStr, year] = match;
        const months = {"jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5, 
                        "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11};
        const month = months[monthStr.toLowerCase().substring(0, 3)];
        return new Date(year, month, day);
    }
    
    // Format: MMM DD, YYYY (e.g., Jan 15, 2024)
    match = dateString.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:,|\.|\s)\s*(\d{4})/i);
    if (match) {
        const [_, monthStr, day, year] = match;
        const months = {"jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5, 
                        "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11};
        const month = months[monthStr.toLowerCase().substring(0, 3)];
        return new Date(year, month, day);
    }
    
    // Support for dates like "7/08/2024 11:46:56"
    match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (match) {
        const [_, day, month, year, hours, minutes, seconds] = match;
        return new Date(year, month - 1, day, hours, minutes, seconds);
    }
    
    // Try native Date parsing as a last resort
    const nativeDate = new Date(dateString);
    if (!isNaN(nativeDate.getTime())) {
        return nativeDate;
    }
    
    // If we couldn't parse the date, return null
    return null;
}
app.get('/spending-analysis', authenticateUser, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'spending-analysis.html'));
});

app.get('/report.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

const reportsDir = path.join(__dirname, 'public', 'reports');
if (!fs.existsSync(reportsDir)) {
    try {
        mkdirp.sync(reportsDir);
        console.log('Reports directory created successfully');
    } catch (error) {
        console.error('Failed to create reports directory:', error);
    }
}

fs.readdir(reportsDir, (err, files) => {
    if (err) {
        console.error('Error reading reports directory:', err);
        return;
    }
    
    const now = new Date();
    files.forEach(file => {
        const filePath = path.join(reportsDir, file);
        fs.stat(filePath, (err, stats) => {
            if (err) {
                console.error(`Error getting stats for file ${file}:`, err);
                return;
            }
            
            const fileAge = now - stats.mtime;
            const oneDayInMs = 24 * 60 * 60 * 1000;
            
            if (fileAge > oneDayInMs) {
                fs.unlink(filePath, err => {
                    if (err) {
                        console.error(`Error cleaning up old report file ${file}:`, err);
                    } else {
                        console.log(`Cleaned up old report file: ${file}`);
                    }
                });
            }
        });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access locally via: http://localhost:${PORT}`);
    console.log(`Access on network via: http://<your-ip-address>:${PORT}`);
    console.log('Server initialized and ready to process receipts');
});

// Clean up uploads directory on server start
fs.readdir('./uploads', (err, files) => {
    if (err) return;
    for (const file of files) {
        fs.unlink(path.join('./uploads', file), err => {
            if (err) console.error('Error cleaning up file:', file, err);
        });
    }
});
