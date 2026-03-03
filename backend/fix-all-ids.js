const mongoose = require('mongoose');
require('dotenv').config();

async function fixAll() {
    await mongoose.connect(process.env.MONGODB_URI);
    const col = mongoose.connection.db.collection('deliveries');

    let count = 0;

    try {
        // Use updateMany with aggregation pipeline
        const result = await col.updateMany(
            {},
            [
                {
                    $set: {
                        customerId: {
                            $cond: [
                                { $eq: [{ $type: '$customerId' }, 'object'] },
                                '$customerId._id',
                                '$customerId'
                            ]
                        }
                    }
                }
            ]
        );

        count = result.modifiedCount;
        console.log('✅ Fixed', count, 'deliveries - customerId restored to _id');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    await mongoose.disconnect();
}

fixAll();
