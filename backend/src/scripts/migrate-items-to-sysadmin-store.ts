/**
 * Script para migrar items sin storeId a la tienda del sys_admin
 * Uso: npx ts-node src/scripts/migrate-items-to-sysadmin-store.ts
 */

import mongoose from 'mongoose'
import { InventoryItemModel } from '../models/InventoryItem'
import Store from '../models/Store'
import { UserModel } from '../models/User'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not configured')
  process.exit(1)
}

async function migrateItemsToSysAdminStore() {
  try {
    console.log('🔄 Conectando a MongoDB...')
    await mongoose.connect(MONGODB_URI as string)
    console.log('✅ Conectado a MongoDB')

    // Find sys_admin user
    console.log('\n👤 Buscando sys_admin...')
    const sysAdmin = await UserModel.findOne({ role: 'sys_admin' })
    
    if (!sysAdmin) {
      console.error('❌ No sys_admin user found')
      process.exit(1)
    }

    console.log('✅ Encontrado sys_admin:', sysAdmin.email)
    console.log('  - storeId:', sysAdmin.storeId)

    // Find sys_admin's system store
    console.log('\n🏪 Buscando tienda del sistema del sys_admin...')
    let sysAdminStore = await Store.findOne({ storeAdminId: sysAdmin.email })
    
    if (!sysAdminStore) {
      console.log('⚠️ No system store found, creating one...')
      sysAdminStore = new Store({
        name: 'Tienda de Coleccionables - Sistema',
        description: 'Tienda personal del administrador del sistema',
        storeAdminId: sysAdmin.email
      })
      await sysAdminStore.save()
      console.log('✅ Created system store:', sysAdminStore._id)
    } else {
      console.log('✅ Found system store:', sysAdminStore._id)
    }

    // Count items without storeId
    console.log('\n📊 Buscando items sin storeId...')
    const itemsWithoutStore = await InventoryItemModel.find({
      $or: [
        { storeId: null },
        { storeId: undefined },
        { storeId: { $exists: false } }
      ]
    })

    console.log(`✅ Encontrados ${itemsWithoutStore.length} items sin storeId`)

    if (itemsWithoutStore.length === 0) {
      console.log('✅ No items to migrate')
      await mongoose.disconnect()
      process.exit(0)
    }

    // List items that will be migrated
    console.log('\n📋 Items a migrar:')
    itemsWithoutStore.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.carName || 'Sin nombre'} (ID: ${item._id})`)
    })

    // Migrate items to sys_admin's store
    console.log('\n🔄 Migrando items...')
    const result = await InventoryItemModel.updateMany(
      {
        $or: [
          { storeId: null },
          { storeId: undefined },
          { storeId: { $exists: false } }
        ]
      },
      {
        $set: { storeId: sysAdminStore._id.toString() }
      }
    )

    console.log(`✅ Migración completada`)
    console.log(`  - Documentos encontrados: ${result.matchedCount}`)
    console.log(`  - Documentos modificados: ${result.modifiedCount}`)

    // Verify migration
    console.log('\n✓ Verificando migración...')
    const stillWithoutStore = await InventoryItemModel.find({
      $or: [
        { storeId: null },
        { storeId: undefined },
        { storeId: { $exists: false } }
      ]
    })

    if (stillWithoutStore.length === 0) {
      console.log('✅ Migración verificada: todos los items tienen storeId')
    } else {
      console.warn(`⚠️ Aún hay ${stillWithoutStore.length} items sin storeId`)
    }

    // Show final counts
    console.log('\n📊 Resumen final:')
    const totalItems = await InventoryItemModel.countDocuments()
    const itemsBySysAdminStore = await InventoryItemModel.countDocuments({
      storeId: sysAdminStore._id.toString()
    })

    console.log(`  - Total de items: ${totalItems}`)
    console.log(`  - Items en tienda del sistema: ${itemsBySysAdminStore}`)

    console.log('\n🎉 Migración completada exitosamente')

    await mongoose.disconnect()
    console.log('👋 Desconectado de MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  migrateItemsToSysAdminStore()
}

export default migrateItemsToSysAdminStore
