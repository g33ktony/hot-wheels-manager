/**
 * Promote antonio to sys_admin
 */

import mongoose from 'mongoose'
import { UserModel } from '../models/User'

const promoteToSysAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    await mongoose.connect(mongoUri)

    const result = await UserModel.updateOne(
      { email: 'antonio@hotwheels.com' },
      { 
        $set: { 
          role: 'sys_admin',
          storeId: 'sys-admin-store'
        } 
      }
    )

    console.log(`✅ Updated antonio@hotwheels.com:`)
    console.log(`   • Role changed to: sys_admin`)
    console.log(`   • Store: sys-admin-store\n`)

    const user = await UserModel.findOne({ email: 'antonio@hotwheels.com' })
    if (user) {
      console.log(`📋 Current status:`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Store: ${user.storeId}`)
    }

    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

promoteToSysAdmin()
