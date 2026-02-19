/**
 * Assign sys_admin user to their store
 * Quick fix to set storeId for sys_admin users
 */

import mongoose from 'mongoose'
import { UserModel } from '../models/User'

const assignSysAdminStore = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    console.log('👑 Assigning sys_admin users to their store...\n')

    const result = await UserModel.updateMany(
      { role: 'sys_admin', storeId: { $in: [null, undefined, ''] } },
      { $set: { storeId: 'sys-admin-store' } }
    )

    console.log(`✅ Updated ${result.modifiedCount} sys_admin users`)
    console.log('   All sys_admin users now assigned to: sys-admin-store\n')

    // Show updated sys_admin users
    const sysAdminUsers = await UserModel.find({ role: 'sys_admin' })
    console.log('👑 SYS ADMIN USERS:')
    for (const user of sysAdminUsers) {
      console.log(`   • ${user.email} → ${user.storeId}`)
    }

    await mongoose.disconnect()
    console.log('\n✅ Done')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

assignSysAdminStore()
