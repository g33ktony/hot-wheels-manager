/**
 * Reset a user password for testing
 * Usage: npx tsx src/scripts/reset-user-password.ts
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'
import { UserModel } from '../models/User'

dotenv.config({ path: path.join(__dirname, '../../.env') })

async function resetPassword() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    const email = 'antonio@hotwheels.com'
    const newPassword = 'test'

    console.log(`\n🔐 Resetting password for: ${email}`)
    console.log(`   New password: ${newPassword}`)

    // Find user
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() })
    
    if (!user) {
      console.log(`❌ Usuario no encontrado: ${email}`)
      
      // Show all users
      const allUsers = await UserModel.find({}).select('email')
      console.log(`\n📋 Usuarios en la base de datos:`)
      allUsers.forEach(u => console.log(`   - ${u.email}`))
      
      process.exit(1)
    }

    console.log(`✅ User found: ${user.email}`)
    console.log(`   Old password hash (first 30): ${user.password.substring(0, 30)}`)

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Update password
    user.password = hashedPassword
    await user.save()

    console.log(`✅ Password updated successfully`)
    console.log(`   New password hash (first 30): ${hashedPassword.substring(0, 30)}`)

    // Verify it works
    const isValid = await bcrypt.compare(newPassword, user.password)
    console.log(`\n✅ Password verification: ${isValid ? 'VALID' : 'INVALID'}`)

    if (isValid) {
      console.log(`\n🎉 You can now login with:`)
      console.log(`   Email: ${email}`)
      console.log(`   Password: ${newPassword}`)
    }

    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

resetPassword()
