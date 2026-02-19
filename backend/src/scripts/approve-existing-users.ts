import { connect } from 'mongoose'
import { UserModel } from '../models/User'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Script para marcar todos los usuarios existentes como "approved"
 * Esto es necesario porque el nuevo sistema requiere aprobación de nuevos usuarios,
 * pero los usuarios existentes deberían estar automáticamente aprobados
 */

async function migrateUsers() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    
    console.log('🔄 Conectando a MongoDB...')
    await connect(mongoURI)
    console.log('✅ Conectado a MongoDB')

    // Contar usuarios sin status (antiguos)
    const oldUsers = await UserModel.countDocuments({ status: { $exists: false } })
    console.log(`📊 Usuarios sin status: ${oldUsers}`)

    // Marcar todos com status undefined o pending como approved
    const result = await UserModel.updateMany(
      { $or: [{ status: { $exists: false } }, { status: 'pending' }] },
      {
        $set: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: 'system-migration'
        }
      }
    )

    console.log(`✅ Usuarios actualizados: ${result.modifiedCount}`)

    // Verificar que todos tienen status
    const allUsers = await UserModel.find({}).select('email status approvedAt')
    console.log('\n📋 Usuarios después de migración:')
    allUsers.forEach(user => {
      console.log(`  - ${user.email}: status=${(user as any).status}, approvedAt=${(user as any).approvedAt}`)
    })

    console.log('\n✅ Migración completada exitosamente')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error en migración:', error)
    process.exit(1)
  }
}

migrateUsers()
