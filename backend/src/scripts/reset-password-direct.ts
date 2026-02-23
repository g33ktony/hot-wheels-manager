import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

async function resetPasswordDirect() {
  try {
    const uri = 'mongodb://mongo:dLyXlsBgWTbUMXixdaOqdeTvjBKOmNFZ@switchyard.proxy.rlwy.net:42764/railway?authSource=admin'
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(uri)
    console.log('✅ Connected')

    const db = mongoose.connection.db
    const usersCollection = db?.collection('users')
    
    if (!usersCollection) {
      console.log('❌ Cannot access users collection')
      process.exit(1)
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash('test', 10)
    
    console.log('🔐 Updating antonio password...')
    const result = await usersCollection.updateOne(
      { email: 'antonio@hotwheels.com' },
      { $set: { password: hashedPassword } }
    )

    if (result.modifiedCount === 1) {
      console.log('✅ Password updated successfully')
      console.log(`   New hash (first 30): ${hashedPassword.substring(0, 30)}`)

      // Verify by reading the updated document
      const user = await usersCollection.findOne({ email: 'antonio@hotwheels.com' })
      if (user) {
        const isValid = await bcrypt.compare('test', user.password)
        console.log(`\n✅ Password verification: ${isValid ? 'VALID' : 'INVALID'}`)
        
        if (isValid) {
          console.log(`\n🎉 Login credentials:`)
          console.log(`   Email: antonio@hotwheels.com`)
          console.log(`   Password: test`)
        }
      }
    } else {
      console.log('❌ No users updated')
    }

    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

resetPasswordDirect()
