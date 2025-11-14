const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('./config/db.config');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ExcelJS = require('exceljs');
const jwt = require('jsonwebtoken');

// FIXED: Proper authentication middleware using JWT (was hardcoded to userId: 1)
const authenticateUser = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Please login to generate reports.'
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
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please login again.'
        });
    }
};

// Add this debugging function BEFORE the main route
async function debugDataQueries(connection, userId, startDate, endDate, categoryId) {
    console.log('\n=== DEBUGGING DATA QUERIES ===');
    console.log('UserId:', userId);
    console.log('StartDate:', startDate);
    console.log('EndDate:', endDate);
    console.log('CategoryId:', categoryId);

    // Build filters
    const receiptDateFilter = startDate && endDate ? 
        `AND r.receipt_date BETWEEN '${startDate}' AND '${endDate}'` : '';
    const itemCategoryFilter = categoryId ? 
        `AND ri.category_id = ${categoryId}` : '';

    console.log('ReceiptDateFilter:', receiptDateFilter);
    console.log('ItemCategoryFilter:', itemCategoryFilter);

    // 1. TEST: Check raw receipts data
    console.log('\n--- 1. CHECKING RAW RECEIPTS ---');
    const [rawReceipts] = await connection.query(`
        SELECT 
            receipt_id,
            store_name,
            total,
            receipt_date,
            DATE_FORMAT(receipt_date, '%Y-%m') as month
        FROM receipts r
        WHERE r.user_id = ? ${receiptDateFilter}
        ORDER BY receipt_date DESC
        LIMIT 10
    `, [userId]);
    
    console.log('Raw Receipts Sample:', rawReceipts);
    console.log('Total Raw Receipts Found:', rawReceipts.length);

    // 2. TEST: Check raw receipt_items data
    console.log('\n--- 2. CHECKING RAW RECEIPT ITEMS ---');
    const [rawItems] = await connection.query(`
        SELECT 
            ri.item_id,
            ri.receipt_id,
            ri.name,
            ri.category_name,
            ri.total_price,
            ri.quantity,
            r.receipt_date
        FROM receipt_items ri
        JOIN receipts r ON ri.receipt_id = r.receipt_id
        WHERE r.user_id = ? ${receiptDateFilter} ${itemCategoryFilter}
        LIMIT 10
    `, [userId]);
    
    console.log('Raw Items Sample:', rawItems);
    console.log('Total Raw Items Found:', rawItems.length);

    console.log('\n=== END DEBUG ===\n');
}

// Main report generation endpoint
router.post('/generate', authenticateUser, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const {
            startDate,
            endDate,
            categoryId,
            reportFormat = 'pdf',
            reportTitle = 'Spending Analysis Report'
        } = req.body;

        const userId = req.user.userId;
        
        console.log(`Generating report for user ${userId}`);

        // Debug the data queries
        await debugDataQueries(connection, userId, startDate, endDate, categoryId);

        // Get comprehensive report data
        const reportData = await getReportData(connection, userId, startDate, endDate, categoryId);
        
        if (reportFormat === 'pdf') {
            const reportPath = await generatePDFReport(reportData, reportTitle, userId);
            const reportUrl = `/reports/${path.basename(reportPath)}`;

            res.json({
                success: true,
                reportUrl,
                message: 'PDF report generated successfully'
            });
        } else if (reportFormat === 'csv') {
            const reportPath = await generateCSVReport(reportData, reportTitle, userId);
            const reportUrl = `/reports/${path.basename(reportPath)}`;

            res.json({
                success: true,
                reportUrl,
                message: 'CSV report generated successfully'
            });
        } else if (reportFormat === 'excel') {
            const reportPath = await generateExcelReport(reportData, reportTitle, userId);
            const reportUrl = `/reports/${path.basename(reportPath)}`;

            res.json({
                success: true,
                reportUrl,
                message: 'Excel report generated successfully'
            });
        } else if (reportFormat === 'json') {
            res.json({
                success: true,
                reportData: {
                    ...reportData,
                    userId: userId, // Include userId for verification
                    generatedAt: new Date().toISOString()
                }
            });
        }
        
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate report',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// Get comprehensive report data
async function getReportData(connection, userId, startDate, endDate, categoryId) {
    // Build proper date filter for receipts table
    const receiptDateFilter = startDate && endDate ? 
        `AND r.receipt_date BETWEEN '${startDate}' AND '${endDate}'` : '';
    
    // Build proper category filter (only for item-based queries)
    const itemCategoryFilter = categoryId ? 
        `AND ri.category_id = ${categoryId}` : '';

    console.log('Debug: userId =', userId);
    console.log('Debug: receiptDateFilter =', receiptDateFilter);
    console.log('Debug: itemCategoryFilter =', itemCategoryFilter);

    // Get summary data
    const [summaryResults] = await connection.query(`
        SELECT 
            COUNT(DISTINCT r.receipt_id) as receipt_count,
            SUM(r.total) as total_spending,
            AVG(r.total) as avg_transaction,
            MIN(r.receipt_date) as first_transaction,
            MAX(r.receipt_date) as last_transaction
        FROM receipts r
        WHERE r.user_id = ? ${receiptDateFilter}
    `, [userId]);

    console.log('Debug: summaryResults =', summaryResults);

    // Get category breakdown
    const [categoryResults] = await connection.query(`
        SELECT 
            ri.category_id,
            ri.category_name,
            SUM(ri.total_price) as total_spent,
            COUNT(ri.item_id) as item_count,
            AVG(ri.total_price) as avg_item_price
        FROM receipt_items ri
        JOIN receipts r ON ri.receipt_id = r.receipt_id
        WHERE r.user_id = ? ${receiptDateFilter} ${itemCategoryFilter}
        GROUP BY ri.category_id, ri.category_name
        ORDER BY total_spent DESC
    `, [userId]);

    // Calculate percentages safely
    const totalSpending = Number(summaryResults[0]?.total_spending) || 0;
    const receiptCount = Number(summaryResults[0]?.receipt_count) || 0;
    
    console.log('Debug: totalSpending =', totalSpending, typeof totalSpending);
    console.log('Debug: receiptCount =', receiptCount, typeof receiptCount);

    const categories = categoryResults.map(cat => ({
        ...cat,
        total_spent: Number(cat.total_spent) || 0,
        percentage: totalSpending > 0 ? Math.round((Number(cat.total_spent) / totalSpending) * 100) : 0
    }));

    // Get monthly data
    const [monthlyResults] = await connection.query(`
        SELECT 
            DATE_FORMAT(r.receipt_date, '%Y-%m') as month,
            SUM(r.total) as total_spent,
            COUNT(r.receipt_id) as transaction_count
        FROM receipts r
        WHERE r.user_id = ? ${receiptDateFilter}
        GROUP BY DATE_FORMAT(r.receipt_date, '%Y-%m')
        ORDER BY month
    `, [userId]);

    // Get top stores
    const [storeResults] = await connection.query(`
        SELECT 
            r.store_name,
            COUNT(r.receipt_id) as visit_count,
            SUM(r.total) as total_spent,
            AVG(r.total) as avg_per_visit
        FROM receipts r
        WHERE r.user_id = ? ${receiptDateFilter}
        AND r.store_name IS NOT NULL AND r.store_name != ''
        GROUP BY r.store_name
        ORDER BY total_spent DESC
        LIMIT 10
    `, [userId]);

    // Get top items
    const [itemResults] = await connection.query(`
        SELECT 
            ri.name,
            ri.category_name,
            SUM(ri.total_price) as total_spent,
            SUM(ri.quantity) as total_quantity
        FROM receipt_items ri
        JOIN receipts r ON ri.receipt_id = r.receipt_id
        WHERE r.user_id = ? ${receiptDateFilter} ${itemCategoryFilter}
        GROUP BY ri.name, ri.category_name
        ORDER BY total_spent DESC
        LIMIT 15
    `, [userId]);

    // Process all data to ensure numbers
    const processedMonthlyData = monthlyResults.map(month => ({
        ...month,
        total_spent: Number(month.total_spent) || 0,
        transaction_count: Number(month.transaction_count) || 0
    }));

    const processedStoreData = storeResults.map(store => ({
        ...store,
        total_spent: Number(store.total_spent) || 0,
        visit_count: Number(store.visit_count) || 0,
        avg_per_visit: Number(store.avg_per_visit) || 0
    }));

    const processedItemData = itemResults.map(item => ({
        ...item,
        total_spent: Number(item.total_spent) || 0,
        total_quantity: Number(item.total_quantity) || 0
    }));

    const finalData = {
        summary: summaryResults[0],
        categories,
        monthlyData: processedMonthlyData,
        topStores: processedStoreData,
        topItems: processedItemData,
        totalSpending: totalSpending,
        receiptCount: receiptCount
    };

    console.log('Debug: Final data totalSpending =', finalData.totalSpending, typeof finalData.totalSpending);
    
    return finalData;
}

// Helper function to sanitize text for PDF - converts to plain ASCII
function sanitizeForPDF(text) {
    if (!text) return '';
    // Convert to string and remove any non-printable ASCII characters
    return String(text)
        .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII (space to ~)
        .trim();
}

// Generate PDF report - Simplified version
async function generatePDFReport(data, title, userId) {
    const doc = new PDFDocument({
        margin: 50,
        bufferPages: true,
        autoFirstPage: true
    });
    // FIXED: Include userId in filename to prevent report sharing between users
    const fileName = `report-user${userId}-${Date.now()}.pdf`;
    const reportsDir = path.join(__dirname, 'public', 'reports');
    const filePath = path.join(reportsDir, fileName);

    // Ensure directory exists
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filePath));

    // Generate the simplified report template
    await generateSimpleReportTemplate(doc, data, title);

    // Add footer to the last page only
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        // Only add footer to the last page
        if (i === pages.count - 1) {
            const footerY = doc.page.height - 60;
            doc.rect(0, footerY, doc.page.width, 60).fill('#f9fafb');
            doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
                .text('Generated by SmartSlip Receipt Tracker', 0, footerY + 20, { align: 'center', width: doc.page.width });
            doc.fontSize(8).fillColor('#9ca3af')
                .text('Report Date: ' + new Date().toLocaleDateString(), 0, footerY + 35, { align: 'center', width: doc.page.width });
        }
    }

    doc.end();
    return filePath;
}

// Generate CSV report
async function generateCSVReport(data, title, userId) {
    // FIXED: Include userId in filename to prevent report sharing between users
    const fileName = `report-user${userId}-${Date.now()}.csv`;
    const reportsDir = path.join(__dirname, 'public', 'reports');
    const filePath = path.join(reportsDir, fileName);

    // Ensure directory exists
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Flatten data for CSV - create rows for all items
    const csvRecords = [];

    // Add all top items with details
    if (data.topItems && Array.isArray(data.topItems)) {
        data.topItems.forEach(item => {
            csvRecords.push({
                item_name: item.name || '',
                category: item.category_name || '',
                total_spent: Number(item.total_spent || 0).toFixed(2),
                quantity: item.total_quantity || 0
            });
        });
    }

    const csvWriter = createCsvWriter({
        path: filePath,
        header: [
            { id: 'item_name', title: 'Item Name' },
            { id: 'category', title: 'Category' },
            { id: 'total_spent', title: 'Total Spent ($)' },
            { id: 'quantity', title: 'Quantity' }
        ]
    });

    await csvWriter.writeRecords(csvRecords);
    return filePath;
}

// Generate Excel report
async function generateExcelReport(data, title, userId) {
    // FIXED: Include userId in filename to prevent report sharing between users
    const fileName = `report-user${userId}-${Date.now()}.xlsx`;
    const reportsDir = path.join(__dirname, 'public', 'reports');
    const filePath = path.join(reportsDir, fileName);

    // Ensure directory exists
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartSlip Receipt Tracker';
    workbook.created = new Date();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
    ];

    const totalSpending = Number(data.totalSpending || 0);
    const receiptCount = Number(data.receiptCount || 0);
    const avgTransaction = receiptCount > 0 ? totalSpending / receiptCount : 0;

    summarySheet.addRows([
        { metric: 'Total Spending', value: `$${totalSpending.toFixed(2)}` },
        { metric: 'Total Transactions', value: receiptCount },
        { metric: 'Average per Receipt', value: `$${avgTransaction.toFixed(2)}` },
        { metric: 'Number of Categories', value: data.categories?.length || 0 },
        { metric: 'Report Generated', value: new Date().toLocaleString() }
    ]);

    // Style header row
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Sheet 2: Categories
    const categoriesSheet = workbook.addWorksheet('Categories');
    categoriesSheet.columns = [
        { header: 'Category', key: 'category', width: 30 },
        { header: 'Total Spent', key: 'total', width: 15 },
        { header: 'Percentage', key: 'percentage', width: 15 },
        { header: 'Item Count', key: 'items', width: 15 }
    ];

    if (data.categories && Array.isArray(data.categories)) {
        data.categories.forEach(cat => {
            categoriesSheet.addRow({
                category: cat.category_name || '',
                total: Number(cat.total_spent || 0).toFixed(2),
                percentage: `${cat.percentage || 0}%`,
                items: cat.item_count || 0
            });
        });
    }

    categoriesSheet.getRow(1).font = { bold: true };
    categoriesSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
    };
    categoriesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Sheet 3: Top Stores
    const storesSheet = workbook.addWorksheet('Top Stores');
    storesSheet.columns = [
        { header: 'Store Name', key: 'store', width: 35 },
        { header: 'Visits', key: 'visits', width: 12 },
        { header: 'Total Spent', key: 'total', width: 15 },
        { header: 'Avg per Visit', key: 'avg', width: 15 }
    ];

    if (data.topStores && Array.isArray(data.topStores)) {
        data.topStores.forEach(store => {
            storesSheet.addRow({
                store: store.store_name || '',
                visits: store.visit_count || 0,
                total: Number(store.total_spent || 0).toFixed(2),
                avg: Number(store.avg_per_visit || 0).toFixed(2)
            });
        });
    }

    storesSheet.getRow(1).font = { bold: true };
    storesSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
    };
    storesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Sheet 4: Top Items
    const itemsSheet = workbook.addWorksheet('Top Items');
    itemsSheet.columns = [
        { header: 'Item Name', key: 'item', width: 40 },
        { header: 'Category', key: 'category', width: 25 },
        { header: 'Total Spent', key: 'total', width: 15 },
        { header: 'Quantity', key: 'quantity', width: 12 }
    ];

    if (data.topItems && Array.isArray(data.topItems)) {
        data.topItems.forEach(item => {
            itemsSheet.addRow({
                item: item.name || '',
                category: item.category_name || '',
                total: Number(item.total_spent || 0).toFixed(2),
                quantity: item.total_quantity || 0
            });
        });
    }

    itemsSheet.getRow(1).font = { bold: true };
    itemsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
    };
    itemsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Sheet 5: Monthly Trends
    const monthlySheet = workbook.addWorksheet('Monthly Trends');
    monthlySheet.columns = [
        { header: 'Month', key: 'month', width: 15 },
        { header: 'Total Spent', key: 'total', width: 15 },
        { header: 'Transactions', key: 'count', width: 15 }
    ];

    if (data.monthlyData && Array.isArray(data.monthlyData)) {
        data.monthlyData.forEach(month => {
            monthlySheet.addRow({
                month: month.month || '',
                total: Number(month.total_spent || 0).toFixed(2),
                count: month.transaction_count || 0
            });
        });
    }

    monthlySheet.getRow(1).font = { bold: true };
    monthlySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
    };
    monthlySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    await workbook.xlsx.writeFile(filePath);
    return filePath;
}

// Professional report template with modern design
async function generateSimpleReportTemplate(doc, data, title) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Modern Header with Background
    doc.rect(0, 0, pageWidth, 120).fill('#2563eb');
    doc.fontSize(28).font('Helvetica-Bold').fillColor('white')
        .text(title, margin, 30, { align: 'center' });
    doc.fontSize(12).fillColor('#e0e7ff')
        .text('Your Comprehensive Spending Analysis', margin, 65, { align: 'center' });
    doc.fontSize(10).fillColor('#bfdbfe')
        .text('Generated: ' + new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }), margin, 85, { align: 'center' });

    doc.y = 140;

    // Executive Summary Cards - More compact
    const totalSpending = Number(data.totalSpending) || 0;
    const receiptCount = Number(data.receiptCount) || 0;
    const avgTransaction = receiptCount > 0 ? totalSpending / receiptCount : 0;

    // Create 4 metric cards - smaller and tighter
    const cardWidth = 115;
    const cardHeight = 60;
    const cardGap = 12;
    const startX = 50;
    const startY = doc.y;

    const metrics = [
        { label: 'Total Spending', value: '$' + totalSpending.toFixed(2), color: '#10b981' },
        { label: 'Transactions', value: String(receiptCount), color: '#3b82f6' },
        { label: 'Avg per Receipt', value: '$' + avgTransaction.toFixed(2), color: '#8b5cf6' },
        { label: 'Categories', value: String(data.categories.length), color: '#f59e0b' }
    ];

    metrics.forEach((metric, i) => {
        const x = startX + (i * (cardWidth + cardGap));
        const y = startY;

        // Card background
        doc.roundedRect(x, y, cardWidth, cardHeight, 5).fillAndStroke('#ffffff', '#e5e7eb');

        // Label (at top now)
        doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
            .text(metric.label, x + 8, y + 10, { width: cardWidth - 16, align: 'left' });

        // Value (larger, in the middle)
        doc.fontSize(18).font('Helvetica-Bold').fillColor(metric.color)
            .text(metric.value, x + 8, y + 28, { width: cardWidth - 16, align: 'left' });
    });

    doc.y = startY + cardHeight + 20;

    // Category Breakdown Section
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1f2937')
        .text('Spending by Category', 50);
    doc.moveDown(0.5);

    const maxBarWidth = 200;
    const barHeight = 18;

    data.categories.slice(0, 8).forEach((cat, index) => {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
        const color = colors[index % colors.length];
        const catSpent = Number(cat.total_spent) || 0;
        const catPercent = Number(cat.percentage) || 0;
        const catItems = Number(cat.item_count) || 0;

        const y = doc.y;
        const barWidth = totalSpending > 0 ? (catSpent / totalSpending) * maxBarWidth : 0;

        // Category name with item count
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1f2937')
            .text(sanitizeForPDF(cat.category_name) + ' (' + catItems + ')', 50, y + 4, { width: 120 });

        // Progress bar background
        doc.roundedRect(175, y, maxBarWidth, barHeight, 3)
            .fillAndStroke('#f3f4f6', '#e5e7eb');

        // Progress bar filled
        if (barWidth > 0) {
            doc.roundedRect(175, y, Math.max(barWidth, 3), barHeight, 3)
                .fill(color);
        }

        // Amount and percentage on right side - well within page bounds
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1f2937')
            .text('$' + catSpent.toFixed(2), 385, y + 4, { width: 60, align: 'right' });

        doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
            .text('(' + catPercent + '%)', 450, y + 4, { width: 50, align: 'right' });

        doc.moveDown(1.2);
    });

    doc.moveDown(1.5);

    // Top Stores Section - Keep on same page if possible
    if (data.topStores && Array.isArray(data.topStores) && data.topStores.length > 0) {
        // Only add new page if not enough space
        if (doc.y > 600) {
            doc.addPage();
        }

        doc.fontSize(16).font('Helvetica-Bold').fillColor('#1f2937')
            .text('Top Stores', 50);
        doc.moveDown(0.5);

        data.topStores.slice(0, 8).forEach((store, index) => {
            const storeSpent = Number(store.total_spent) || 0;
            const storeVisits = Number(store.visit_count) || 0;
            const storeAvg = Number(store.avg_per_visit) || 0;
            const y = doc.y;

            // Compact store listing
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#1f2937')
                .text((index + 1) + '. ' + store.store_name, 50, y);

            doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
                .text('$' + storeSpent.toFixed(2) + ' | ' + storeVisits + ' visits | Avg: $' + storeAvg.toFixed(2), 70, y + 14);

            doc.moveDown(1.5);
        });

        doc.moveDown(1);
    }

    // Spending Insights Section - keep on same page if possible
    if (doc.y > 650) {
        doc.addPage();
    }

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1f2937')
        .text('Key Insights', 50);
    doc.moveDown(0.5);

    // Generate insights
    const insights = [];
    if (data.categories && data.categories.length > 0) {
        const topCategory = data.categories[0];
        insights.push('Your highest spending category is ' + sanitizeForPDF(topCategory.category_name) + ' at $' + Number(topCategory.total_spent).toFixed(2) + ' (' + topCategory.percentage + '% of total).');
    }
    if (data.topStores && data.topStores.length > 0) {
        const topStore = data.topStores[0];
        insights.push('You shop most frequently at ' + sanitizeForPDF(topStore.store_name) + ', with ' + topStore.visit_count + ' visits totaling $' + Number(topStore.total_spent).toFixed(2) + '.');
    }
    if (avgTransaction > 0) {
        insights.push('Your average transaction amount is $' + avgTransaction.toFixed(2) + '.');
    }
    if (data.monthlyData && data.monthlyData.length > 1) {
        const recent = data.monthlyData[data.monthlyData.length - 1];
        const previous = data.monthlyData[data.monthlyData.length - 2];
        const change = ((Number(recent.total_spent) - Number(previous.total_spent)) / Number(previous.total_spent)) * 100;
        if (Math.abs(change) > 5) {
            const direction = change > 0 ? 'increased' : 'decreased';
            insights.push('Your spending ' + direction + ' by ' + Math.abs(change).toFixed(1) + '% compared to last month.');
        }
    }

    insights.forEach((insight, i) => {
        const y = doc.y;
        doc.roundedRect(50, y, 495, 26, 5).fillAndStroke('#f0f9ff', '#bfdbfe');
        doc.fontSize(9).font('Helvetica').fillColor('#1f2937')
            .text((i + 1) + '. ' + insight, 60, y + 7, { width: 475 });
        doc.moveDown(1.5);
    });

    // Monthly Trends
    if (data.monthlyData && Array.isArray(data.monthlyData) && data.monthlyData.length > 0) {
        // Only add page if needed
        if (doc.y > 650) {
            doc.addPage();
        } else {
            doc.moveDown(1.5);
        }

        doc.fontSize(16).font('Helvetica-Bold').fillColor('#1f2937')
            .text('Monthly Trends', 50);
        doc.moveDown(0.5);

        const maxMonthly = Math.max(...data.monthlyData.map(m => Number(m.total_spent)));

        data.monthlyData.forEach(month => {
            const monthSpent = Number(month.total_spent) || 0;
            const monthTransactions = Number(month.transaction_count) || 0;
            const monthPercent = maxMonthly > 0 ? (monthSpent / maxMonthly) * 100 : 0;
            const y = doc.y;

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#1f2937')
                .text(month.month, 50, y + 1);

            // Bar - more compact
            const barWidth = (monthPercent / 100) * 250;
            doc.roundedRect(120, y, 250, 14, 3).fillAndStroke('#f3f4f6', '#e5e7eb');
            if (barWidth > 0) {
                doc.roundedRect(120, y, Math.max(barWidth, 3), 14, 3).fill('#3b82f6');
            }

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#1f2937')
                .text('$' + monthSpent.toFixed(2) + ' (' + monthTransactions + ')', 380, y + 1);

            doc.moveDown(0.9);
        });
    }

    // Top Items Analysis
    if (data.topItems && Array.isArray(data.topItems) && data.topItems.length > 0) {
        // Only add page if needed
        if (doc.y > 600) {
            doc.addPage();
        } else {
            doc.moveDown(1.5);
        }

        doc.fontSize(16).font('Helvetica-Bold').fillColor('#1f2937')
            .text('Top Purchased Items', 50);
        doc.moveDown(0.5);

        data.topItems.slice(0, 12).forEach((item, index) => {
            const itemSpent = Number(item.total_spent) || 0;
            const itemQty = Number(item.total_quantity) || 0;

            // Check if we need a new page (item needs ~22 points of space)
            if (doc.y > 720) {
                doc.addPage();
            }

            const y = doc.y;

            // Compact single-line format: "1. Item Name - Category"
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#1f2937')
                .text((index + 1) + '. ' + sanitizeForPDF(item.name), 50, y, { width: 280, continued: false });

            doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
                .text(sanitizeForPDF(item.category_name), 50, y + 11);

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#10b981')
                .text('$' + itemSpent.toFixed(2), 380, y);
            doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
                .text('Qty: ' + itemQty, 450, y);

            doc.moveDown(1.1);
        });
    }
}

// Get recent reports
router.get('/recent', authenticateUser, async (req, res) => {
    try {
        const reportsDir = path.join(__dirname, 'public', 'reports');
        
        if (!fs.existsSync(reportsDir)) {
            return res.json({ success: true, reports: [] });
        }

        const files = fs.readdirSync(reportsDir)
            .filter(file => file.endsWith('.pdf'))
            .map(file => {
                const filePath = path.join(reportsDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: `/reports/${file}`,
                    created: stats.birthtime,
                    size: Math.round(stats.size / 1024) // Size in KB
                };
            })
            .sort((a, b) => b.created - a.created)
            .slice(0, 10); // Last 10 reports

        res.json({ success: true, reports: files });
    } catch (error) {
        console.error('Error getting recent reports:', error);
        res.json({ success: true, reports: [] });
    }
});

module.exports = router;