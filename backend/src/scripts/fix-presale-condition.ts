/**
 * One-time migration script to fix PreSale items with incorrect condition values
 * Sets all items without condition or with 'poor' to 'mint' (the proper default)
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import PreSaleItem from '../models/PreSaleItem'

dotenv.config()

async function fixPreSaleConditions() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI || '')
    console.log('✅ Connected to MongoDB')

    // Find all PreSale items with no condition or poor condition
    const itemsToUpdate = await PreSaleItem.find({
      $or: [
        { condition: { $exists: false } },
        { condition: null },
        { condition: 'poor' }
      ]
    })

    console.log(`📦 Found ${itemsToUpdate.length} items to update`)

    if (itemsToUpdate.length === 0) {
      console.log('✅ No items need updating')
      return
    }

    // Update all items to mint
    const result = await PreSaleItem.updateMany(
      {
        $or: [
          { condition: { $exists: false } },
          { condition: null },
          { condition: 'poor' }
        ]
      },
      {
        $set: { condition: 'mint' }
      }
    )

    console.log(`✅ Updated ${result.modifiedCount} items to 'mint' condition`)
    
    // Show sample of updated items
    const updatedItems = await PreSaleItem.find({ condition: 'mint' }).limit(5)
    console.log('\n📋 Sample of updated items:')
    updatedItems.forEach((item: any) => {
      console.log(`  - ${item.carModel || 'Unknown'} (${item.carId}): ${item.condition}`)
    })

  } catch (error) {
    console.error('❌ Error fixing conditions:', error)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 MongoDB connection closed')
  }
}

// Run the migration
fixPreSaleConditions()
