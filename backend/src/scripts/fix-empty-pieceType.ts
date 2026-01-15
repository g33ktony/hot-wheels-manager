/**
 * Script para corregir items de inventario con pieceType vacío o inválido
 * 
 * Busca todos los InventoryItems con pieceType vacío, inválido, o undefined
 * y los actualiza con 'basic' como valor por defecto
 * 
 * Uso: npm run fix-pieceType
 */

import mongoose from 'mongoose'
import { InventoryItemModel } from '../models/InventoryItem'
import { PendingItemModel } from '../models/PendingItem'
import * as dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels'
const VALID_INVENTORY_PIECE_TYPES = ['basic', 'premium', 'rlc', 'silver_series', 'elite_64']
const VALID_PENDING_PIECE_TYPES = ['basic', 'premium', 'rlc']

async function fixInventoryItems() {
  console.log('🔍 Buscando InventoryItems con pieceType vacío o inválido...')
  
  try {
    // Buscar items con pieceType vacío
    const emptyPieceTypeItems = await InventoryItemModel.find({
      $or: [
        { pieceType: '' },
        { pieceType: { $nin: VALID_INVENTORY_PIECE_TYPES, $ne: null } }
      ]
    })

    if (emptyPieceTypeItems.length === 0) {
      console.log('✅ No hay InventoryItems con pieceType inválido')
    } else {
      console.log(`⚠️  Encontrados ${emptyPieceTypeItems.length} InventoryItems con pieceType inválido`)
      
      for (const item of emptyPieceTypeItems) {
        const oldValue = item.pieceType
        item.pieceType = null // Usar null en lugar de 'basic' para respetar el nuevo modelo
        await item.save()
        console.log(`  ✏️  Item ${item._id}: "${oldValue}" → null`)
      }
      
      console.log(`✅ Actualizados ${emptyPieceTypeItems.length} InventoryItems`)
    }
  } catch (error) {
    console.error('❌ Error al corregir InventoryItems:', error)
  }
}

async function fixPendingItems() {
  console.log('\n🔍 Buscando PendingItems con pieceType vacío o inválido...')
  
  try {
    // Buscar items con pieceType vacío
    const emptyPieceTypeItems = await PendingItemModel.find({
      $or: [
        { pieceType: '' },
        { pieceType: { $nin: VALID_PENDING_PIECE_TYPES, $ne: null } }
      ]
    })

    if (emptyPieceTypeItems.length === 0) {
      console.log('✅ No hay PendingItems con pieceType inválido')
    } else {
      console.log(`⚠️  Encontrados ${emptyPieceTypeItems.length} PendingItems con pieceType inválido`)
      
      for (const item of emptyPieceTypeItems) {
        const oldValue = item.pieceType
        item.pieceType = null
        await item.save()
        console.log(`  ✏️  Item ${item._id}: "${oldValue}" → null`)
      }
      
      console.log(`✅ Actualizados ${emptyPieceTypeItems.length} PendingItems`)
    }
  } catch (error) {
    console.error('❌ Error al corregir PendingItems:', error)
  }
}

async function main() {
  try {
    console.log('📦 Conectando a MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado a MongoDB')

    await fixInventoryItems()
    await fixPendingItems()

    console.log('\n🎉 Script completado')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
  }
}

main()
