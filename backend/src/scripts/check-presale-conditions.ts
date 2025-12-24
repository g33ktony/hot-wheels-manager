/**
 * Script to check actual condition values in PreSale items
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import PreSaleItem from '../models/PreSaleItem'

dotenv.config()

async function checkConditions() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI || '')
    console.log('✅ Connected to MongoDB')

    // Get all PreSale items
    const allItems = await PreSaleItem.find({})
    console.log(`📦 Total PreSale items: ${allItems.length}`)

    // Group by condition
    const conditionCounts: Record<string, number> = {}
    
    allItems.forEach((item: any) => {
      const condition = item.condition || 'undefined'
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1
    })

    console.log('\n📊 Condition distribution:')
    Object.entries(conditionCounts).forEach(([condition, count]) => {
      console.log(`  ${condition}: ${count}`)
    })

    // Show all items with their conditions
    console.log('\n📋 All items:')
    allItems.forEach((item: any) => {
      console.log(`  - ${item.carModel || 'Unknown'} (${item.carId}): condition = "${item.condition}"`)
    })

  } catch (error) {
    console.error('❌ Error checking conditions:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 MongoDB connection closed')
  }
}

// Run the check
checkConditions()
