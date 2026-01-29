import mongoose from 'mongoose'
import { SaleModel } from '../models/Sale'
import { InventoryItemModel } from '../models/InventoryItem'
import dotenv from 'dotenv'

dotenv.config()

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels'

async function migratePhotosToSales() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB')

    // Find all sales
    const sales = await SaleModel.find({})
    console.log(`📊 Found ${sales.length} sales to process`)

    let updatedCount = 0
    let photosAddedCount = 0

    // Process each sale
    for (const sale of sales) {
      let saleUpdated = false

      // Process each item in the sale
      for (let i = 0; i < sale.items.length; i++) {
        const item = sale.items[i]

        // If item doesn't have photos and has an inventoryItemId
        if ((!item.photos || item.photos.length === 0) && item.inventoryItemId) {
          try {
            const inventoryItem = await InventoryItemModel.findById(item.inventoryItemId)

            if (inventoryItem && inventoryItem.photos && inventoryItem.photos.length > 0) {
              console.log(
                `📸 Adding ${inventoryItem.photos.length} photos to ${item.carName} in sale ${sale._id}`
              )
              sale.items[i].photos = inventoryItem.photos
              saleUpdated = true
              photosAddedCount += inventoryItem.photos.length
            }
          } catch (error) {
            console.error(`⚠️  Error fetching inventory item ${item.inventoryItemId}:`, error)
          }
        }
      }

      // Save the sale if it was updated
      if (saleUpdated) {
        await sale.save()
        updatedCount++
        console.log(`✅ Sale ${sale._id} updated`)
      }
    }

    console.log(`\n📊 Migration Results:`)
    console.log(`   Sales updated: ${updatedCount}`)
    console.log(`   Photos added: ${photosAddedCount}`)

    // Verify the migration
    const salesWithPhotos = await SaleModel.find({
      'items.photos': { $exists: true, $ne: [] }
    })
    console.log(`   Sales with photos now: ${salesWithPhotos.length}`)

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Error during migration:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the migration
migratePhotosToSales()
