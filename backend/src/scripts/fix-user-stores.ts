/**
 * Quick direct update - assign all users to appropriate stores
 */

import mongoose from 'mongoose'
import { UserModel } from '../models/User'

const fixAllUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    await mongoose.connect(mongoUri)

    console.log('🔧 Fixing user store assignments...\n')

    // Update sys_admin
    const sysAdminResult = await UserModel.updateMany(
      { role: 'sys_admin' },
      { $set: { storeId: 'sys-admin-store' } }
    )
    console.log(`✅ Updated ${sysAdminResult.modifiedCount} sys_admin users to "sys-admin-store"`)

    // Update non-sys_admin users without storeId
    const otherResult = await UserModel.updateMany(
      { role: { $ne: 'sys_admin' }, $or: [{ storeId: null }, { storeId: undefined }, { storeId: '' }] },
      { $set: { storeId: 'store-002' } }
    )
    console.log(`✅ Updated ${otherResult.modifiedCount} other users to default test store`)

    // Show final status
    console.log('\n📋 Final User Status:\n')
    const users = await UserModel.find({}).select('email role storeId')
    for (const user of users) {
      console.log(`   ${user.email} (${user.role}) → ${user.storeId || 'NO STORE'}`)
    }

    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

fixAllUsers()
