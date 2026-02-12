import mongoose from 'mongoose'
import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { HotWheelsCarModel } from '../models/HotWheelsCar'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const BATCH_SIZE = 50
const DELAY_MS = 400

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Given car model names, search for their wiki page images.
 * Uses Fandom API `prop=images` to find all images on a page, 
 * then `imageinfo` to get URLs.
 */
async function getImagesForPages(pageTitles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  
  for (let i = 0; i < pageTitles.length; i += BATCH_SIZE) {
    const batch = pageTitles.slice(i, i + BATCH_SIZE)
    const titles = batch.join('|')

    try {
      // First try pageimages (main image)
      const params = new URLSearchParams({
        action: 'query',
        titles: titles,
        prop: 'pageimages',
        piprop: 'original',
        format: 'json',
        formatversion: '2'
      })

      const response = await axios.get(`${FANDOM_API}?${params}`)
      const pages = response.data.query?.pages || []

      for (const page of pages) {
        if (page.original?.source) {
          result.set(page.title, page.original.source)
        }
      }
    } catch (error: any) {
      console.error(`  Error batch ${i}:`, error.message)
    }

    if (i + BATCH_SIZE < pageTitles.length) {
      await sleep(DELAY_MS)
    }
  }

  return result
}

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('✅ Connected to MongoDB\n')

  // ===== STEP 1: Delete junk records =====
  console.log('🗑️  Step 1: Deleting junk records...')
  
  // Delete records with ]] in carModel, raw template data, or px-only toy_nums
  const junkResult = await HotWheelsCarModel.deleteMany({
    $or: [
      { carModel: /\]\]/ },
      { carModel: '' },
      { carModel: /^\{\{/ },
      { toy_num: /^\{\{/ },
      { toy_num: /^\d+px$/ },   // "75px", "100px" etc
      { carModel: /^\d+px/ },   // carModel is just "100px"
    ]
  })
  console.log(`   Deleted ${junkResult.deletedCount} junk records`)

  // ===== STEP 2: Clean up remaining dirty data =====
  console.log('\n🧹 Step 2: Cleaning dirty field values...')
  
  // Clean carModel fields that have residual wiki markup
  const dirtyCars = await HotWheelsCarModel.find({
    $or: [
      { carModel: /\[\[/ },
      { carModel: /\{\{/ },
      { toy_num: /\[\[/ },
      { toy_num: /​/ }, // Zero-width space
    ]
  }).lean()
  
  let cleanedCount = 0
  for (const car of dirtyCars) {
    const updates: any = {}
    
    if (car.carModel && /\[\[/.test(car.carModel)) {
      // Extract display text from [[Link|Display]] or [[Link]]
      updates.carModel = car.carModel
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .trim()
    }
    
    if (car.toy_num && /\[\[|​/.test(car.toy_num)) {
      updates.toy_num = car.toy_num
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/​/g, '') // Remove zero-width spaces
        .trim()
    }
    
    if (Object.keys(updates).length > 0) {
      try {
        await HotWheelsCarModel.updateOne({ _id: car._id }, { $set: updates })
        cleanedCount++
      } catch (err: any) {
        if (err.code === 11000) {
          // Duplicate key - delete this record instead
          await HotWheelsCarModel.deleteOne({ _id: car._id })
          console.log(`   Deleted duplicate: ${car.carModel} (${car.toy_num})`)
        }
      }
    }
  }
  console.log(`   Cleaned ${cleanedCount} records with dirty markup`)

  // ===== STEP 3: Better image backfill =====
  console.log('\n🖼️  Step 3: Second-pass image backfill...')
  
  const carsWithoutPhoto = await HotWheelsCarModel.find({
    $or: [{ photo_url: { $exists: false } }, { photo_url: null }, { photo_url: '' }]
  }).select('carModel series').lean()
  
  console.log(`   ${carsWithoutPhoto.length} cars without images`)
  
  // Group by carModel - look up each unique model's wiki page
  const modelToIds = new Map<string, string[]>()
  for (const car of carsWithoutPhoto) {
    const model = car.carModel
    if (!model || model.length < 2) continue
    if (!modelToIds.has(model)) modelToIds.set(model, [])
    modelToIds.get(model)!.push(car._id.toString())
  }
  
  const uniqueModels = Array.from(modelToIds.keys())
  console.log(`   Looking up ${uniqueModels.length} unique model pages...`)
  
  // Try model names directly as page titles
  const modelImages = await getImagesForPages(uniqueModels)
  
  let fixedCount = 0
  for (const [model, imageUrl] of modelImages) {
    const carIds = modelToIds.get(model) || []
    await HotWheelsCarModel.updateMany(
      { _id: { $in: carIds } },
      { $set: { photo_url: imageUrl } }
    )
    fixedCount += carIds.length
  }
  console.log(`   Fixed ${fixedCount} cars from model page lookup`)
  
  // For remaining cars without photos, try series page image as fallback
  const stillNoPhoto = await HotWheelsCarModel.find({
    $or: [{ photo_url: { $exists: false } }, { photo_url: null }, { photo_url: '' }]
  }).select('carModel series').lean()
  
  console.log(`\n   ${stillNoPhoto.length} cars still without images`)
  
  if (stillNoPhoto.length > 0) {
    // Group by series, try series page image
    const seriesToIds = new Map<string, string[]>()
    for (const car of stillNoPhoto) {
      const series = car.series
      if (!series) continue
      if (!seriesToIds.has(series)) seriesToIds.set(series, [])
      seriesToIds.get(series)!.push(car._id.toString())
    }
    
    const uniqueSeries = Array.from(seriesToIds.keys())
    console.log(`   Looking up ${uniqueSeries.length} series pages for fallback images...`)
    
    const seriesImages = await getImagesForPages(uniqueSeries)
    
    let seriesFixed = 0
    for (const [series, imageUrl] of seriesImages) {
      const carIds = seriesToIds.get(series) || []
      await HotWheelsCarModel.updateMany(
        { _id: { $in: carIds } },
        { $set: { photo_url: imageUrl } }
      )
      seriesFixed += carIds.length
    }
    console.log(`   Fixed ${seriesFixed} cars from series page fallback`)
  }

  // ===== FINAL STATS =====
  const total = await HotWheelsCarModel.countDocuments()
  const withPhoto = await HotWheelsCarModel.countDocuments({
    photo_url: { $exists: true, $nin: [null, ''] }
  })
  const noPhoto = total - withPhoto

  console.log('\n======================================')
  console.log('📊 FINAL STATS:')
  console.log(`   Total cars: ${total}`)
  console.log(`   With image: ${withPhoto} (${((withPhoto / total) * 100).toFixed(1)}%)`)
  console.log(`   Without image: ${noPhoto} (${((noPhoto / total) * 100).toFixed(1)}%)`)
  console.log('======================================')

  await mongoose.disconnect()
  console.log('\n👋 Done.')
}

cleanup().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
