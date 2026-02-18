/**
 * Create MongoDB indexes for multi-tenancy (storeId-based queries)
 * This improves performance for store-filtered queries across all models
 * 
 * Run with: npm run create-indexes
 */

import mongoose from 'mongoose'
import { InventoryItemModel } from '../models/InventoryItem'
import { CustomerModel } from '../models/Customer'
import { SaleModel } from '../models/Sale'
import { PurchaseModel } from '../models/Purchase'
import { DeliveryModel } from '../models/Delivery'
import { SupplierModel } from '../models/Supplier'
import Lead from '../models/Lead'
import { StoreSettingsModel } from '../models/StoreSettings'

const createIndexes = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    const models = [
      {
        name: 'InventoryItem',
        model: InventoryItemModel,
        indexes: [
          { spec: { storeId: 1 } as any, options: { name: 'idx_inventoryItem_storeId' } },
          { spec: { storeId: 1, status: 1 } as any, options: { name: 'idx_inventoryItem_store_status' } },
          { spec: { storeId: 1, brand: 1 } as any, options: { name: 'idx_inventoryItem_store_brand' } },
          { spec: { storeId: 1, condition: 1 } as any, options: { name: 'idx_inventoryItem_store_condition' } }
        ]
      },
      {
        name: 'Customer',
        model: CustomerModel,
        indexes: [
          { spec: { storeId: 1 } as any, options: { name: 'idx_customer_storeId' } },
          { spec: { storeId: 1, email: 1 } as any, options: { name: 'idx_customer_store_email' } },
          { spec: { storeId: 1, name: 1 } as any, options: { name: 'idx_customer_store_name' } }
        ]
      },
      {
        name: 'Sale',
        model: SaleModel,
        indexes: [
          { spec: { storeId: 1 } as any, options: { name: 'idx_sale_storeId' } },
          { spec: { storeId: 1, saleDate: -1 } as any, options: { name: 'idx_sale_store_date' } },
          { spec: { storeId: 1, status: 1 } as any, options: { name: 'idx_sale_store_status' } }
        ]
      },
      {
        name: 'Purchase',
        model: PurchaseModel,
        indexes: [
          { spec: { storeId: 1 } as any, options: { name: 'idx_purchase_storeId' } },
          { spec: { storeId: 1, status: 1 } as any, options: { name: 'idx_purchase_store_status' } },
          { spec: { storeId: 1, purchaseDate: -1 } as any, options: { name: 'idx_purchase_store_date' } }
        ]
      },
      {
        name: 'Delivery',
        model: DeliveryModel,
        indexes: [
          { spec: { storeId: 1 } as any, options: { name: 'idx_delivery_storeId' } },
          { spec: { storeId: 1, status: 1 } as any, options: { name: 'idx_delivery_store_status' } },
          { spec: { storeId: 1, scheduledDate: -1 } as any, options: { name: 'idx_delivery_store_date' } },
          { spec: { storeId: 1, paymentStatus: 1 } as any, options: { name: 'idx_delivery_store_payment' } }
        ]
      },
      {
        name: 'Supplier',
        model: SupplierModel,
        indexes: [
          { spec: { storeId: 1 } as any, options: { name: 'idx_supplier_storeId' } },
          { spec: { storeId: 1, email: 1 } as any, options: { name: 'idx_supplier_store_email' } },
          { spec: { storeId: 1, name: 1 } as any, options: { name: 'idx_supplier_store_name' } }
        ]
      },
      {
        name: 'Lead',
        model: Lead,
        indexes: [
          { spec: { storeId: 1 } as any, options: { name: 'idx_lead_storeId' } },
          { spec: { storeId: 1, estado: 1 } as any, options: { name: 'idx_lead_store_estado' } },
          { spec: { storeId: 1, contactStatus: 1 } as any, options: { name: 'idx_lead_store_contact' } },
          { spec: { storeId: 1, registeredAt: -1 } as any, options: { name: 'idx_lead_store_date' } }
        ]
      },
      {
        name: 'StoreSettings',
        model: StoreSettingsModel,
        indexes: [
          { spec: { storeId: 1 } as any, options: { name: 'idx_storeSettings_storeId', unique: true } }
        ]
      }
    ]

    let totalIndexes = 0
    const results: any[] = []

    // Create indexes for each model
    for (const { name, model, indexes } of models) {
      console.log(`\n📊 Creating indexes for ${name}...`)
      
      for (const { spec, options } of indexes) {
        try {
          await model.collection.createIndex(spec, options)
          totalIndexes++
          results.push({
            model: name,
            index: options.name,
            spec: JSON.stringify(spec),
            status: '✅ Created'
          })
          console.log(`  ✅ ${options.name}`)
        } catch (error: any) {
          // Index might already exist, which is fine
          if (error.message.includes('already exists')) {
            results.push({
              model: name,
              index: options.name,
              spec: JSON.stringify(spec),
              status: '⏭️ Already exists'
            })
            console.log(`  ⏭️ ${options.name} (already exists)`)
          } else {
            throw error
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 INDEX CREATION SUMMARY')
    console.log('='.repeat(60))
    
    // Group by model
    const grouped = results.reduce((acc: any, result: any) => {
      if (!acc[result.model]) {
        acc[result.model] = []
      }
      acc[result.model].push(result)
      return acc
    }, {})

    for (const [model, indexes] of Object.entries(grouped)) {
      console.log(`\n${model}:`)
      for (const idx of indexes as any[]) {
        console.log(`  ${idx.status} ${idx.index}`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`✅ Total indexes processed: ${results.length}`)
    console.log(`✅ New indexes created: ${results.filter(r => r.status === '✅ Created').length}`)
    console.log(`⏭️ Already existing: ${results.filter(r => r.status === '⏭️ Already exists').length}`)
    console.log('='.repeat(60))

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating indexes:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

// Run the script
createIndexes()
