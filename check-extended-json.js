const mongoose = require('mongoose');
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels';

async function checkDates() {
    try {
        await mongoose.connect(url);
        const db = mongoose.connection.db;

        console.log('🔍 Checking for Extended JSON dates in deliveries...\n');

        // Find deliveries with object-type dates
        const badDates = await db.collection('deliveries').find(
            { scheduledDate: { $type: 'object' } }
        ).toArray();

        console.log(`Found ${badDates.length} deliveries with object-type scheduledDate`);

        if (badDates.length > 0) {
            console.log('\n📋 Sample of bad delivery:');
            const sample = badDates[0];
            console.log(`ID: ${sample._id}`);
            console.log(`scheduledDate:`, sample.scheduledDate);
            console.log(`createdAt:`, sample.createdAt);
            console.log(`updatedAt:`, sample.updatedAt);
            console.log(`completedDate:`, sample.completedDate);
        }

        // Also check what good dates look like
        const goodDates = await db.collection('deliveries').findOne(
            { scheduledDate: { $type: 'date' } }
        );

        if (goodDates) {
            console.log('\n✅ Sample of good delivery:');
            console.log(`ID: ${goodDates._id}`);
            console.log(`scheduledDate:`, goodDates.scheduledDate, typeof goodDates.scheduledDate);
            console.log(`createdAt:`, goodDates.createdAt, typeof goodDates.createdAt);
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkDates();
