/**
 * Backfill photo_url for HotWheelsCar documents using the Fandom MediaWiki API.
 * 
 * Strategy:
 * 1. For cars that already have a photo_url with a filename, resolve the real URL via API
 * 2. For cars without photo_url, try to find an image from the car's wiki page
 * 
 * Usage: npx tsx src/scripts/backfill-images.ts [--dry-run] [--limit N]
 */

import mongoose from 'mongoose'
import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { HotWheelsCarModel } from '../models/HotWheelsCar'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const BATCH_SIZE = 50 // Fandom API supports up to 50 titles per request
const DELAY_MS = 400  // Rate limiting

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 0

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Given an array of File: names (without "File:" prefix), resolve their actual URLs using the Fandom API.
 * Returns Map<filename, realUrl>
 */
async function resolveFileUrls(filenames: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (filenames.length === 0) return result

  // Batch filenames in groups of 50
  for (let i = 0; i < filenames.length; i += BATCH_SIZE) {
    const batch = filenames.slice(i, i + BATCH_SIZE)
    const titles = batch.map(f => `File:${f}`).join('|')

    try {
      const params = new URLSearchParams({
        action: 'query',
        titles: titles,
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json',
        formatversion: '2'
      })

      const response = await axios.get(`${FANDOM_API}?${params}`)
      const pages = response.data.query?.pages || []

      for (const page of pages) {
        if (page.imageinfo && page.imageinfo[0]?.url) {
          // Extract the original filename (without File: prefix)
          const filename = page.title.replace(/^File:/, '')
          result.set(filename, page.imageinfo[0].url)
        }
      }
    } catch (error: any) {
      console.error(`  Error resolving batch starting at ${i}:`, error.message)
    }

    if (i + BATCH_SIZE < filenames.length) {
      await sleep(DELAY_MS)
    }
  }

  return result
}

/**
 * For cars without any photo_url, try to get the main image from their page.
 * Uses pageimages API to get the main/thumbnail image.
 * Takes array of page titles, returns Map<title, imageUrl>
 */
async function getPageImages(pageTitles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (pageTitles.length === 0) return result

  for (let i = 0; i < pageTitles.length; i += BATCH_SIZE) {
    const batch = pageTitles.slice(i, i + BATCH_SIZE)
    const titles = batch.join('|')

    try {
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
      console.error(`  Error getting page images batch starting at ${i}:`, error.message)
    }

    if (i + BATCH_SIZE < pageTitles.length) {
      await sleep(DELAY_MS)
    }
  }

  return result
}

/**
 * Extract filename from our stored references.
 * Handles both:
 *  - wiki-file:FILENAME (new format)
 *  - https://static.wikia.nocookie.net/hotwheels/images/a/b2/Filename.jpg/revision/... (old broken format)
 */
function extractFilenameFromUrl(url: string): string | null {
  // New format: wiki-file:FILENAME
  if (url.startsWith('wiki-file:')) {
    return url.replace('wiki-file:', '')
  }
  // Old static.wikia format: /images/X/XX/FILENAME.ext/revision/...
  // The filename is between the hash dirs and /revision (or end of string)
  const match = url.match(/\/images\/[a-f0-9]\/[a-f0-9]{2}\/([^\/]+?)(?:\/revision|$)/i)
  if (match) return decodeURIComponent(match[1])
  
  // Fallback: just grab whatever is after /images/ hash dirs
  const fallback = url.match(/\/images\/[a-f0-9]\/[a-f0-9]{2}\/([^\/]+)/i)
  return fallback ? decodeURIComponent(fallback[1]) : null
}

async function backfillImages() {
  console.log('🖼️  Hot Wheels Image Backfill Script')
  console.log('====================================')
  if (DRY_RUN) console.log('🔍 DRY RUN - no changes will be made')
  if (LIMIT) console.log(`📊 Limiting to ${LIMIT} records`)
  console.log()

  // Connect to MongoDB
  const mongoURI = process.env.MONGODB_URI!
  await mongoose.connect(mongoURI)
  console.log('✅ Connected to MongoDB')

  // Stats
  let totalCars = 0
  let carsWithBrokenUrl = 0
  let carsWithNoUrl = 0
  let fixedFromFilename = 0
  let fixedFromPage = 0
  let failedToResolve = 0

  // Phase 1: Fix cars that have a broken static.wikia URL
  console.log('\n📌 Phase 1: Fix broken static.wikia URLs...')
  
  const query1: any = { 
    $or: [
      { photo_url: { $regex: /^https:\/\/static\.wikia\.nocookie\.net/ } },
      { photo_url: { $regex: /^wiki-file:/ } }
    ]
  }
  const carsWithStaticUrl = await HotWheelsCarModel.find(query1)
    .limit(LIMIT || 0)
    .lean()
  
  carsWithBrokenUrl = carsWithStaticUrl.length
  console.log(`  Found ${carsWithBrokenUrl} cars with static.wikia URLs to fix`)

  if (carsWithBrokenUrl > 0) {
    // Extract filenames
    const filenameMap = new Map<string, string[]>() // filename -> [car _ids]
    for (const car of carsWithStaticUrl) {
      const filename = extractFilenameFromUrl(car.photo_url!)
      if (filename) {
        if (!filenameMap.has(filename)) filenameMap.set(filename, [])
        filenameMap.get(filename)!.push(car._id.toString())
      }
    }

    const uniqueFilenames = Array.from(filenameMap.keys())
    console.log(`  Resolving ${uniqueFilenames.length} unique filenames...`)
    
    const resolvedUrls = await resolveFileUrls(uniqueFilenames)
    console.log(`  Resolved ${resolvedUrls.size} of ${uniqueFilenames.length} filenames`)

    // Update database
    for (const [filename, realUrl] of resolvedUrls) {
      const carIds = filenameMap.get(filename) || []
      if (!DRY_RUN) {
        await HotWheelsCarModel.updateMany(
          { _id: { $in: carIds } },
          { $set: { photo_url: realUrl } }
        )
      }
      fixedFromFilename += carIds.length
    }

    failedToResolve += uniqueFilenames.length - resolvedUrls.size
    console.log(`  ✅ Fixed ${fixedFromFilename} cars from filename resolution`)
    if (failedToResolve > 0) {
      console.log(`  ⚠️  ${failedToResolve} filenames could not be resolved`)
      // Log sample of failed filenames for debugging
      const failedFilenames = uniqueFilenames.filter(f => !resolvedUrls.has(f))
      console.log(`  📋 Sample failed filenames (first 20):`)
      failedFilenames.slice(0, 20).forEach(f => console.log(`     - "${f}"`))
    }
  }

  // Phase 1b: Fix photo_url_carded wiki-file references
  console.log('\n📌 Phase 1b: Fix photo_url_carded wiki-file references...')
  
  const queryCarded: any = { photo_url_carded: { $regex: /^wiki-file:/ } }
  const carsWithCardedRef = await HotWheelsCarModel.find(queryCarded)
    .limit(LIMIT || 0)
    .lean()
  
  console.log(`  Found ${carsWithCardedRef.length} cars with carded photo references to resolve`)

  if (carsWithCardedRef.length > 0) {
    const cardedFilenameMap = new Map<string, string[]>()
    for (const car of carsWithCardedRef) {
      const filename = extractFilenameFromUrl(car.photo_url_carded!)
      if (filename) {
        if (!cardedFilenameMap.has(filename)) cardedFilenameMap.set(filename, [])
        cardedFilenameMap.get(filename)!.push(car._id.toString())
      }
    }

    const uniqueCardedFilenames = Array.from(cardedFilenameMap.keys())
    console.log(`  Resolving ${uniqueCardedFilenames.length} unique carded filenames...`)
    
    const resolvedCardedUrls = await resolveFileUrls(uniqueCardedFilenames)
    console.log(`  Resolved ${resolvedCardedUrls.size} of ${uniqueCardedFilenames.length} filenames`)

    let fixedCarded = 0
    for (const [filename, realUrl] of resolvedCardedUrls) {
      const carIds = cardedFilenameMap.get(filename) || []
      if (!DRY_RUN) {
        await HotWheelsCarModel.updateMany(
          { _id: { $in: carIds } },
          { $set: { photo_url_carded: realUrl } }
        )
      }
      fixedCarded += carIds.length
    }
    console.log(`  ✅ Fixed ${fixedCarded} carded photo URLs`)
  }

  // Phase 2: Try to get images for cars that have NO photo_url at all
  console.log('\n📌 Phase 2: Find images for cars without photo_url...')
  
  const query2: any = { $or: [{ photo_url: { $exists: false } }, { photo_url: null }, { photo_url: '' }] }
  
  // Get distinct series/carModel combos to search wiki pages
  const carsWithoutUrl = await HotWheelsCarModel.find(query2)
    .select('carModel series _id')
    .limit(LIMIT || 0)
    .lean()
  
  carsWithNoUrl = carsWithoutUrl.length
  console.log(`  Found ${carsWithNoUrl} cars without photo_url`)

  if (carsWithNoUrl > 0) {
    // Group cars by carModel to look up pages
    const modelMap = new Map<string, string[]>() // carModel -> [car _ids]
    for (const car of carsWithoutUrl) {
      const model = car.carModel
      if (!modelMap.has(model)) modelMap.set(model, [])
      modelMap.get(model)!.push(car._id.toString())
    }

    const uniqueModels = Array.from(modelMap.keys())
    console.log(`  Looking up ${uniqueModels.length} unique car model pages...`)

    // Resolve page images in batches
    const pageImages = await getPageImages(uniqueModels)
    console.log(`  Found images for ${pageImages.size} of ${uniqueModels.length} models`)

    // Update database
    for (const [model, imageUrl] of pageImages) {
      const carIds = modelMap.get(model) || []
      if (!DRY_RUN) {
        await HotWheelsCarModel.updateMany(
          { _id: { $in: carIds } },
          { $set: { photo_url: imageUrl } }
        )
      }
      fixedFromPage += carIds.length
    }

    console.log(`  ✅ Fixed ${fixedFromPage} cars from page image lookup`)
  }

  // Final stats
  totalCars = await HotWheelsCarModel.countDocuments()
  const carsWithUrlNow = await HotWheelsCarModel.countDocuments({
    photo_url: { $exists: true, $nin: [null, ''] }
  })

  console.log('\n======================================')
  console.log('📊 FINAL STATS:')
  console.log(`   Total cars in DB: ${totalCars}`)
  console.log(`   Cars with photo_url: ${carsWithUrlNow} (${((carsWithUrlNow / totalCars) * 100).toFixed(1)}%)`)
  console.log(`   Cars still without: ${totalCars - carsWithUrlNow}`)
  console.log(`   Fixed from broken URL: ${fixedFromFilename}`)
  console.log(`   Fixed from page lookup: ${fixedFromPage}`)
  console.log(`   Total fixed: ${fixedFromFilename + fixedFromPage}`)
  if (DRY_RUN) console.log('\n🔍 DRY RUN - changes were NOT saved')
  console.log('======================================')

  await mongoose.disconnect()
  console.log('\n👋 Done.')
}

backfillImages().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
