require('dotenv').config();
const mongoose = require('mongoose');

async function inspectDelivery() {
    try {
        const url = process.env.MONGODB_URI;
        if (!url) {
            console.error('❌ MONGODB_URI not found in .env');
            return;
        }

        await mongoose.connect(url);
        const db = mongoose.connection.db;

        const deliveryId = '697d55e08d120b933c9cebcf';
        console.log(`🔍 Inspecting delivery: ${deliveryId}\n`);

        // Check if this is a valid ObjectId
        try {
            const objId = new mongoose.Types.ObjectId(deliveryId);
            const delivery = await db.collection('deliveries').findOne({ _id: objId });

            if (!delivery) {
                console.log('❌ Delivery not found!');
            } else {
                console.log('✅ Delivery found!\n');
                console.log(`ID: ${delivery._id}`);
                console.log(`Status: ${delivery.status}`);
                console.log(`scheduledDate: ${typeof delivery.scheduledDate} | ${JSON.stringify(delivery.scheduledDate)}`);
                console.log(`createdAt: ${typeof delivery.createdAt} | ${JSON.stringify(delivery.createdAt)}`);
                console.log(`updatedAt: ${typeof delivery.updatedAt} | ${JSON.stringify(delivery.updatedAt)}`);
                console.log(`completedDate: ${typeof delivery.completedDate} | ${JSON.stringify(delivery.completedDate)}`);

                if (delivery.customer) {
                    console.log(`\nCustomer object:`);
                    console.log(`  _id/type: ${typeof delivery.customer._id}`);
                    console.log(`  createdAt: ${typeof delivery.customer.createdAt} | ${JSON.stringify(delivery.customer.createdAt)}`);
                    console.log(`  updatedAt: ${typeof delivery.customer.updatedAt} | ${JSON.stringify(delivery.customer.updatedAt)}`);
                }

                console.log(`\nItems count: ${delivery.items?.length || 0}`);
            }
        } catch (e) {
            console.error('Invalid ObjectId:', deliveryId);
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

inspectDelivery();
