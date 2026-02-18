/**
 * Initialize the database with a default first store and admin user
 * This is required before running the migration script
 * 
 * Run with: npm run init-db
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { UserModel } from '../models/User'
import { StoreSettingsModel } from '../models/StoreSettings'

const initializeDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Check if users already exist
    const userCount = await UserModel.countDocuments({})
    if (userCount > 0) {
      console.log('⏭️ Users already exist in database. Skipping initialization.')
      await mongoose.disconnect()
      process.exit(0)
    }

    console.log('\n📦 Initializing database with default store and admin user...\n')

    // Create default store settings
    const defaultStoreId = 'store-001'
    
    const storeSettings = await StoreSettingsModel.findOne({ storeId: defaultStoreId })
    if (!storeSettings) {
      await StoreSettingsModel.create({
        storeId: defaultStoreId,
        storeName: 'Mi Tienda Principal',
        location: 'Ubicación Principal',
        phone: '',
        email: '',
        description: 'Tienda principal de Hot Wheels',
        logo: null,
        theme: 'default',
        customMessages: []
      })
      console.log(`✅ Created default store settings for: ${defaultStoreId}`)
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const adminUser = await UserModel.create({
      name: 'Administrador Principal',
      email: 'admin@hotwheels.local',
      password: hashedPassword,
      role: 'sys_admin',
      storeId: defaultStoreId,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log(`✅ Created sys_admin user:`)
    console.log(`   Email: admin@hotwheels.local`)
    console.log(`   Password: admin123`)
    console.log(`   Store ID: ${defaultStoreId}`)
    console.log(`   Role: sys_admin`)

    console.log('\n📋 Next steps:')
    console.log('1. Run: npm run migrate-store-data')
    console.log('2. Run: npm run create-indexes')
    console.log('3. Create additional stores and users as needed')
    console.log('4. Login with the admin user credentials above')

    await mongoose.disconnect()
    console.log('\n✅ Database initialization complete')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

initializeDatabase()
