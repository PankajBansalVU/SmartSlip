// fix-receipt-dates.js
// This script will fix existing dates in the database
const mysql = require('mysql2/promise');
require('dotenv').config();

// First, log environment variables (without passwords)
console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST || 'not set');
console.log('DB_USER:', process.env.DB_USER || 'not set');
console.log('DB_NAME:', process.env.DB_NAME || 'not set');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'is set (hidden)' : 'not set');

/**
 * Parse various date formats from receipt text
 * @param {string} dateString - The original date string from the receipt
 * @returns {Date|null} - Parsed JavaScript Date object or null if parsing fails
 */
function parseReceiptDate(dateString) {
    if (!dateString) return null;
    
    console.log(`Attempting to parse date: "${dateString}"`);
    
    // Remove any leading/trailing whitespace
    dateString = dateString.trim();
    
    // Try to detect and parse various date formats
    
    // Format: DD/MM/YYYY
    let match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        console.log(`  Matched DD/MM/YYYY format: day=${day}, month=${month}, year=${year}`);
        return new Date(year, month - 1, day);
    }
    
    // Format: DD/MM/YY
    match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
    if (match) {
        const [_, day, month, year] = match;
        // Determine century - if year > current 2-digit year + 20, assume 1900s, else 2000s
        const currentYear = new Date().getFullYear() % 100;
        const fullYear = parseInt(year) > currentYear + 20 ? 1900 + parseInt(year) : 2000 + parseInt(year);
        console.log(`  Matched DD/MM/YY format: day=${day}, month=${month}, year=${year} => fullYear=${fullYear}`);
        return new Date(fullYear, month - 1, day);
    }
    
    // Format: DD-MM-YYYY
    match = dateString.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        console.log(`  Matched DD-MM-YYYY format: day=${day}, month=${month}, year=${year}`);
        return new Date(year, month - 1, day);
    }
    
    // Format: YYYY-MM-DD
    match = dateString.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
        const [_, year, month, day] = match;
        console.log(`  Matched YYYY-MM-DD format: day=${day}, month=${month}, year=${year}`);
        return new Date(year, month - 1, day);
    }
    
    // Format: DD/MM/YYYY HH:MM or DD/MM/YYYY HH:MM:SS
    match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (match) {
        const [_, day, month, year, hours, minutes, seconds = 0] = match;
        console.log(`  Matched DD/MM/YYYY HH:MM format: day=${day}, month=${month}, year=${year}, time=${hours}:${minutes}:${seconds}`);
        return new Date(year, month - 1, day, hours, minutes, seconds);
    }
    
    // Format: D/M/YYYY
    match = dateString.match(/(\d{1})\/(\d{1})\/(\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        console.log(`  Matched D/M/YYYY format: day=${day}, month=${month}, year=${year}`);
        return new Date(year, month - 1, day);
    }
    
    // Format: DD MMM YYYY (e.g., 15 Jan 2024)
    match = dateString.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
    if (match) {
        const [_, day, monthStr, year] = match;
        const months = {"jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5, 
                      "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11};
        const month = months[monthStr.toLowerCase().substring(0, 3)];
        console.log(`  Matched DD MMM YYYY format: day=${day}, month=${monthStr}(${month}), year=${year}`);
        return new Date(year, month, day);
    }
    
    // Format: MMM DD, YYYY (e.g., Jan 15, 2024)
    match = dateString.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:,|\.|\s)\s*(\d{4})/i);
    if (match) {
        const [_, monthStr, day, year] = match;
        const months = {"jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5, 
                      "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11};
        const month = months[monthStr.toLowerCase().substring(0, 3)];
        console.log(`  Matched MMM DD, YYYY format: day=${day}, month=${monthStr}(${month}), year=${year}`);
        return new Date(year, month, day);
    }
    
    // Support for dates like "7/08/2024 11:46:56"
    match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (match) {
        const [_, day, month, year, hours, minutes, seconds] = match;
        console.log(`  Matched D/MM/YYYY HH:MM:SS format: day=${day}, month=${month}, year=${year}, time=${hours}:${minutes}:${seconds}`);
        return new Date(year, month - 1, day, hours, minutes, seconds);
    }
    
    // Try native Date parsing as a last resort
    const nativeDate = new Date(dateString);
    if (!isNaN(nativeDate.getTime())) {
        console.log(`  Using native Date parsing: ${nativeDate.toISOString()}`);
        return nativeDate;
    }
    
    console.log('  ❌ Failed to parse date');
    return null;
}

async function fixDates() {
    let connection;
    
    try {
        console.log('Attempting to connect to the database...');
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database. Starting date fix process...');

        // Get all receipts with original_date_string but null receipt_date
        console.log('Querying database for receipts with NULL receipt_date...');
        const [receipts] = await connection.query(
            'SELECT receipt_id, original_date_string FROM receipts WHERE receipt_date IS NULL AND original_date_string IS NOT NULL'
        );

        console.log(`Found ${receipts.length} receipts to fix.`);

        if (receipts.length === 0) {
            // Also check for receipts with 1970-01-01 dates (Unix epoch)
            console.log('Checking for receipts with 1970-01-01 dates...');
            const [epochReceipts] = await connection.query(
                "SELECT receipt_id, original_date_string FROM receipts WHERE receipt_date = '1970-01-01 00:00:00' AND original_date_string IS NOT NULL"
            );
            
            if (epochReceipts.length > 0) {
                console.log(`Found ${epochReceipts.length} receipts with 1970-01-01 dates to fix.`);
                receipts.push(...epochReceipts);
            } else {
                console.log('No receipts with 1970-01-01 dates found.');
            }
        }

        // Process each receipt
        let successCount = 0;
        let failCount = 0;

        for (const receipt of receipts) {
            console.log(`\nProcessing Receipt ID ${receipt.receipt_id} with date string: "${receipt.original_date_string}"`);
            
            const parsedDate = parseReceiptDate(receipt.original_date_string);
            
            if (parsedDate && !isNaN(parsedDate.getTime())) {
                // Format for MySQL (YYYY-MM-DD HH:MM:SS)
                const formattedDate = parsedDate.toISOString().slice(0, 19).replace('T', ' ');
                
                console.log(`  Updating receipt ${receipt.receipt_id} with date: ${formattedDate}`);
                
                // Update the receipt with the parsed date
                try {
                    const [result] = await connection.query(
                        'UPDATE receipts SET receipt_date = ? WHERE receipt_id = ?',
                        [formattedDate, receipt.receipt_id]
                    );
                    
                    console.log(`  ✅ Receipt ID ${receipt.receipt_id}: Successfully updated (affected rows: ${result.affectedRows})`);
                    successCount++;
                } catch (updateError) {
                    console.error(`  ❌ Error updating Receipt ID ${receipt.receipt_id}:`, updateError);
                    failCount++;
                }
            } else {
                console.log(`  ❌ Receipt ID ${receipt.receipt_id}: Could not parse date "${receipt.original_date_string}"`);
                failCount++;
            }
        }

        console.log(`\nDate fix process completed.`);
        console.log(`Successfully updated: ${successCount} receipts`);
        console.log(`Failed to update: ${failCount} receipts`);
        
        // Add a query to show all dates in the database
        console.log('\nCurrent state of dates in the database:');
        const [dateStats] = await connection.query(
            'SELECT receipt_date, COUNT(*) as count FROM receipts GROUP BY receipt_date ORDER BY count DESC'
        );
        
        console.table(dateStats);

    } catch (error) {
        console.error('Error fixing dates:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        } else {
            console.log('No database connection to close.');
        }
    }
}

// Run the script
console.log('Starting the receipt date fix script...');
fixDates().catch(error => {
    console.error('Unhandled error in fixDates():', error);
});