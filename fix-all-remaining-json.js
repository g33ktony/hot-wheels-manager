require('dotenv').config();
const mongoose = require('mongoose');

async function fixAllExtendedJSON() {
    try {
        const url = process.env.MONGODB_URI;
        if (!url) {
            console.error('❌ MONGODB_URI not found');
            return;
        }

        await mongoose.connect(url);
        const db = mongoose.connection.db;

        console.log('🔧 FIX: Converting ALL Extended JSON dates to proper BSON Dates\n');

        // Find all deliveries
        const allDels = await db.collection('deliveries').find({}).toArray();
        console.log(`Found ${allDels.length} total deliveries\n`);

        let fixedCount = 0;
        let hasIssues = [];

        // Check each one
        for (const del of allDels) {
            let needsFix = false;
            const updates = {};

            // Check each date field at top level
            ['scheduledDate', 'createdAt', 'updatedAt', 'completedDate'].forEach(field => {
                const val = del[field];
                if (val && typeof val === 'object' && val.$date) {
                    needsFix = true;
                    updates[field] = new Date(val.$date);
                }
            });

            // Check customer subdocument dates
            if (del.customer && typeof del.customer === 'object') {
                ['createdAt', 'updatedAt'].forEach(field => {
                    const val = del.customer[field];
                    if (val && typeof val === 'object' && val.$date) {
                        needsFix = true;
                        updates[`customer.${field}`] = new Date(val.$date);
                    }
                });
            }

            if (needsFix) {
                hasIssues.push(del._id);
                try {
                    await db.collection('deliveries').updateOne(
                        { _id: del._id },
                        { $set: updates }
                    );
                    fixedCount++;
                    console.log(`✅ Fixed delivery ${del._id}`);
                } catch (e) {
                    console.log(`❌ Failed to fix ${del._id}: ${e.message}`);
                }
            }
        }

        console.log(`\n✅ COMPLETED: Fixed ${fixedCount} deliveries`);
        console.log(`Deliveries that had issues: ${hasIssues.length}`);
        hasIssues.forEach(id => console.log(`  - ${id}`));

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

fixAllExtendedJSON();
