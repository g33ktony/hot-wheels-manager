import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { UserModel } from '../models/User'

// Load environment variables
dotenv.config()

const updateAdminUser = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in environment variables')
      process.exit(1)
    }

    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB')

    // Buscar el usuario admin existente
    const adminUser = await UserModel.findOne({ role: 'admin' })
    
    if (!adminUser) {
      console.log('❌ No admin user found')
      console.log('ℹ️  Please create an admin user first')
      await mongoose.connection.close()
      process.exit(1)
    }

    console.log('\n📋 Current admin user:')
    console.log(`   Email: ${adminUser.email}`)
    console.log(`   Name: ${adminUser.name}`)
    console.log(`   Role: ${adminUser.role}`)
    console.log(`   Status: ${adminUser.status || 'NOT SET'}`)

    // Actualizar el usuario admin
    adminUser.status = 'active'
    adminUser.role = 'admin'
    adminUser.subscriptionStartDate = new Date()
    // Suscripción de 10 años para el admin (prácticamente ilimitado)
    adminUser.subscriptionEndDate = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
    adminUser.subscriptionType = 'annual'
    
    await adminUser.save()

    console.log('\n✅ Admin user updated successfully:')
    console.log(`   Status: ${adminUser.status}`)
    console.log(`   Subscription End: ${adminUser.subscriptionEndDate?.toLocaleDateString()}`)
    console.log(`   User ID: ${adminUser._id}`)

    console.log('\n💾 Save this User ID for data migration!')
    console.log(`   export ADMIN_USER_ID="${adminUser._id}"`)

    await mongoose.connection.close()
    console.log('\n🔌 MongoDB connection closed')
    console.log('✨ Update completed successfully!')
    process.exit(0)

  } catch (error) {
    console.error('❌ Error updating admin user:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run the update
updateAdminUser()
