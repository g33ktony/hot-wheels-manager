/**
 * Script para crear el primer usuario administrador
 * 
 * Uso:
 * node dist/scripts/createAdmin.js <email> <password> <name>
 * 
 * Ejemplo:
 * node dist/scripts/createAdmin.js admin@hotwheels.com mySecurePassword123 "Antonio Admin"
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { UserModel } from '../models/User'
import Store from '../models/Store'

dotenv.config()

const createAdmin = async () => {
  try {
    // Obtener argumentos de línea de comandos
    const email = process.argv[2]
    const password = process.argv[3]
    const name = process.argv[4] || 'Admin'

    if (!email || !password) {
      console.error('❌ Error: Email y contraseña son requeridos')
      console.log('Uso: node dist/scripts/createAdmin.js <email> <password> <name>')
      console.log('Ejemplo: node dist/scripts/createAdmin.js admin@hotwheels.com myPassword123 "Antonio Admin"')
      process.exit(1)
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error('❌ Error: Email inválido')
      process.exit(1)
    }

    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
      console.error('❌ Error: La contraseña debe tener al menos 6 caracteres')
      process.exit(1)
    }

    // Conectar a MongoDB
    const mongoURI = process.env.MONGODB_URI
    if (!mongoURI) {
      console.error('❌ Error: MONGODB_URI no está configurado en .env')
      process.exit(1)
    }

    console.log('🔌 Conectando a MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Conectado a MongoDB')

    // Verificar si ya existe un usuario con ese email
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      console.error(`❌ Error: Ya existe un usuario con el email ${email}`)
      process.exit(1)
    }

    // Hashear contraseña
    console.log('🔐 Hasheando contraseña...')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear tienda para el admin
    console.log('🏪 Creando tienda para el administrador...')
    const storeName = `Tienda de coleccionables ${name}`
    const newStore = new Store({
      name: storeName,
      description: `Tienda administrada por ${name}`,
      storeAdminId: undefined // Se establecerá después de crear el usuario
    })
    await newStore.save()
    console.log('✅ Tienda creada:', storeName)

    // Crear usuario
    console.log('👤 Creando usuario administrador...')
    const user = await UserModel.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'admin',
      storeId: newStore._id.toString(),
      status: 'approved'
    })

    // Actualizar la tienda con el storeAdminId
    await Store.updateOne(
      { _id: newStore._id },
      { storeAdminId: (user._id as any).toString() }
    )

    console.log('✅ Usuario administrador creado exitosamente')
    console.log('📧 Email:', user.email)
    console.log('👤 Nombre:', user.name)
    console.log('🔑 Role:', user.role)
    console.log('🏪 Tienda:', newStore.name)
    console.log('🆔 Tienda ID:', newStore._id)
    console.log('\n🎉 Ahora puedes iniciar sesión con estas credenciales')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error)
    process.exit(1)
  }
}

createAdmin()
