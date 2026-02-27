/**
 * Script para ver los items de la tienda de Hita
 */

import mongoose from 'mongoose'
import { InventoryItemModel } from '../models/InventoryItem'
import Store from '../models/Store'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not configured')
  process.exit(1)
}

async function checkHitaStore() {
  try {
    await mongoose.connect(MONGODB_URI as string)
    
    const hitaStore = await Store.findOne({ name: /Hita/ })
    if (!hitaStore) {
      console.log('❌ Tienda de Hita no encontrada')
      await mongoose.disconnect()
      process.exit(0)
    }
    
    console.log('🏪 Tienda de Hita Santos:')
    console.log('ID:', hitaStore._id)
    console.log('Nombre:', hitaStore.name)
    console.log('')
    
    const items = await InventoryItemModel.find({ storeId: hitaStore._id.toString() })
      .populate('carId', 'name year color')
      .lean()
    
    console.log('📋 Items en esta tienda:')
    items.forEach((item: any, idx: number) => {
      const carName = typeof item.carId === 'object' ? item.carId?.name : item.carName
      console.log(`${idx + 1}. ${carName || item.carName || 'SIN NOMBRE'}`)
      console.log(`   - ID: ${item._id}`)
      console.log(`   - Precio compra: $${item.purchasePrice}`)
      console.log(`   - Precio sugerido: $${item.suggestedPrice}`)
      console.log(`   - Cantidad: ${item.quantity}`)
      console.log(`   - Condición: ${item.condition}`)
      console.log('')
    })
    
    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

checkHitaStore()
