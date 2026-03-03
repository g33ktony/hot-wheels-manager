const mongoose = require('mongoose');
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels';

async function deepInspect() {
    try {
        await mongoose.connect(url);
        const db = mongoose.connection.db;

        console.log('🔍 DEEP DATABASE INSPECTION\n');

        // Find ANY document with Extended JSON dates
        const allDeliveries = await db.collection('deliveries').find({}).toArray();
        console.log(`Total deliveries in database: ${allDeliveries.length}\n`);

        if (allDeliveries.length === 0) {
            console.log('❌ Database is empty!');
        } else {
            // Check each delivery's date fields
            let badCount = 0;
            for (let i = 0; i < allDeliveries.length && i < 5; i++) {
                const d = allDeliveries[i];
                const isBad =
                    typeof d.scheduledDate === 'object' && d.scheduledDate !== null && !d.scheduledDate.toISOString ? true :
                        typeof d.createdAt === 'object' && d.createdAt !== null && !d.createdAt.toISOString ? true : false;

                if (isBad) {
                    badCount++;
                    console.log(`⚠️ Delivery ${i} (ID: ${d._id}) has issues:`);
                    console.log(`  - scheduledDate: ${typeof d.scheduledDate} = ${JSON.stringify(d.scheduledDate).substring(0, 60)}`);
                    console.log(`  - createdAt: ${typeof d.createdAt} = ${JSON.stringify(d.createdAt).substring(0, 60)}`);
                } else {
                    console.log(`✅ Delivery ${i} (ID: ${d._id}) looks good`);
                    console.log(`  - scheduledDate: ${d.scheduledDate instanceof Date ? 'Date' : typeof d.scheduledDate}`);
                    console.log(`  - createdAt: ${d.createdAt instanceof Date ? 'Date' : typeof d.createdAt}`);
                }
            }

            console.log(`\n📊 Summary: ${badCount} deliveries with bad dates in first 5`);
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

deepInspect();
