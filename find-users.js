require('dotenv').config();
const mongoose = require('mongoose');

async function findUsers() {
    try {
        const url = process.env.MONGODB_URI;
        await mongoose.connect(url);
        const db = mongoose.connection.db;

        const users = await db.collection('users').find({}).toArray();
        console.log(`Found ${users.length} users:\n`);

        users.forEach(u => {
            console.log(`- ${u.email}`);
            console.log(`  Role: ${u.role}`);
            console.log(`  Store: ${u.storeId}`);
            console.log(`  Status: ${u.status || 'unknown'}`);
            console.log('');
        });

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

findUsers();
