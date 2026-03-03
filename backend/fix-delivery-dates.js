const mongoose = require('mongoose');
require('dotenv').config();

function fixExtendedJsonDates(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(item => fixExtendedJsonDates(item));

    // Check if this object IS an Extended JSON date
    if (obj['$date'] !== undefined) {
        return new Date(obj['$date']);
    }

    // Recurse into all fields
    const fixed = {};
    for (const [key, val] of Object.entries(obj)) {
        if (key === '_id') {
            fixed[key] = val;
        } else {
            fixed[key] = fixExtendedJsonDates(val);
        }
    }
    return fixed;
}

async function diagnoseAndFix() {
    await mongoose.connect(process.env.MONGODB_URI);
    const col = mongoose.connection.db.collection('deliveries');

    const all = await col.find({}).toArray();
    console.log('Total deliveries:', all.length);

    let fixCount = 0;

    for (const doc of all) {
        const updates = {};

        for (const [key, val] of Object.entries(doc)) {
            if (key === '_id') continue;

            if (val && typeof val === 'object') {
                const fixed = fixExtendedJsonDates(val);
                // Compare by JSON to see if anything changed
                if (JSON.stringify(fixed) !== JSON.stringify(val)) {
                    updates[key] = fixed;
                }
            }
        }

        if (Object.keys(updates).length > 0) {
            await col.updateOne({ _id: doc._id }, { $set: updates });
            fixCount++;
            console.log('Fixed delivery', String(doc._id), '- fields:', Object.keys(updates).join(', '));
        }
    }

    console.log('\nFixed', fixCount, 'deliveries');

    // Verify the specific problematic delivery
    const check = await col.findOne({ _id: new mongoose.Types.ObjectId('697d55e08d120b933c9cebcf') });
    if (check) {
        console.log('\nDelivery 697d... customer dates:');
        if (check.customer) {
            console.log('  customer.createdAt:', check.customer.createdAt, '- type:', check.customer.createdAt?.constructor?.name);
            console.log('  customer.updatedAt:', check.customer.updatedAt, '- type:', check.customer.updatedAt?.constructor?.name);
        }
        console.log('  scheduledDate:', check.scheduledDate, '- type:', check.scheduledDate?.constructor?.name);
        console.log('  completedDate:', check.completedDate, '- type:', check.completedDate?.constructor?.name);
    }

    await mongoose.disconnect();
}

diagnoseAndFix().catch(err => { console.error(err); process.exit(1); });
