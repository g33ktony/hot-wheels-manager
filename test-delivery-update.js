const mongoose = require('mongoose');
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels';

async function testMarkDelivery() {
    try {
        await mongoose.connect(url);
        const db = mongoose.connection.db;

        // Find the first delivery
        const delivery = await db.collection('deliveries').findOne({});
        if (!delivery) {
            console.log('❌ No deliveries found');
            return;
        }

        console.log(`Testing with delivery: ${delivery._id}`);
        console.log(`Status: ${delivery.status}`);
        console.log(`scheduledDate type: ${typeof delivery.scheduledDate}`);
        console.log(`createdAt type: ${typeof delivery.createdAt}`);

        // Try to update the delivery
        const result = await db.collection('deliveries').updateOne(
            { _id: delivery._id },
            {
                $set: {
                    status: 'completed',
                    completedDate: new Date(),
                    paymentStatus: 'pagado'
                }
            }
        );

        console.log(`\n✅ Update successful: ${result.modifiedCount} document(s) modified`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

testMarkDelivery();
