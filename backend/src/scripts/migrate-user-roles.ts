import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { UserModel } from '../models/User'

dotenv.config({ path: path.join(__dirname, '../../.env') })

async function migrateUsers() {
  try {
    const mongoURI = process.env.MONGODB_URI
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not configured')
      process.exit(1)
    }

    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected\n')

    // Get all users
    const users = await UserModel.find({})

    if (users.length === 0) {
      console.log('⚠️  No users found in database')
      process.exit(0)
    }

    console.log(`📋 Found ${users.length} users to check:\n`)

    for (const user of users) {
      console.log(`📧 ${user.email}`)
      console.log(`   Current role: ${user.role}`)
      
      // If role is 'admin' and doesn't have a type, keep it as 'admin'
      if (user.role === 'admin') {
        console.log(`   ✅ Role is valid - keeping as 'admin'`)
      } else if (!['sys_admin', 'admin', 'editor', 'analyst'].includes(user.role)) {
        // If role is invalid, set to 'editor' as default
        await UserModel.updateOne(
          { _id: user._id },
          { $set: { role: 'editor' } }
        )
        console.log(`   ⚠️  Invalid role detected - updated to 'editor'`)
      } else {
        console.log(`   ✅ Role is valid`)
      }
      console.log()
    }

    console.log('✅ Migration complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

migrateUsers()
