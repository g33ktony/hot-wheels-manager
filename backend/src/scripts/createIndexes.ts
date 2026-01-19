/**
 * Database Index Creation Script
 * Creates essential indexes for improved query performance
 */

import mongoose from 'mongoose'
import { InventoryItemModel } from '../models/InventoryItem'
import { SaleModel } from '../models/Sale'
import { DeliveryModel } from '../models/Delivery'
import { CustomerModel } from '../models/Customer'
import Purchase from '../models/Purchase'
import PreSaleItem from '../models/PreSaleItem'
import { AuditLogModel } from '../models/AuditLog'

async function createIndexes() {
  console.log('📊 Creating database indexes...')

  try {
    // Inventory indexes
    await InventoryItemModel.collection.createIndex({ carId: 1 })
    await InventoryItemModel.collection.createIndex({ carId: 1, condition: 1 })
    await InventoryItemModel.collection.createIndex({ brand: 1 })
    await InventoryItemModel.collection.createIndex({ brand: 1, pieceType: 1 })
    await InventoryItemModel.collection.createIndex({ location: 1 })
    await InventoryItemModel.collection.createIndex({ dateAdded: -1 })
    await InventoryItemModel.collection.createIndex({ lastUpdated: -1 })
    console.log('✅ Inventory indexes created')

    // Sale indexes
    await SaleModel.collection.createIndex({ saleDate: -1 })
    await SaleModel.collection.createIndex({ customerId: 1 })
    await SaleModel.collection.createIndex({ status: 1 })
    await SaleModel.collection.createIndex({ status: 1, saleDate: -1 })
    await SaleModel.collection.createIndex({
      'items.inventoryItemId': 1
    })
    console.log('✅ Sale indexes created')

    // Delivery indexes
    await DeliveryModel.collection.createIndex({ customerId: 1 })
    await DeliveryModel.collection.createIndex({ status: 1 })
    await DeliveryModel.collection.createIndex({ status: 1, scheduledDate: -1 })
    await DeliveryModel.collection.createIndex({ scheduledDate: -1 })
    await DeliveryModel.collection.createIndex({
      'items.inventoryItemId': 1
    })
    await DeliveryModel.collection.createIndex({
      'paymentHistory.date': 1
    })
    console.log('✅ Delivery indexes created')

    // Customer indexes
    await CustomerModel.collection.createIndex({ name: 1 })
    await CustomerModel.collection.createIndex({ email: 1 })
    await CustomerModel.collection.createIndex({ phone: 1 })
    await CustomerModel.collection.createIndex({ createdAt: -1 })
    console.log('✅ Customer indexes created')

    // Purchase indexes
    await Purchase.collection.createIndex({ supplierId: 1 })
    await Purchase.collection.createIndex({ purchaseDate: -1 })
    await Purchase.collection.createIndex({ status: 1 })
    await Purchase.collection.createIndex({ 'items.carId': 1 })
    console.log('✅ Purchase indexes created')

    // PreSaleItem indexes
    await PreSaleItem.collection.createIndex({ carId: 1 })
    await PreSaleItem.collection.createIndex({ status: 1 })
    await PreSaleItem.collection.createIndex({ startDate: -1 })
    await PreSaleItem.collection.createIndex({ 'units.deliveryId': 1 })
    console.log('✅ PreSaleItem indexes created')

    // Audit log indexes (already created in model, but ensure they exist)
    await AuditLogModel.collection.createIndex({ userId: 1, timestamp: -1 })
    await AuditLogModel.collection.createIndex({
      entity: 1,
      entityId: 1,
      timestamp: -1
    })
    await AuditLogModel.collection.createIndex({ action: 1, timestamp: -1 })
    console.log('✅ Audit log indexes created')

    console.log('✅ All indexes created successfully!')
    return true
  } catch (error) {
    console.error('❌ Error creating indexes:', error)
    throw error
  }
}

// Export for use in initialization scripts
export default createIndexes

// Run if called directly
if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels')
    .then(() => {
      console.log('✅ Connected to MongoDB')
      return createIndexes()
    })
    .then(() => {
      console.log('✅ Index creation completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}
