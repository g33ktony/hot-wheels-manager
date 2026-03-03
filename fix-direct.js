require('dotenv').config();
const { MongoClient } = require('mongodb');

async function fixDirectly() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        console.log('🔧 FIX: Direct MongoDB driver update\n');

        await client.connect();
        const db = client.db('railway');
        const deliveries = db.collection('deliveries');

        // Get all deliveries
        const all = await deliveries.find({}).toArray();
        console.log(`Found ${all.length} deliveries\n`);

        let fixed = 0;

        for (const doc of all) {
            const updates = {};
            let needsUpdate = false;

            // Check and fix top-level dates
            const dateFields = ['scheduledDate', 'createdAt', 'updatedAt', 'completedDate'];
            dateFields.forEach(field => {
                const val = doc[field];
                if (val && typeof val === 'object' && val.$date && typeof val.$date === 'string') {
                    updates[field] = new Date(val.$date);
                    needsUpdate = true;
                }
            });

            // Check and fix customer subdocument
            if (doc.customer && typeof doc.customer === 'object') {
                const custUpdates = {};
                ['createdAt', 'updatedAt'].forEach(field => {
                    const val = doc.customer[field];
                    if (val && typeof val === 'object' && val.$date && typeof val.$date === 'string') {
                        custUpdates[field] = new Date(val.$date);
                        needsUpdate = true;
                    }
                });
                if (Object.keys(custUpdates).length > 0) {
                    updates.customer = { ...doc.customer, ...custUpdates };
                }
            }

            if (needsUpdate) {
                await deliveries.updateOne(
                    { _id: doc._id },
                    { $set: updates }
                );
                fixed++;
                console.log(`✅ Fixed ${doc._id}`);
            }
        }

        console.log(`\n✅ COMPLETED: ${fixed} deliveries fixed`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await client.close();
    }
}

fixDirectly();
