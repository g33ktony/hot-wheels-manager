const mongoose = require('mongoose');
require('dotenv').config();

async function fixCustomerIds() {
    await mongoose.connect(process.env.MONGODB_URI);
    const col = mongoose.connection.db.collection('deliveries');

    const all = await col.find({}).toArray();
    let fixCount = 0;

    for (const doc of all) {
        // Check if customerId is an object (it should be a string like ObjectId)
        if (doc.customerId && typeof doc.customerId === 'object' && !(doc.customerId instanceof mongoose.Types.ObjectId)) {
            // If it's an object with _id field, use _id as the customerId
            let custId = doc.customerId._id;

            // custId might be an ObjectId or a string
            if (custId instanceof mongoose.Types.ObjectId) {
                custId = custId;  // Keep as ObjectId
            } else if (typeof custId === 'string' && custId.length === 24) {
                custId = new mongoose.Types.ObjectId(custId);
            } else {
                console.log('⚠️  Could not parse customerId for delivery', String(doc._id), '- skipping');
                continue;
            }

            await col.updateOne(
                { _id: doc._id },
                {
                    $set: {
                        customerId: custId
                    }
                }
            );
            fixCount++;
            console.log('✅ Fixed delivery', String(doc._id), '- restored customerId');
        }
    }

    console.log('\nFixed', fixCount, 'deliveries with bad customerId');
    await mongoose.disconnect();
}

fixCustomerIds().catch(err => { console.error(err); process.exit(1); });
