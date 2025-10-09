import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { UserModel } from '../models/User'

// Load environment variables
dotenv.config()

const checkAdminUser = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in environment variables')
      process.exit(1)
    }

    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB\n')

    // Buscar TODOS los usuarios
    const allUsers = await UserModel.find({})
    
    console.log(`📊 Total users in database: ${allUsers.length}\n`)

    allUsers.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`)
      console.log(`   ID: ${user._id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Status: ${user.status || '⚠️  NOT SET'}`)
      console.log(`   Business Name: ${user.businessName || 'N/A'}`)
      console.log(`   Subscription End: ${user.subscriptionEndDate ? user.subscriptionEndDate.toLocaleDateString() : 'N/A'}`)
      console.log(`   Last Login: ${user.lastLogin ? user.lastLogin.toLocaleString() : 'Never'}`)
      console.log(`   Created At: ${user.createdAt?.toLocaleString() || 'N/A'}`)
      console.log('')
    })

    // Contar por status
    const statusCounts = allUsers.reduce((acc: any, user) => {
      const status = user.status || 'undefined'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    console.log('📈 Status Summary:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`)
    })

    await mongoose.connection.close()
    console.log('\n✅ Connection closed')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkAdminUser()
