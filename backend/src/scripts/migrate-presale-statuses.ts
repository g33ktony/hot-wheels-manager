/**
 * Migration Script: Update PreSale Item Statuses
 * 
 * This script migrates old status values to new workflow-aligned statuses:
 * - 'active' → 'purchased' (default starting state)
 * - 'completed' → 'delivered' (final state)
 * - 'paused' → 'reserved' (temporarily on hold)
 * - 'cancelled' → 'cancelled' (no change)
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotwheels'

interface StatusMapping {
  old: string
  new: string
  reason: string
}

const statusMappings: StatusMapping[] = [
  {
    old: 'active',
    new: 'purchased',
    reason: 'Active items are in the initial purchased state'
  },
  {
    old: 'completed',
    new: 'delivered',
    reason: 'Completed items have been delivered to customers'
  },
  {
    old: 'paused',
    new: 'reserved',
    reason: 'Paused items are reserved/on hold'
  },
  {
    old: 'cancelled',
    new: 'cancelled',
    reason: 'No change needed'
  }
]

async function migrateStatuses() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const PreSaleItem = mongoose.connection.collection('presaleitems')

    console.log('\n📊 Migration Summary:')
    console.log('─'.repeat(60))

    let totalUpdated = 0

    for (const mapping of statusMappings) {
      const count = await PreSaleItem.countDocuments({ status: mapping.old })
      
      if (count > 0) {
        console.log(`\n🔄 Migrating "${mapping.old}" → "${mapping.new}"`)
        console.log(`   Reason: ${mapping.reason}`)
        console.log(`   Items found: ${count}`)

        const result = await PreSaleItem.updateMany(
          { status: mapping.old },
          { $set: { status: mapping.new } }
        )

        console.log(`   ✅ Updated: ${result.modifiedCount} items`)
        totalUpdated += result.modifiedCount
      } else {
        console.log(`\n⏭️  Skipping "${mapping.old}" - no items found`)
      }
    }

    console.log('\n─'.repeat(60))
    console.log(`\n🎉 Migration completed successfully!`)
    console.log(`   Total items updated: ${totalUpdated}`)

    // Show current status distribution
    console.log('\n📈 Current Status Distribution:')
    const statuses = await PreSaleItem.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray()

    statuses.forEach(status => {
      console.log(`   ${status._id}: ${status.count}`)
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Run migration
migrateStatuses()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
