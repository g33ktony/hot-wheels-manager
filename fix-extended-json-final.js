require('dotenv').config();
const { MongoClient } = require('mongodb');

async function fixWithAggregationPipeline() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        console.log('🔧 FIX: Using aggregation pipeline with $toDate\n');

        await client.connect();
        const db = client.db('railway');
        const deliveries = db.collection('deliveries');

        // Get all docs with Extended JSON
        const allDocs = await deliveries.find({}).toArray();
        const problematic = allDocs.filter(doc => {
            return (doc.scheduledDate && typeof doc.scheduledDate === 'object' && doc.scheduledDate.$date) ||
                (doc.createdAt && typeof doc.createdAt === 'object' && doc.createdAt.$date) ||
                (doc.updatedAt && typeof doc.updatedAt === 'object' && doc.updatedAt.$date) ||
                (doc.completedDate && typeof doc.completedDate === 'object' && doc.completedDate.$date);
        });

        console.log(`Found ${problematic.length} deliveries with Extended JSON dates\n`);

        for (const doc of problematic) {
            const updates = {};

            // Convert dates using proper JavaScript Date objects
            ['scheduledDate', 'createdAt', 'updatedAt', 'completedDate'].forEach(field => {
                const val = doc[field];
                if (val && typeof val === 'object' && val.$date && typeof val.$date === 'string') {
                    const dateObj = new Date(val.$date);
                    updates[field] = dateObj;
                    console.log(`  - ${field}: ${val.$date} → ${dateObj.toISOString()}`);
                }
            });

            // Also fix customer subdocument
            if (doc.customer && typeof doc.customer === 'object') {
                const newCustomer = { ...doc.customer };
                let customerNeedsFix = false;

                ['createdAt', 'updatedAt'].forEach(field => {
                    const val = doc.customer[field];
                    if (val && typeof val === 'object' && val.$date && typeof val.$date === 'string') {
                        const dateObj = new Date(val.$date);
                        newCustomer[field] = dateObj;
                        customerNeedsFix = true;
                        console.log(`  - customer.${field}: ${val.$date} → ${dateObj.toISOString()}`);
                    }
                });

                if (customerNeedsFix) {
                    updates.customer = newCustomer;
                }
            }

            if (Object.keys(updates).length > 0) {
                const result = await deliveries.updateOne(
                    { _id: doc._id },
                    {
                        $set: {
                            ...updates,
                            // Also update updatedAt to current time
                            updatedAt: new Date()
                        }
                    }
                );
                console.log(`✅ Updated delivery ${doc._id}`);
            }
        }

        console.log(`\n✅ COMPLETED: Fixed ${problematic.length} deliveries`);

        // Verify
        console.log('\n🔍 Verification - checking first delivery:');
        const sample = await deliveries.findOne({});
        if (sample) {
            console.log(`ID: ${sample._id}`);
            console.log(`scheduledDate: ${sample.scheduledDate} (${typeof sample.scheduledDate})`);
            console.log(`createdAt: ${sample.createdAt} (${typeof sample.createdAt})`);
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        await client.close();
    }
}

fixWithAggregationPipeline();
