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

// Helper function to wait for MongoDB connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    
    console.log('🔗 Conectando a MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Conectado a MongoDB')
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error)
    process.exit(1)
  }
}

async function migrateData() {
  try {
    // Esperar conexión
    await connectDB()
    
    console.log('\n🔄 Iniciando migración de datos a multi-tenancy...\n')
    
    // Obtener todos los usuarios
    const allUsers = await UserModel.find({})
    console.log(`📊 Total de usuarios encontrados: ${allUsers.length}`)
    
    if (allUsers.length === 0) {
      throw new Error('❌ No users found in database! Cannot proceed with migration.')
    }
    
    // Buscar un usuario con storeId, o usar el primero y asignarle 'default-store'
    let defaultStoreId = 'default-store'
    const userWithStore = allUsers.find(u => u.storeId)
    
    if (userWithStore) {
      defaultStoreId = userWithStore.storeId
      console.log(`✅ Encontrado usuario con storeId: ${defaultStoreId}`)
    } else {
      console.log(`⚠️  No se encontró usuario con storeId asignado, usando: ${defaultStoreId}`)
      // Asignar storeId a todos los usuarios si no lo tienen
      const userUpdateResult = await UserModel.updateMany(
        { storeId: { $exists: false } },
        { $set: { storeId: defaultStoreId } }
      )
      console.log(`✅ Asignado storeId a ${userUpdateResult.modifiedCount} usuarios\n`)
    }
    
    console.log(`📦 Usando Store ID por defecto: ${defaultStoreId}\n`)
    
    // Migrar InventoryItem
    console.log('📦 Migrando InventoryItem...')
    const inventoryResult = await InventoryItemModel.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    )
    console.log(`   ✅ ${inventoryResult.modifiedCount} inventoryItems actualizados`)
    
    // Migrar Customer
    console.log('👥 Migrando Customer...')
    const customerResult = await CustomerModel.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    )
    console.log(`   ✅ ${customerResult.modifiedCount} customers actualizados`)
    
    // Migrar Supplier
    console.log('🏪 Migrando Supplier...')
    const supplierResult = await SupplierModel.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    )
    console.log(`   ✅ ${supplierResult.modifiedCount} suppliers actualizados`)
    
    // Migrar Sale
    console.log('💰 Migrando Sale...')
    const saleResult = await SaleModel.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    )
    console.log(`   ✅ ${saleResult.modifiedCount} sales actualizadas`)
    
    // Migrar Purchase
    console.log('📥 Migrando Purchase...')
    const purchaseResult = await PurchaseModel.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    )
    console.log(`   ✅ ${purchaseResult.modifiedCount} purchases actualizadas`)
    
    // Migrar Delivery
    console.log('🚚 Migrando Delivery...')
    const deliveryResult = await DeliveryModel.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    )
    console.log(`   ✅ ${deliveryResult.modifiedCount} deliveries actualizado`)
    
    // Migrar Lead
    console.log('📞 Migrando Lead...')
    const leadResult = await Lead.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    )
    console.log(`   ✅ ${leadResult.modifiedCount} leads actualizados\n`)
    
    // Verificar que todos los documentos tienen storeId
    console.log('📋 Verificando resultados...\n')
    
    const counts = {
      inventoryNoStoreId: await InventoryItemModel.countDocuments({ storeId: { $exists: false } }),
      customerNoStoreId: await CustomerModel.countDocuments({ storeId: { $exists: false } }),
      supplierNoStoreId: await SupplierModel.countDocuments({ storeId: { $exists: false } }),
      saleNoStoreId: await SaleModel.countDocuments({ storeId: { $exists: false } }),
      purchaseNoStoreId: await PurchaseModel.countDocuments({ storeId: { $exists: false } }),
      deliveryNoStoreId: await DeliveryModel.countDocuments({ storeId: { $exists: false } }),
      leadNoStoreId: await Lead.countDocuments({ storeId: { $exists: false } })
    }
    
    let allMigrated = true
    for (const [key, count] of Object.entries(counts)) {
      if (count > 0) {
        console.log(`   ⚠️  ${key}: ${count} documentos sin storeId`)
        allMigrated = false
      }
    }
    
    if (allMigrated) {
      console.log('   ✅ Todos los documentos tienen storeId asignado!')
    }
    
    // Mostrar resumen de migración por tienda
    console.log('\n📊 Resumen de datos por tienda:\n')
    
    const stores = await UserModel.distinct('storeId')
    for (const storeId of stores) {
      console.log(`🏪 Store: ${storeId}`)
      const user = await UserModel.findOne({ storeId })
      console.log(`   Usuario admin: ${user?.email}`)
      const inventory = await InventoryItemModel.countDocuments({ storeId })
      const customers = await CustomerModel.countDocuments({ storeId })
      const sales = await SaleModel.countDocuments({ storeId })
      const purchases = await PurchaseModel.countDocuments({ storeId })
      console.log(`   📦 Inventory items: ${inventory}`)
      console.log(`   👥 Customers: ${customers}`)
      console.log(`   💰 Sales: ${sales}`)
      console.log(`   📥 Purchases: ${purchases}\n`)
    }
    
    console.log('✨ Migración completada exitosamente!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error en migración:', error)
    process.exit(1)
  }
}

migrateData()
