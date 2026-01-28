const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotweels';

async function checkUsers() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`  ${u.email} - ${u.username || 'no username'}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
