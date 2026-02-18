/**
 * Create test stores and users for multi-tenancy testing
 * Run with: npm run create-test-stores
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { UserModel } from '../models/User'
import { StoreSettingsModel } from '../models/StoreSettings'

const createTestStores = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    console.log('\n🏪 Creating test stores and users...\n')

    // Store 1: Already exists (default-store)
    let store1 = await StoreSettingsModel.findOne({ storeId: 'default-store' })
    if (!store1) {
      store1 = await StoreSettingsModel.create({
        storeId: 'default-store',
        storeName: 'Tienda 1 - Hot Wheels Central',
        location: 'Ciudad de México',
        phone: '+52 55 1234 5678',
        email: 'tienda1@hotwheels.local',
        description: 'Tienda de Hot Wheels principal',
        customMessages: {
          welcome: '¡Bienvenido a Hot Wheels Central!',
          closing: '¡Gracias por su compra!',
          invoice: 'Factura de Venta',
          delivery: 'Entrega',
          custom: []
        }
      })
      console.log('✅ Created Store 1: Tienda 1 - Hot Wheels Central')
    } else {
      console.log('⏭️ Store 1 already exists')
    }

    // Store 2: New store
    let store2 = await StoreSettingsModel.findOne({ storeId: 'store-002' })
    if (!store2) {
      store2 = await StoreSettingsModel.create({
        storeId: 'store-002',
        storeName: 'Tienda 2 - Hot Wheels Norte',
        location: 'Monterrey',
        phone: '+52 81 1234 5678',
        email: 'tienda2@hotwheels.local',
        description: 'Tienda de Hot Wheels sucursal norte',
        customMessages: {
          welcome: '¡Bienvenido a Hot Wheels Norte!',
          closing: '¡Gracias por su compra!',
          invoice: 'Factura de Venta',
          delivery: 'Entrega',
          custom: []
        }
      })
      console.log('✅ Created Store 2: Tienda 2 - Hot Wheels Norte')
    } else {
      console.log('⏭️ Store 2 already exists')
    }

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Admin for Store 1
    let adminUser1 = await UserModel.findOne({ email: 'admin1@hotwheels.local' })
    if (!adminUser1) {
      adminUser1 = await UserModel.create({
        name: 'Admin Tienda 1',
        email: 'admin1@hotwheels.local',
        password: hashedPassword,
        role: 'admin',
        storeId: 'default-store',
        active: true
      })
      console.log('✅ Created User: admin1@hotwheels.local (admin for Store 1)')
    } else {
      console.log('⏭️ admin1@hotwheels.local already exists')
    }

    // Admin for Store 2
    let adminUser2 = await UserModel.findOne({ email: 'admin2@hotwheels.local' })
    if (!adminUser2) {
      adminUser2 = await UserModel.create({
        name: 'Admin Tienda 2',
        email: 'admin2@hotwheels.local',
        password: hashedPassword,
        role: 'admin',
        storeId: 'store-002',
        active: true
      })
      console.log('✅ Created User: admin2@hotwheels.local (admin for Store 2)')
    } else {
      console.log('⏭️ admin2@hotwheels.local already exists')
    }

    // Editor for Store 1
    let editorUser1 = await UserModel.findOne({ email: 'editor1@hotwheels.local' })
    if (!editorUser1) {
      editorUser1 = await UserModel.create({
        name: 'Editor Tienda 1',
        email: 'editor1@hotwheels.local',
        password: hashedPassword,
        role: 'editor',
        storeId: 'default-store',
        active: true
      })
      console.log('✅ Created User: editor1@hotwheels.local (editor for Store 1)')
    } else {
      console.log('⏭️ editor1@hotwheels.local already exists')
    }

    // Editor for Store 2
    let editorUser2 = await UserModel.findOne({ email: 'editor2@hotwheels.local' })
    if (!editorUser2) {
      editorUser2 = await UserModel.create({
        name: 'Editor Tienda 2',
        email: 'editor2@hotwheels.local',
        password: hashedPassword,
        role: 'editor',
        storeId: 'store-002',
        active: true
      })
      console.log('✅ Created User: editor2@hotwheels.local (editor for Store 2)')
    } else {
      console.log('⏭️ editor2@hotwheels.local already exists')
    }

    // Analyst for Store 1
    let analystUser1 = await UserModel.findOne({ email: 'analyst1@hotwheels.local' })
    if (!analystUser1) {
      analystUser1 = await UserModel.create({
        name: 'Analyst Tienda 1',
        email: 'analyst1@hotwheels.local',
        password: hashedPassword,
        role: 'analyst',
        storeId: 'default-store',
        active: true
      })
      console.log('✅ Created User: analyst1@hotwheels.local (analyst for Store 1)')
    } else {
      console.log('⏭️ analyst1@hotwheels.local already exists')
    }

    console.log('\n' + '='.repeat(60))
    console.log('📋 TEST USERS CREATED')
    console.log('='.repeat(60))
    console.log('\n🏪 STORE 1 (default-store): Tienda 1 - Hot Wheels Central')
    console.log('   - admin1@hotwheels.local (admin)')
    console.log('   - editor1@hotwheels.local (editor)')
    console.log('   - analyst1@hotwheels.local (analyst)')
    console.log('\n🏪 STORE 2 (store-002): Tienda 2 - Hot Wheels Norte')
    console.log('   - admin2@hotwheels.local (admin)')
    console.log('   - editor2@hotwheels.local (editor)')
    console.log('\n👑 SYS_ADMIN: (can access all stores)')
    console.log('   - antonio@hotwheels.com (existing sys_admin)')
    console.log('\n🔐 Default password for all test users: password123')
    console.log('\n' + '='.repeat(60))
    console.log('✅ Test data created successfully!')
    console.log('='.repeat(60))

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating test stores:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

createTestStores()
