/**
 * Fix truncated wiki-file: photo references in JSON file.
 * 
 * For items where the filename was truncated (no file extension),
 * attempts to find the correct image via:
 * 1. Wiki pageimages API using the car's wiki page name (carModel)
 * 2. Wiki imageinfo API searching within the page content 
 * 
 * Updates both JSON file and MongoDB.
 * Usage: npx tsx src/scripts/fix-truncated-photos.ts
 */

import mongoose from 'mongoose'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { HotWheelsCarModel } from '../models/HotWheelsCar'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const JSON_PATH = path.resolve(__dirname, '../../data/hotwheels_database.json')
const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const BATCH_SIZE = 50
const DELAY_MS = 400

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get page images for multiple wiki pages at once.
 * Returns Map<pageTitle, imageUrl>
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
        titles,
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
      console.error(`  Error batch ${i}: ${error.message}`)
    }

    if (i + BATCH_SIZE < pageTitles.length) {
      await sleep(DELAY_MS)
    }
    
    if (i % 500 === 0 && i > 0) {
      console.log(`  ... ${i}/${pageTitles.length} pages queried, found ${result.size} images`)
    }
  }

  return result
}

/**
 * Resolve File: titles through imageinfo API
 */
async function resolveFileUrls(filenames: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (filenames.length === 0) return result

  for (let i = 0; i < filenames.length; i += BATCH_SIZE) {
    const batch = filenames.slice(i, i + BATCH_SIZE)
    const titles = batch.map(f => `File:${f}`).join('|')

    try {
      const params = new URLSearchParams({
        action: 'query',
        titles,
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json',
        formatversion: '2'
      })

      const response = await axios.get(`${FANDOM_API}?${params}`)
      const pages = response.data.query?.pages || []

      for (const page of pages) {
        if (page.imageinfo && page.imageinfo[0]?.url) {
          const filename = page.title.replace(/^File:/, '')
          result.set(filename, page.imageinfo[0].url)
        }
      }
    } catch (error: any) {
      console.error(`  Error batch ${i}: ${error.message}`)
    }

    if (i + BATCH_SIZE < filenames.length) {
      await sleep(DELAY_MS)
    }

    if (i % 500 === 0 && i > 0) {
      console.log(`  ... ${i}/${filenames.length} filenames queried, resolved ${result.size}`)
    }
  }

  return result
}

async function fixTruncatedPhotos() {
  console.log('🔧 Fix Truncated Photo References')
  console.log('==================================\n')

  // Load JSON
  const jsonData: any[] = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
  console.log(`📄 JSON: ${jsonData.length} items`)

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('✅ Connected to MongoDB\n')

  // Find items with truncated wiki-file: (no file extension)
  const truncatedItems = jsonData.filter(item => {
    const url = item.photo_url || ''
    return url.startsWith('wiki-file:') && !/\.\w{2,4}$/.test(url)
  })
  
  // Find items with valid wiki-file: that failed API resolution
  const validWikiFileItems = jsonData.filter(item => {
    const url = item.photo_url || ''
    return url.startsWith('wiki-file:') && /\.\w{2,4}$/.test(url)
  })

  console.log(`📌 Truncated wiki-file: entries: ${truncatedItems.length}`)
  console.log(`📌 Valid wiki-file: (API failed): ${validWikiFileItems.length}`)

  // ====== Phase 1: Fix truncated via pageimages API ======
  console.log('\n🔍 Phase 1: Resolve truncated entries via pageimages API...')
  
  // Group by carModel (wiki page name)
  const modelToItems = new Map<string, any[]>()
  for (const item of truncatedItems) {
    const model = item.carModel || ''
    if (!model) continue
    if (!modelToItems.has(model)) modelToItems.set(model, [])
    modelToItems.get(model)!.push(item)
  }

  const uniqueModels = Array.from(modelToItems.keys())
  console.log(`  Querying ${uniqueModels.length} unique car model pages...`)

  const pageImages = await getPageImages(uniqueModels)
  console.log(`  Found images for ${pageImages.size} of ${uniqueModels.length} models`)

  let fixedTruncated = 0
  for (const [model, imageUrl] of pageImages) {
    const items = modelToItems.get(model) || []
    for (const item of items) {
      item.photo_url = imageUrl
      fixedTruncated++
    }
  }
  console.log(`  ✅ Fixed ${fixedTruncated} items via pageimages`)

  // ====== Phase 2: Retry valid filenames with imageinfo API ======
  console.log('\n🔍 Phase 2: Retry valid wiki-file: filenames via imageinfo API...')
  
  const filenames = [...new Set(validWikiFileItems.map(item => 
    item.photo_url.replace('wiki-file:', '')
  ))]
  console.log(`  Resolving ${filenames.length} unique filenames...`)

  const resolvedFiles = await resolveFileUrls(filenames)
  console.log(`  Resolved ${resolvedFiles.size} of ${filenames.length} filenames`)

  let fixedValid = 0
  for (const item of validWikiFileItems) {
    const filename = item.photo_url.replace('wiki-file:', '')
    const resolvedUrl = resolvedFiles.get(filename)
    if (resolvedUrl) {
      item.photo_url = resolvedUrl
      fixedValid++
    }
  }
  console.log(`  ✅ Fixed ${fixedValid} items via imageinfo`)

  // ====== Phase 3: Also try series page for remaining truncated ======
  const stillBroken = truncatedItems.filter(item => 
    (item.photo_url || '').startsWith('wiki-file:')
  )
  if (stillBroken.length > 0) {
    console.log(`\n🔍 Phase 3: Try series pages for ${stillBroken.length} remaining items...`)
    
    const seriesToItems = new Map<string, any[]>()
    for (const item of stillBroken) {
      const series = item.series || ''
      if (!series) continue
      if (!seriesToItems.has(series)) seriesToItems.set(series, [])
      seriesToItems.get(series)!.push(item)
    }

    const uniqueSeries = Array.from(seriesToItems.keys())
    console.log(`  Querying ${uniqueSeries.length} unique series pages...`)
    
    const seriesImages = await getPageImages(uniqueSeries)
    console.log(`  Found images for ${seriesImages.size} series pages`)

    let fixedFromSeries = 0
    for (const [series, imageUrl] of seriesImages) {
      const items = seriesToItems.get(series) || []
      for (const item of items) {
        if ((item.photo_url || '').startsWith('wiki-file:')) {
          item.photo_url = imageUrl
          fixedFromSeries++
        }
      }
    }
    console.log(`  ✅ Fixed ${fixedFromSeries} items from series pages`)
  }

  // ====== Save results ======
  const totalFixed = jsonData.filter(item => {
    const url = item.photo_url || ''
    return url.startsWith('https://')
  }).length

  const stillWikiFile = jsonData.filter(item => 
    (item.photo_url || '').startsWith('wiki-file:')
  ).length

  console.log('\n======================================')
  console.log('📊 RESULTS:')
  console.log(`   Total items: ${jsonData.length}`)
  console.log(`   With valid https:// URL: ${totalFixed}`)
  console.log(`   Still wiki-file:: ${stillWikiFile}`)
  console.log(`   Empty/N/A: ${jsonData.length - totalFixed - stillWikiFile}`)
  console.log('======================================')

  // Save JSON (compact format for performance)
  fs.writeFileSync(JSON_PATH, JSON.stringify(jsonData))
  console.log('\n✅ JSON file saved')

  // Update MongoDB for fixed items
  console.log('🔄 Updating MongoDB...')
  let mongoUpdated = 0
  const allFixed = [...truncatedItems, ...validWikiFileItems].filter(item => 
    (item.photo_url || '').startsWith('https://')
  )
  
  for (const item of allFixed) {
    const filter: any = {}
    if (item.toy_num) filter.toy_num = item.toy_num
    if (item.series) filter.series = item.series
    if (item.year) filter.year = item.year.toString()
    if (item.color) filter.color = item.color
    
    if (Object.keys(filter).length >= 2) {
      const result = await HotWheelsCarModel.updateMany(filter, { $set: { photo_url: item.photo_url } })
      mongoUpdated += result.modifiedCount
    }
  }
  console.log(`  ✅ Updated ${mongoUpdated} MongoDB documents`)

  await mongoose.disconnect()
  console.log('\n👋 Done.')
}

fixTruncatedPhotos().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
