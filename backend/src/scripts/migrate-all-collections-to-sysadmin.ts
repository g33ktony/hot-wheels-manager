/**
 * Script completo de migración: Asigna storeId a todos los documentos sin él
 * Colecciones afectadas:
 * - inventoryitems
 * - sales
 * - purchases
 * - customers
 * - suppliers
 * - deliveries
 */

import mongoose from 'mongoose'
import { UserModel } from '../models/User'
import Store from '../models/Store'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not configured')
  process.exit(1)
}

interface MigrationResult {
  collection: string
  found: number
  updated: number
  error?: string
}

async function migrateAllCollections() {
  try {
    console.log('🔄 Conectando a MongoDB...')
    await mongoose.connect(MONGODB_URI as string)
    console.log('✅ Conectado a MongoDB\n')

    // Find sys_admin
    const sysAdmin = await UserModel.findOne({ role: 'sys_admin' })
    if (!sysAdmin) {
      console.error('❌ No sys_admin user found')
      process.exit(1)
    }

    // Find or create sys_admin's store
    let sysAdminStore = await Store.findOne({ storeAdminId: sysAdmin.email })
    if (!sysAdminStore) {
      sysAdminStore = new Store({
        name: 'Tienda de Coleccionables - Sistema',
        description: 'Tienda personal del administrador del sistema',
        storeAdminId: sysAdmin.email
      })
      await sysAdminStore.save()
    }

    const sysAdminStoreId = sysAdminStore._id.toString()
    console.log(`👑 SYS_ADMIN: ${sysAdmin.email}`)
    console.log(`🏪 TIENDA DESTINO: ${sysAdminStore.name}`)
    console.log(`🆔 STORE ID: ${sysAdminStoreId}\n`)

    const db = mongoose.connection.db
    if (!db) {
      throw new Error('Database connection failed')
    }
    const results: MigrationResult[] = []

    // Collections to migrate
    const collections = [
      'inventoryitems',
      'sales',
      'purchases',
      'customers',
      'suppliers',
      'deliveries'
    ]

    console.log('🔄 Iniciando migración de colecciones...\n')

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName)
        
        // Count documents without storeId
        const filter = {
          $or: [
            { storeId: null },
            { storeId: undefined },
            { storeId: { $exists: false } }
          ]
        }
        
        const found = await collection.countDocuments(filter)
        
        if (found === 0) {
          console.log(`✅ ${collectionName}: TODOS TIENEN storeId (0 documentos a migrar)`)
          results.push({
            collection: collectionName,
            found: 0,
            updated: 0
          })
          continue
        }

        // Update documents
        const updateResult = await collection.updateMany(
          filter,
          { $set: { storeId: sysAdminStoreId } }
        )

        console.log(`✓ ${collectionName}`)
        console.log(`  - Encontrados: ${found}`)
        console.log(`  - Actualizados: ${updateResult.modifiedCount}`)
        
        results.push({
          collection: collectionName,
          found: found,
          updated: updateResult.modifiedCount
        })
      } catch (error: any) {
        console.log(`⚠️  ${collectionName}: ${error.message}`)
        results.push({
          collection: collectionName,
          found: 0,
          updated: 0,
          error: error.message
        })
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN DE MIGRACIÓN')
    console.log('='.repeat(60))

    let totalFound = 0
    let totalUpdated = 0

    console.table(results)

    for (const result of results) {
      totalFound += result.found
      totalUpdated += result.updated
    }

    console.log('\n📈 TOTALES:')
    console.log(`  - Total de documentos encontrados: ${totalFound}`)
    console.log(`  - Total de documentos actualizados: ${totalUpdated}`)
    console.log('='.repeat(60))

    if (totalUpdated > 0) {
      console.log('\n🎉 Migración completada exitosamente!')
    } else {
      console.log('\n✅ No había documentos para migrar - todo está sincronizado')
    }

    await mongoose.disconnect()
    console.log('👋 Desconectado de MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

if (require.main === module) {
  migrateAllCollections()
}

export default migrateAllCollections
