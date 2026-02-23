import { connect } from 'mongoose'
import { UserModel } from '../models/User'
import bcrypt from 'bcryptjs'

async function testPassword() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager')
  
  const user = await UserModel.findOne({ email: 'antonio@hotwheels.com' })
  if (!user) {
    console.log('❌ User not found')
    process.exit(1)
  }
  
  console.log('Usuario encontrado:', user.email)
  console.log('Password hash (primeros 30):', user.password.substring(0, 30))
  console.log('Status:', (user as any).status)
  
  // Test several passwords
  const testPasswords = ['test', 'Test', 'TEST', '12345', 'password123']
  
  for (const pwd of testPasswords) {
    const isValid = await bcrypt.compare(pwd, user.password)
    console.log(`  Password '${pwd}': ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`)
  }
  
  process.exit(0)
}
testPassword().catch(e => { console.error(e.message); process.exit(1) })
