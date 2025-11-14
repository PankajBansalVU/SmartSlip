/**
 * Diagnostic Script for Report Data Issues
 *
 * This script checks for common data integrity problems that cause
 * incorrect report generation:
 *
 * 1. Orphaned receipt items (items without parent receipts)
 * 2. Mismatched totals (receipt.total != sum of items)
 * 3. NULL or zero values in critical fields
 * 4. Missing user_id assignments
 * 5. Duplicate receipts
 */

const pool = require('../config/db.config');

async function diagnoseReportIssues(userId = null) {
    let connection;
    try {
        connection = await pool.getConnection();

        console.log('\n========================================');
        console.log('🔍 SmartSlip Report Data Diagnosis');
        console.log('========================================\n');

        const userFilter = userId ? `WHERE user_id = ${userId}` : '';
        const userJoinFilter = userId ? `AND r.user_id = ${userId}` : '';

        // ============================================
        // CHECK 1: Orphaned Receipt Items
        // ============================================
        console.log('1️⃣  Checking for orphaned receipt items...');
        const [orphanedItems] = await connection.query(`
            SELECT COUNT(*) as count
            FROM receipt_items ri
            LEFT JOIN receipts r ON ri.receipt_id = r.receipt_id
            WHERE r.receipt_id IS NULL
        `);

        if (orphanedItems[0].count > 0) {
            console.log(`   ❌ PROBLEM: Found ${orphanedItems[0].count} orphaned items (items without receipts)`);

            const [orphanedDetails] = await connection.query(`
                SELECT ri.item_id, ri.receipt_id, ri.name, ri.total_price
                FROM receipt_items ri
                LEFT JOIN receipts r ON ri.receipt_id = r.receipt_id
                WHERE r.receipt_id IS NULL
                LIMIT 5
            `);
            console.log('   Sample orphaned items:', orphanedDetails);
        } else {
            console.log('   ✅ No orphaned items found');
        }

        // ============================================
        // CHECK 2: Receipts with No Items
        // ============================================
        console.log('\n2️⃣  Checking for receipts with no items...');
        const [emptyReceipts] = await connection.query(`
            SELECT COUNT(*) as count
            FROM receipts r
            LEFT JOIN receipt_items ri ON r.receipt_id = ri.receipt_id
            ${userFilter}
            GROUP BY r.receipt_id
            HAVING COUNT(ri.item_id) = 0
        `);

        const emptyCount = emptyReceipts.length;
        if (emptyCount > 0) {
            console.log(`   ⚠️  WARNING: Found ${emptyCount} receipts with no items`);

            const [emptyDetails] = await connection.query(`
                SELECT r.receipt_id, r.store_name, r.total, r.receipt_date
                FROM receipts r
                LEFT JOIN receipt_items ri ON r.receipt_id = ri.receipt_id
                ${userFilter}
                GROUP BY r.receipt_id
                HAVING COUNT(ri.item_id) = 0
                LIMIT 5
            `);
            console.log('   Sample empty receipts:', emptyDetails);
        } else {
            console.log('   ✅ All receipts have items');
        }

        // ============================================
        // CHECK 3: Total Mismatch
        // ============================================
        console.log('\n3️⃣  Checking for receipt total mismatches...');
        const [mismatchQuery] = await connection.query(`
            SELECT
                r.receipt_id,
                r.user_id,
                r.store_name,
                r.total as receipt_total,
                COALESCE(SUM(ri.total_price), 0) as items_total,
                ABS(r.total - COALESCE(SUM(ri.total_price), 0)) as difference
            FROM receipts r
            LEFT JOIN receipt_items ri ON r.receipt_id = ri.receipt_id
            ${userFilter}
            GROUP BY r.receipt_id
            HAVING ABS(r.total - COALESCE(SUM(ri.total_price), 0)) > 0.10
            LIMIT 10
        `);

        if (mismatchQuery.length > 0) {
            console.log(`   ⚠️  WARNING: Found ${mismatchQuery.length} receipts with total mismatches`);
            console.log('   Sample mismatches:');
            mismatchQuery.forEach(r => {
                console.log(`      Receipt #${r.receipt_id}: Receipt Total=$${r.receipt_total}, Items Sum=$${r.items_total}, Diff=$${r.difference}`);
            });
        } else {
            console.log('   ✅ All receipt totals match item sums');
        }

        // ============================================
        // CHECK 4: NULL or Zero Values
        // ============================================
        console.log('\n4️⃣  Checking for NULL or zero values...');

        const [nullReceipts] = await connection.query(`
            SELECT COUNT(*) as count
            FROM receipts
            WHERE user_id IS NULL OR total IS NULL OR total = 0 OR receipt_date IS NULL
        `);

        if (nullReceipts[0].count > 0) {
            console.log(`   ❌ PROBLEM: Found ${nullReceipts[0].count} receipts with NULL/zero values`);

            const [nullDetails] = await connection.query(`
                SELECT receipt_id, user_id, total, receipt_date, store_name
                FROM receipts
                WHERE user_id IS NULL OR total IS NULL OR total = 0 OR receipt_date IS NULL
                LIMIT 5
            `);
            console.log('   Sample problematic receipts:', nullDetails);
        } else {
            console.log('   ✅ No NULL/zero values in receipts');
        }

        const [nullItems] = await connection.query(`
            SELECT COUNT(*) as count
            FROM receipt_items
            WHERE total_price IS NULL OR total_price = 0 OR name IS NULL
        `);

        if (nullItems[0].count > 0) {
            console.log(`   ⚠️  WARNING: Found ${nullItems[0].count} items with NULL/zero values`);
        } else {
            console.log('   ✅ No NULL/zero values in receipt_items');
        }

        // ============================================
        // CHECK 5: Missing User IDs
        // ============================================
        console.log('\n5️⃣  Checking for missing user IDs...');
        const [noUser] = await connection.query(`
            SELECT COUNT(*) as count
            FROM receipts
            WHERE user_id IS NULL
        `);

        if (noUser[0].count > 0) {
            console.log(`   ❌ CRITICAL: Found ${noUser[0].count} receipts with no user_id!`);
            console.log('   These receipts will NOT appear in any user reports!');
        } else {
            console.log('   ✅ All receipts have user_id');
        }

        // ============================================
        // CHECK 6: Duplicate Receipts
        // ============================================
        console.log('\n6️⃣  Checking for duplicate receipts...');
        const [duplicates] = await connection.query(`
            SELECT
                user_id,
                store_name,
                total,
                receipt_date,
                COUNT(*) as duplicate_count
            FROM receipts
            ${userFilter}
            GROUP BY user_id, store_name, total, receipt_date
            HAVING COUNT(*) > 1
            LIMIT 5
        `);

        if (duplicates.length > 0) {
            console.log(`   ⚠️  WARNING: Found ${duplicates.length} sets of possible duplicate receipts`);
            console.log('   Sample duplicates:', duplicates);
        } else {
            console.log('   ✅ No obvious duplicates found');
        }

        // ============================================
        // CHECK 7: User-Specific Summary (if userId provided)
        // ============================================
        if (userId) {
            console.log(`\n7️⃣  User ${userId} Summary:`);

            const [userSummary] = await connection.query(`
                SELECT
                    COUNT(DISTINCT r.receipt_id) as receipt_count,
                    SUM(r.total) as total_from_receipts,
                    COUNT(ri.item_id) as total_items,
                    SUM(ri.total_price) as total_from_items
                FROM receipts r
                LEFT JOIN receipt_items ri ON r.receipt_id = ri.receipt_id
                WHERE r.user_id = ?
            `, [userId]);

            const summary = userSummary[0];
            console.log(`   Total Receipts: ${summary.receipt_count}`);
            console.log(`   Total from Receipts Table: $${summary.total_from_receipts || 0}`);
            console.log(`   Total Items: ${summary.total_items}`);
            console.log(`   Total from Items Table: $${summary.total_from_items || 0}`);

            const diff = Math.abs((summary.total_from_receipts || 0) - (summary.total_from_items || 0));
            if (diff > 0.10) {
                console.log(`   ⚠️  MISMATCH: Difference of $${diff.toFixed(2)}`);
            } else {
                console.log(`   ✅ Totals match!`);
            }
        }

        // ============================================
        // CHECK 8: Category Issues
        // ============================================
        console.log('\n8️⃣  Checking category data...');
        const [uncategorized] = await connection.query(`
            SELECT COUNT(*) as count
            FROM receipt_items
            WHERE category_name IS NULL OR category_name = '' OR category_id IS NULL
        `);

        if (uncategorized[0].count > 0) {
            console.log(`   ⚠️  WARNING: Found ${uncategorized[0].count} items without category`);
        } else {
            console.log('   ✅ All items have categories');
        }

        console.log('\n========================================');
        console.log('✅ Diagnosis Complete');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Diagnosis Error:', error);
    } finally {
        if (connection) connection.release();
    }
}

// Run diagnosis
const userId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (userId) {
    console.log(`Running diagnosis for User ID: ${userId}\n`);
} else {
    console.log('Running diagnosis for ALL users\n');
    console.log('To check a specific user, run: node diagnosReportIssues.js <userId>\n');
}

diagnoseReportIssues(userId).then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
