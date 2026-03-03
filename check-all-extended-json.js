const mongoose = require('mongoose');
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels';

async function checkAllDates() {
    try {
        await mongoose.connect(url);
        const db = mongoose.connection.db;

        console.log('🔍 Comprehensive Extended JSON check...\n');

        // Find any doc with Extended JSON at any level
        const pipeline = [
            {
                $facet: {
                    'objectType_scheduledDate': [
                        { $match: { scheduledDate: { $type: 'object' } } },
                        { $count: 'count' }
                    ],
                    'objectType_createdAt': [
                        { $match: { createdAt: { $type: 'object' } } },
                        { $count: 'count' }
                    ],
                    'objectType_updatedAt': [
                        { $match: { updatedAt: { $type: 'object' } } },
                        { $count: 'count' }
                    ],
                    'objectType_completedDate': [
                        { $match: { completedDate: { $type: 'object' } } },
                        { $count: 'count' }
                    ],
                    'sample': [
                        { $limit: 1 },
                        { $project: { _id: 1, scheduledDate: 1, createdAt: 1, updatedAt: 1, completedDate: 1, customer: 1, customerIdType: { $type: '$customerId' } } }
                    ]
                }
            }
        ];

        const result = await db.collection('deliveries').aggregate(pipeline).toArray();
        const facets = result[0];

        console.log('Extended JSON Date Fields:');
        console.log(`- scheduledDate (object type): ${facets.objectType_scheduledDate[0]?.count || 0}`);
        console.log(`- createdAt (object type): ${facets.objectType_createdAt[0]?.count || 0}`);
        console.log(`- updatedAt (object type): ${facets.objectType_updatedAt[0]?.count || 0}`);
        console.log(`- completedDate (object type): ${facets.objectType_completedDate[0]?.count || 0}`);

        if (facets.sample[0]) {
            console.log('\n📋 Sample delivery fields:');
            const sample = facets.sample[0];
            console.log(`ID: ${sample._id}`);
            console.log(`scheduledDate: ${typeof sample.scheduledDate} | ${JSON.stringify(sample.scheduledDate).substring(0, 50)}`);
            console.log(`createdAt: ${typeof sample.createdAt} | ${JSON.stringify(sample.createdAt).substring(0, 50)}`);
            console.log(`customerId type: ${sample.customerIdType}`);

            // Check customer sub-object
            if (sample.customer) {
                console.log(`\nCustomer object exists:`);
                console.log(`- customer.createdAt: ${typeof sample.customer.createdAt} | ${JSON.stringify(sample.customer.createdAt).substring(0, 50)}`);
                console.log(`- customer.updatedAt: ${typeof sample.customer.updatedAt} | ${JSON.stringify(sample.customer.updatedAt).substring(0, 50)}`);
            }
        }

        // Count total deliveries
        const total = await db.collection('deliveries').countDocuments();
        console.log(`\n✅ Total deliveries: ${total}`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkAllDates();
