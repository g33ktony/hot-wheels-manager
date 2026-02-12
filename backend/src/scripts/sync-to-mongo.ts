/**
 * Standalone script to sync the JSON cache → MongoDB
 * Run: npx tsx src/scripts/sync-to-mongo.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { refreshCache, getAllCars } from '../services/hotWheelsCacheService'
import { HotWheelsCarModel } from '../models/HotWheelsCar'

dotenv.config()

async function syncJSONToMongoDB() {
  const mongoURI = process.env.MONGODB_URI
  if (!mongoURI) {
    console.error('❌ MONGODB_URI not set in .env')
    process.exit(1)
  }

  await mongoose.connect(mongoURI)
  console.log('✅ Conectado a MongoDB\n')

  // Drop old unique index on toy_num (if exists) — we now use sparse partial
  try {
    await HotWheelsCarModel.collection.dropIndex('toy_num_1')
    console.log('🗑️  Dropped old toy_num_1 unique index')
  } catch (e: any) {
    if (e.codeName !== 'IndexNotFound') console.log('ℹ️  toy_num_1 index:', e.message)
  }

  // Ensure new indexes are created
  await HotWheelsCarModel.syncIndexes()
  console.log('📇 Indexes synced\n')

  refreshCache()
  const allCars = getAllCars()
  console.log(`🔄 Sincronizando ${allCars.length} vehículos del JSON a MongoDB...\n`)

  let synced = 0
  let errors = 0
  const batchSize = 500

  for (let i = 0; i < allCars.length; i += batchSize) {
    const batch = allCars.slice(i, i + batchSize)
    const bulkOps = batch
      .filter(car => car.toy_num || car.carModel)
      .map(car => {
        // Use toy_num as the primary key, fallback to carModel+year+series composite
        const filterKey = car.toy_num
          ? { toy_num: car.toy_num }
          : { carModel: car.carModel, year: (car.year || '').toString(), series: car.series || '' }

        return {
          updateOne: {
            filter: filterKey,
            update: {
              $set: {
                toy_num: car.toy_num || '',
                col_num: car.col_num || '',
                carModel: car.carModel || '',
                series: car.series || '',
                series_num: car.series_num || '',
                photo_url: car.photo_url || '',
                year: (car.year || '').toString(),
                color: car.color || '',
                tampo: car.tampo || '',
                wheel_type: car.wheel_type || '',
                car_make: car.car_make || '',
                segment: car.segment || '',
                country: car.country || '',
                base_color: car.base_color || '',
                window_color: car.window_color || '',
                interior_color: car.interior_color || '',
                notes: car.notes || '',
              },
              $setOnInsert: { createdAt: new Date() },
            },
            upsert: true,
          },
        }
      })

    if (bulkOps.length === 0) continue

    try {
      const result = await HotWheelsCarModel.bulkWrite(bulkOps, { ordered: false })
      synced += (result.upsertedCount || 0) + (result.modifiedCount || 0)
    } catch (error: any) {
      errors += batch.length
      console.error(`  ❌ Error en lote ${i}-${i + batchSize}:`, error.message)
    }

    if ((i / batchSize) % 10 === 0) {
      console.log(`  ... ${i + batch.length}/${allCars.length} procesados`)
    }
  }

  const totalInDB = await HotWheelsCarModel.countDocuments()
  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Sincronización completada`)
  console.log(`   Actualizados/insertados: ${synced}`)
  console.log(`   Errores: ${errors}`)
  console.log(`   Total en MongoDB: ${totalInDB}`)
  console.log(`   Total en JSON: ${allCars.length}`)
  console.log(`${'='.repeat(50)}`)

  await mongoose.disconnect()
  console.log('👋 Desconectado de MongoDB')
}

syncJSONToMongoDB().catch(err => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
