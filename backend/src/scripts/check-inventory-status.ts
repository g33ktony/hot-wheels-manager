/**
 * Script para ver el estado actual de los items por tienda
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

async function checkInventoryStatus() {
  try {
    console.log('🔄 Conectando a MongoDB...')
    await mongoose.connect(MONGODB_URI as string)
    console.log('✅ Conectado a MongoDB\n')

    // Get stats
    const totalItems = await InventoryItemModel.countDocuments()
    
    const itemsWithoutStore = await InventoryItemModel.countDocuments({
      $or: [
        { storeId: null },
        { storeId: undefined },
        { storeId: { $exists: false } }
      ]
    })

    console.log('📊 ESTADÍSTICAS GENERALES:')
    console.log(`  - Total de items: ${totalItems}`)
    console.log(`  - Items sin storeId: ${itemsWithoutStore}`)
    console.log(`  - Items con storeId: ${totalItems - itemsWithoutStore}\n`)

    // Get breakdown by store
    console.log('🏪 DESGLOSE POR TIENDA:')
    
    const stores = await Store.find({})
    
    for (const store of stores) {
      const itemsInStore = await InventoryItemModel.countDocuments({
        storeId: store._id.toString()
      })
      
      const storeType = store.storeAdminId ? '(sys_admin store)' : '(regular store)'
      console.log(`  - ${store.name} ${storeType}`)
      console.log(`    ID: ${store._id}`)
      console.log(`    Items: ${itemsInStore}`)
      console.log('')
    }

    // Get items sample from sys_admin store
    const sysAdmin = await UserModel.findOne({ role: 'sys_admin' })
    if (sysAdmin) {
      const sysAdminStore = await Store.findOne({ storeAdminId: sysAdmin.email })
      if (sysAdminStore) {
        console.log('📋 MUESTRA DE ITEMS EN TIENDA DEL SISTEMA:')
        const sampleItems = await InventoryItemModel.find({
          storeId: sysAdminStore._id.toString()
        }).limit(5).select('carName condition purchasePrice storeId')
        
        sampleItems.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.carName} (${item.condition}) - $${item.purchasePrice}`)
        })
      }
    }

    await mongoose.disconnect()
    console.log('\n👋 Desconectado de MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

if (require.main === module) {
  checkInventoryStatus()
}

export default checkInventoryStatus
