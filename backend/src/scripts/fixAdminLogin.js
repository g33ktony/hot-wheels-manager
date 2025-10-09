// Script simple para arreglar el login del admin
// Ejecutar con: node backend/src/scripts/fixAdminLogin.js

const mongoose = require('mongoose');
require('dotenv').config();

const fixAdminLogin = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in .env file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Buscar usuario con role admin
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('❌ No admin user found');
      console.log('Creating a new admin user...\n');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = new User({
        email: 'admin@hotwheels.com',
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin',
        status: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
        subscriptionType: 'annual'
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created successfully!');
      console.log('   Email: admin@hotwheels.com');
      console.log('   Password: admin123');
      console.log('   User ID:', newAdmin._id.toString());
    } else {
      console.log('📋 Found admin user:');
      console.log('   Email:', adminUser.email);
      console.log('   Name:', adminUser.name);
      console.log('   Current Status:', adminUser.status || '⚠️  NOT SET');
      console.log('   User ID:', adminUser._id.toString());
      
      // Actualizar status a active si no está
      if (adminUser.status !== 'active') {
        console.log('\n🔧 Fixing admin user status...');
        adminUser.status = 'active';
        adminUser.subscriptionStartDate = new Date();
        adminUser.subscriptionEndDate = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
        adminUser.subscriptionType = 'annual';
        await adminUser.save();
        console.log('✅ Admin user fixed! Status is now: active');
      } else {
        console.log('\n✅ Admin user status is already active. No changes needed.');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Done! You can now login with your admin credentials.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixAdminLogin();
