/**
 * Reorganize data for sys_admin store
 * - Change "default-store" to "sys-admin-store"
 * - Assign sys_admin user to their own store
 * - This becomes the sys_admin's primary store while maintaining read access to others
 */

import mongoose from 'mongoose'
import { UserModel } from '../models/User'
import { InventoryItemModel } from '../models/InventoryItem'
import { CustomerModel } from '../models/Customer'
import { SupplierModel } from '../models/Supplier'
import { SaleModel } from '../models/Sale'
import { PurchaseModel } from '../models/Purchase'
import { DeliveryModel } from '../models/Delivery'
import Lead from '../models/Lead'
import { StoreSettingsModel } from '../models/StoreSettings'

const reorganizeSysAdminStore = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    console.log('🔄 Reorganizing sys_admin store...\n')

    const oldStoreId = 'default-store'
    const newStoreId = 'sys-admin-store'

    // Step 1: Update store settings
    console.log('📦 Updating store settings...')
    await StoreSettingsModel.updateOne(
      { storeId: oldStoreId },
      {
        $set: {
          storeId: newStoreId,
          storeName: 'Tienda SYS ADMIN - Hot Wheels Admin Central'
        }
      }
    )
    console.log(`   ✅ Store settings updated: "${oldStoreId}" → "${newStoreId}"`)

    // Step 2: Update all inventory items
    console.log('📦 Migrating InventoryItem...')
    const inventoryResult = await InventoryItemModel.updateMany(
      { storeId: oldStoreId },
      { $set: { storeId: newStoreId } }
    )
    console.log(`   ✅ ${inventoryResult.modifiedCount} inventory items updated`)

    // Step 3: Update all customers
    console.log('👥 Migrating Customer...')
    const customerResult = await CustomerModel.updateMany(
      { storeId: oldStoreId },
      { $set: { storeId: newStoreId } }
    )
    console.log(`   ✅ ${customerResult.modifiedCount} customers updated`)

    // Step 4: Update all suppliers
    console.log('🏪 Migrating Supplier...')
    const supplierResult = await SupplierModel.updateMany(
      { storeId: oldStoreId },
      { $set: { storeId: newStoreId } }
    )
    console.log(`   ✅ ${supplierResult.modifiedCount} suppliers updated`)

    // Step 5: Update all sales
    console.log('💰 Migrating Sale...')
    const saleResult = await SaleModel.updateMany(
      { storeId: oldStoreId },
      { $set: { storeId: newStoreId } }
    )
    console.log(`   ✅ ${saleResult.modifiedCount} sales updated`)

    // Step 6: Update all purchases
    console.log('📥 Migrating Purchase...')
    const purchaseResult = await PurchaseModel.updateMany(
      { storeId: oldStoreId },
      { $set: { storeId: newStoreId } }
    )
    console.log(`   ✅ ${purchaseResult.modifiedCount} purchases updated`)

    // Step 7: Update all deliveries
    console.log('🚚 Migrating Delivery...')
    const deliveryResult = await DeliveryModel.updateMany(
      { storeId: oldStoreId },
      { $set: { storeId: newStoreId } }
    )
    console.log(`   ✅ ${deliveryResult.modifiedCount} deliveries updated`)

    // Step 8: Update all leads
    console.log('📞 Migrating Lead...')
    const leadResult = await Lead.updateMany(
      { storeId: oldStoreId },
      { $set: { storeId: newStoreId } }
    )
    console.log(`   ✅ ${leadResult.modifiedCount} leads updated\n`)

    // Step 9: Update sys_admin user
    console.log('👑 Updating sys_admin user...')
    const sysAdminUser = await UserModel.findOne({ role: 'sys_admin' })
    if (sysAdminUser) {
      await UserModel.updateOne(
        { _id: sysAdminUser._id },
        { $set: { storeId: newStoreId } }
      )
      console.log(`   ✅ User "${sysAdminUser.email}" assigned to "${newStoreId}"`)
    } else {
      console.log('   ⚠️ No sys_admin user found')
    }

    // Step 10: Update other users with old store
    console.log('👥 Updating other users with old store...')
    const otherUsersResult = await UserModel.updateMany(
      { storeId: oldStoreId, role: { $ne: 'sys_admin' } },
      { $set: { storeId: newStoreId } }
    )
    console.log(`   ✅ ${otherUsersResult.modifiedCount} other users updated`)

    // Verification
    console.log('\n' + '='.repeat(60))
    console.log('📋 Verification Results')
    console.log('='.repeat(60))

    const counts = {
      inventory: await InventoryItemModel.countDocuments({ storeId: newStoreId }),
      customers: await CustomerModel.countDocuments({ storeId: newStoreId }),
      suppliers: await SupplierModel.countDocuments({ storeId: newStoreId }),
      sales: await SaleModel.countDocuments({ storeId: newStoreId }),
      purchases: await PurchaseModel.countDocuments({ storeId: newStoreId }),
      deliveries: await DeliveryModel.countDocuments({ storeId: newStoreId }),
      leads: await Lead.countDocuments({ storeId: newStoreId })
    }

    console.log(`\n👑 SYS ADMIN STORE ("${newStoreId}"):\n`)
    console.log(`   📦 Inventory items: ${counts.inventory}`)
    console.log(`   👥 Customers: ${counts.customers}`)
    console.log(`   🏪 Suppliers: ${counts.suppliers}`)
    console.log(`   💰 Sales: ${counts.sales}`)
    console.log(`   📥 Purchases: ${counts.purchases}`)
    console.log(`   🚚 Deliveries: ${counts.deliveries}`)
    console.log(`   📞 Leads: ${counts.leads}`)

    const oldStoreCountCheck = await InventoryItemModel.countDocuments({ storeId: oldStoreId })
    console.log(`\n✅ Old store "${oldStoreId}" remaining items: ${oldStoreCountCheck}`)

    console.log('\n' + '='.repeat(60))
    console.log('✨ SYS ADMIN STORE REORGANIZATION COMPLETE')
    console.log('='.repeat(60))
    console.log('\n📝 What changed:')
    console.log(`   • "default-store" → "${newStoreId}"`)
    console.log('   • All existing data now belongs to sys_admin\'s personal store')
    console.log('   • Sys_admin can still READ all other stores')
    console.log('   • Sys_admin can WRITE only to their own store')
    console.log('   • Store Selector shows all stores for sys_admin to browse')

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error reorganizing store:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

reorganizeSysAdminStore()
