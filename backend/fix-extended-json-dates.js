const mongoose = require('mongoose');
require('dotenv').config();

async function fixDates() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const collections = ['deliveries', 'sales', 'customers', 'users', 'inventoryitems', 'stores'];

    for (const colName of collections) {
        const col = db.collection(colName);
        const allDocs = await col.find({}).toArray();
        let fixCount = 0;

        for (const doc of allDocs) {
            const updates = {};
            for (const [key, val] of Object.entries(doc)) {
                if (key === '_id') continue;
                if (val && typeof val === 'object' && !Array.isArray(val) && val['$date']) {
                    updates[key] = new Date(val['$date']);
                }
            }
            if (Object.keys(updates).length > 0) {
                await col.updateOne({ _id: doc._id }, { $set: updates });
                fixCount++;
            }
        }

        if (fixCount > 0) {
            console.log(`🔧 ${colName}: fixed ${fixCount} documents`);
        } else {
            console.log(`✅ ${colName}: clean`);
        }
    }

    console.log('\n✅ All Extended JSON dates fixed!');
    await mongoose.disconnect();
}

fixDates().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
