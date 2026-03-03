require('dotenv').config();
const mongoose = require('mongoose');

async function deepInspect() {
    try {
        const url = process.env.MONGODB_URI;
        if (!url) {
            console.error('❌ MONGODB_URI not found in .env');
            return;
        }

        console.log(`🔌 Connecting to: ${url.split('/')[2]} (Railway)\n`);
        await mongoose.connect(url);
        const db = mongoose.connection.db;

        console.log('🔍 DEEP DATABASE INSPECTION\n');

        // Find ANY document with Extended JSON dates
        const allDeliveries = await db.collection('deliveries').find({}).toArray();
        console.log(`Total deliveries in database: ${allDeliveries.length}\n`);

        if (allDeliveries.length === 0) {
            console.log('❌ No deliveries found!');
        } else {
            // Check each delivery's date fields
            let badCount = 0;
            for (let i = 0; i < allDeliveries.length && i < 10; i++) {
                const d = allDeliveries[i];
                const isDate = (v) => v instanceof Date || (typeof v === 'object' && v && v.toISOString);

                const isBad =
                    !isDate(d.scheduledDate) ||
                    !isDate(d.createdAt) ||
                    !isDate(d.updatedAt);

                if (isBad) {
                    badCount++;
                    console.log(`⚠️ Delivery ${i} (ID: ${d._id}) has issues:`);
                    console.log(`  - scheduledDate: ${typeof d.scheduledDate} | ${JSON.stringify(d.scheduledDate).substring(0, 70)}`);
                    console.log(`  - createdAt: ${typeof d.createdAt} | ${JSON.stringify(d.createdAt).substring(0, 70)}`);
                    console.log(`  - updatedAt: ${typeof d.updatedAt} | ${JSON.stringify(d.updatedAt).substring(0, 70)}`);
                } else {
                    console.log(`✅ Delivery ${i} (ID: ${d._id}) looks good`);
                }
            }

            console.log(`\n📊 Summary: ${badCount} deliveries with bad dates in first 10`);
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        await mongoose.disconnect();
    }
}

deepInspect();
