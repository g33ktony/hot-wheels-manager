/**
 * Export resolved photo_url values from MongoDB back to JSON file.
 * 
 * The catalog frontend serves from local JSON cache, so resolved URLs
 * from backfill-images (which updates MongoDB) need to be written back.
 * 
 * Matches by toy_num + series + year + color (composite key used in sync-to-mongo).
 * 
 * Usage: npx tsx src/scripts/export-photos-to-json.ts [--dry-run]
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { HotWheelsCarModel } from '../models/HotWheelsCar'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const JSON_PATH = path.resolve(__dirname, '../../data/hotwheels_database.json')
const DRY_RUN = process.argv.includes('--dry-run')

function isValidPhotoUrl(url: string | undefined | null): boolean {
  if (!url) return false
  // Must be a real HTTP URL, not wiki-file: or N/A or empty
  return url.startsWith('https://') && !url.startsWith('wiki-file:') && url !== 'N/A'
}

async function exportPhotosToJson() {
  console.log('📸 Export resolved photo URLs from MongoDB → JSON')
  console.log('=================================================')
  if (DRY_RUN) console.log('🔍 DRY RUN mode\n')

  // Load JSON
  const jsonData: any[] = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
  console.log(`📄 JSON loaded: ${jsonData.length} items`)

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('✅ Connected to MongoDB')

  // Fetch all cars from MongoDB that have resolved photo URLs
  const mongoCars = await HotWheelsCarModel.find({
    photo_url: { $regex: /^https:\/\// }
  }).select('toy_num series year color photo_url photo_url_carded carModel').lean()

  console.log(`🗄️  MongoDB: ${mongoCars.length} cars with resolved photo URLs`)

  // Build lookup map: composite key → photo_url
  const photoMap = new Map<string, { photo_url: string; photo_url_carded?: string }>()
  for (const car of mongoCars) {
    // Use same composite key as sync-to-mongo
    const key = `${car.toy_num}|${car.series}|${car.year}|${car.color}`
    if (isValidPhotoUrl(car.photo_url)) {
      photoMap.set(key, {
        photo_url: car.photo_url!,
        photo_url_carded: isValidPhotoUrl(car.photo_url_carded) ? car.photo_url_carded : undefined
      })
    }
    // Also index by toy_num + carModel for broader matching
    const key2 = `${car.toy_num}|${car.carModel}|${car.year}`
    if (!photoMap.has(key2) && isValidPhotoUrl(car.photo_url)) {
      photoMap.set(key2, {
        photo_url: car.photo_url!,
        photo_url_carded: isValidPhotoUrl(car.photo_url_carded) ? car.photo_url_carded : undefined
      })
    }
  }

  console.log(`🔑 Built ${photoMap.size} photo lookup entries`)

  // Update JSON items
  let updated = 0
  let alreadyGood = 0
  let noMatch = 0

  for (const item of jsonData) {
    // Skip if already has a valid URL
    if (isValidPhotoUrl(item.photo_url)) {
      alreadyGood++
      continue
    }

    const key = `${item.toy_num || ''}|${item.series || ''}|${item.year || ''}|${item.color || ''}`
    const key2 = `${item.toy_num || ''}|${item.carModel || ''}|${item.year || ''}`
    
    const entry = photoMap.get(key) || photoMap.get(key2)
    if (entry) {
      item.photo_url = entry.photo_url
      if (entry.photo_url_carded) {
        item.photo_url_carded = entry.photo_url_carded
      }
      updated++
    } else {
      noMatch++
    }
  }

  console.log(`\n📊 Results:`)
  console.log(`   Already had valid URL: ${alreadyGood}`)
  console.log(`   Updated from MongoDB:  ${updated}`)
  console.log(`   No match found:        ${noMatch}`)
  console.log(`   Total:                 ${jsonData.length}`)

  if (!DRY_RUN && updated > 0) {
    fs.writeFileSync(JSON_PATH, JSON.stringify(jsonData))
    console.log(`\n✅ JSON file updated with ${updated} resolved photo URLs`)
  } else if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — no changes saved')
  }

  await mongoose.disconnect()
  console.log('👋 Done.')
}

exportPhotosToJson().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
