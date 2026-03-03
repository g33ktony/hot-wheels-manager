const mongoose = require('mongoose');
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels';

async function checkDB() {
    try {
        await mongoose.connect(url);
        const db = mongoose.connection.db;

        console.log('🗄️ Database Check\n');

        // List all collections
        const collections = await db.listCollections().toArray();
        console.log(`Collections: ${collections.map(c => c.name).join(', ')}\n`);

        // Count documents in each collection
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`${col.name}: ${count} documents`);
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkDB();
