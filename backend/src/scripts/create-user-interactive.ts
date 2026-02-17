import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { UserModel } from '../models/User'
import bcrypt from 'bcryptjs'
import readline from 'readline'

dotenv.config({ path: path.join(__dirname, '../../.env') })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (prompt: string): Promise<string> => {
  return new Promise(resolve => {
    rl.question(prompt, resolve)
  })
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  sys_admin: 'System Admin - Full system access, manage users, database, everything. (You only)',
  admin: 'Admin - Manage inventory, sales, users, deliveries, settings',
  editor: 'Editor - Can create/edit inventory and sales only',
  analyst: 'Analyst - View-only access to reports and inventory'
}

async function main() {
  try {
    const mongoURI = process.env.MONGODB_URI
    if (!mongoURI) {
      console.error('❌ Error: MONGODB_URI no está configurado en .env')
      rl.close()
      process.exit(1)
    }

    console.log('🔌 Conectando a MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Conectado a MongoDB\n')

    console.log('📝 Create New User\n')

    // Ask for user details
    const email = await question('📧 Email: ')
    const name = await question('👤 Full Name: ')
    const password = await question('🔐 Password: ')

    // Show available roles
    console.log('\n📋 Available Roles:')
    let roleIndex = 1
    const roles = ['sys_admin', 'admin', 'editor', 'analyst']
    roles.forEach((role, index) => {
      console.log(`  ${index + 1}. ${ROLE_DESCRIPTIONS[role]}`)
    })

    const roleChoice = await question('\nSelect role (1-4): ')
    const roleIdx = parseInt(roleChoice) - 1

    if (roleIdx < 0 || roleIdx >= roles.length) {
      console.error('❌ Invalid role selection')
      rl.close()
      process.exit(1)
    }

    const role = roles[roleIdx] as 'sys_admin' | 'admin' | 'editor' | 'analyst'

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      console.error(`❌ User with email ${email} already exists`)
      rl.close()
      process.exit(1)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = new UserModel({
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      role,
      permissions: []
    })

    await user.save()

    console.log(`\n✅ User created successfully!`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   ID: ${user._id}`)

    rl.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    rl.close()
    process.exit(1)
  }
}
