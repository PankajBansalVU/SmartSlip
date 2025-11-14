// Simple script to add performance indexes to Aiven database
const mysql = require('mysql2/promise');

async function addIndexes() {
    console.log('Connecting to Aiven MySQL database...');

    const connection = await mysql.createConnection({
        host: 'smartslip-mysql-live-0b7b.j.aivencloud.com',
        port: 23718,
        user: 'avnadmin',
        password: process.argv[2] || '', // Pass password as argument
        database: 'defaultdb',
        ssl: {
            rejectUnauthorized: false
        }
    });

    console.log('Connected! Adding performance indexes...\n');

    // Check existing indexes first
    async function indexExists(table, indexName) {
        const [indexes] = await connection.query('SHOW INDEX FROM ?? WHERE Key_name = ?', [table, indexName]);
        return indexes.length > 0;
    }

    const indexes = [
        {
            name: 'idx_receipt_date',
            table: 'receipts',
            sql: 'CREATE INDEX idx_receipt_date ON receipts(receipt_date DESC)'
        },
        {
            name: 'idx_user_date',
            table: 'receipts',
            sql: 'CREATE INDEX idx_user_date ON receipts(user_id, receipt_date DESC)',
            existing: 'idx_user_receipt_date'  // Already exists with different name
        },
        {
            name: 'idx_created_at',
            table: 'receipts',
            sql: 'CREATE INDEX idx_created_at ON receipts(created_at DESC)'
        },
        {
            name: 'idx_category',
            table: 'receipt_items',
            sql: 'CREATE INDEX idx_category ON receipt_items(category_id)',
            existing: 'idx_receipt_items_category'  // Already exists with different name
        },
        {
            name: 'idx_active_plans',
            table: 'subscription_plans',
            sql: 'CREATE INDEX idx_active_plans ON subscription_plans(is_active)'
        },
        {
            name: 'idx_usage_created',
            table: 'usage_logs',
            sql: 'CREATE INDEX idx_usage_created ON usage_logs(created_at DESC)'
        }
    ];

    for (const index of indexes) {
        try {
            // Check if this index or an equivalent already exists
            if (index.existing) {
                const exists = await indexExists(index.table, index.existing);
                if (exists) {
                    console.log(`✅ Index already exists: ${index.existing} (covers ${index.name})`);
                    continue;
                }
            }

            // Check if the index we want to create already exists
            const exists = await indexExists(index.table, index.name);
            if (exists) {
                console.log(`✅ Index already exists: ${index.name}`);
                continue;
            }

            // Create the index
            await connection.execute(index.sql);
            console.log(`✅ Created new index: ${index.name}`);
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log(`✅ Index already exists: ${index.name}`);
            } else {
                console.log(`⚠️  Index ${index.name}: ${error.message}`);
            }
        }
    }

    // Verify indexes
    console.log('\nVerifying indexes on receipts table:');
    const [receiptsIndexes] = await connection.query('SHOW INDEX FROM receipts');
    receiptsIndexes.forEach(idx => {
        if (idx.Key_name.startsWith('idx_')) {
            console.log(`  - ${idx.Key_name}`);
        }
    });

    console.log('\nVerifying indexes on receipt_items table:');
    const [itemsIndexes] = await connection.query('SHOW INDEX FROM receipt_items');
    itemsIndexes.forEach(idx => {
        if (idx.Key_name.startsWith('idx_')) {
            console.log(`  - ${idx.Key_name}`);
        }
    });

    await connection.end();
    console.log('\n✅ All done! Performance indexes added successfully.');
}

// Check if password was provided
if (!process.argv[2]) {
    console.error('Usage: node add-indexes.js <your-database-password>');
    console.error('Example: node add-indexes.js mypassword123');
    process.exit(1);
}

addIndexes().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});
