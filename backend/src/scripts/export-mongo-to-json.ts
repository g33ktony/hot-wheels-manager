/**
 * One-time script: Export all HotWheelsCar documents from MongoDB to local JSON
 * Run: npx tsx src/scripts/export-mongo-to-json.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { saveCarsToJSON, getCacheStats } from '../services/hotWheelsCacheService'

dotenv.config()

async function exportMongoToJSON() {
  try {
    const mongoURI = process.env.MONGODB_URI!
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected\n')

    const totalInDB = await HotWheelsCarModel.countDocuments()
    console.log(`📦 Total vehicles in MongoDB: ${totalInDB}`)

    console.log('📥 Fetching all documents...')
    const allCars = await HotWheelsCarModel.find({})
      .select('toy_num col_num carModel series series_num photo_url year color tampo wheel_type car_make segment country pack_contents')
      .lean()

    console.log(`   Fetched ${allCars.length} documents`)

    // Map to normalized format
    const normalized = allCars.map(car => ({
      toy_num: car.toy_num || '',
      col_num: car.col_num || '',
      carModel: car.carModel || '',
      model: car.carModel || '',
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
      pack_contents: car.pack_contents || undefined,
    }))

    // Save to JSON
    saveCarsToJSON(normalized)

    const stats = getCacheStats()
    console.log(`\n✅ Export complete!`)
    console.log(`   📦 MongoDB: ${totalInDB} vehicles`)
    console.log(`   💾 JSON: ${stats.count} vehicles`)
    console.log(`   📁 File: ${stats.filePath}`)
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
  }
}

exportMongoToJSON()
