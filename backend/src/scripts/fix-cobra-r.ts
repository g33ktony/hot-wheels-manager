/**
 * Targeted fix for Cobra R photos.
 * Also re-runs fix-shared-photos for ALL castings that still need fixing,
 * with verbose logging for Cobra R.
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

async function resolveFilename(filename: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: `File:${filename}`,
      prop: 'imageinfo',
      iiprop: 'url',
      format: 'json',
      formatversion: '2'
    })
    const resp = await axios.get(`${FANDOM_API}?${params}`)
    const page = resp.data.query?.pages?.[0]
    return page?.imageinfo?.[0]?.url || null
  } catch (e: any) {
    console.error(`  Error resolving ${filename}: ${e.message}`)
    return null
  }
}

async function main() {
  console.log('🔧 Targeted fix for remaining shared photos\n')

  const jsonData: any[] = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
  console.log(`📄 JSON: ${jsonData.length} items`)

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('✅ Connected to MongoDB\n')

  // Direct fixes based on debug analysis
  const fixes: Array<{
    toy_num: string
    year: string
    color: string
    new_filename: string
  }> = [
    {
      toy_num: 'HGK61',
      year: '2022',
      color: 'Metalflake cyan',
      new_filename: '1993_Ford_Mustang_Cobra_R_22nd_HWC_Nationals_Dinner_Car_Front_(Closed).jpg'
    },
    {
      toy_num: 'HNL15',
      year: '2023',
      color: 'Spectraflame true black',
      new_filename: 'RLC_2023_1993_Ford_Mustang_Cobra_R_Black_China_HNL15.jpg'
    },
    {
      toy_num: 'HWF29',
      year: '2024',
      color: 'Spectraflame party pink',
      new_filename: '1993_Ford_mustang_Cobra_R_HWF29.jpeg'
    }
  ]

  // The shared URL that needs to be replaced
  const sharedUrlSuffix = 'Hot_Wheels_Collectors_Ford_Mustang_1993_Cobra_R_06a.jpg'

  let updatedJson = 0
  let updatedMongo = 0

  for (const fix of fixes) {
    console.log(`\n--- Fixing ${fix.toy_num} (${fix.color}) ---`)

    // Resolve filename to URL
    const newUrl = await resolveFilename(fix.new_filename)
    if (!newUrl) {
      console.log(`  ❌ Could not resolve: ${fix.new_filename}`)
      continue
    }
    console.log(`  ✅ Resolved: ...${newUrl.slice(-60)}`)

    // Find in JSON
    const idx = jsonData.findIndex(e =>
      e.toy_num === fix.toy_num &&
      e.year === fix.year &&
      e.photo_url?.includes(sharedUrlSuffix)
    )

    if (idx >= 0) {
      const oldUrl = jsonData[idx].photo_url
      jsonData[idx].photo_url = newUrl
      console.log(`  ✅ JSON[${idx}] updated`)
      console.log(`     OLD: ...${oldUrl.slice(-50)}`)
      console.log(`     NEW: ...${newUrl.slice(-50)}`)
      updatedJson++
    } else {
      // Try without shared URL check
      const idx2 = jsonData.findIndex(e =>
        e.toy_num === fix.toy_num &&
        e.year === fix.year &&
        e.carModel === '1993 Ford Mustang Cobra R'
      )
      if (idx2 >= 0) {
        const oldUrl = jsonData[idx2].photo_url || 'NONE'
        jsonData[idx2].photo_url = newUrl
        console.log(`  ✅ JSON[${idx2}] updated (found by toy_num+year)`)
        console.log(`     OLD: ...${oldUrl.slice(-50)}`)
        console.log(`     NEW: ...${newUrl.slice(-50)}`)
        updatedJson++
      } else {
        console.log(`  ❌ Not found in JSON for toy_num=${fix.toy_num} year=${fix.year}`)
      }
    }

    // Update MongoDB
    const result = await HotWheelsCarModel.updateMany(
      { toy_num: fix.toy_num, year: fix.year },
      { $set: { photo_url: newUrl } }
    )
    console.log(`  ✅ MongoDB: ${result.modifiedCount} docs updated`)
    updatedMongo += result.modifiedCount
  }

  // Save JSON
  if (updatedJson > 0) {
    fs.writeFileSync(JSON_PATH, JSON.stringify(jsonData))
    console.log(`\n✅ JSON saved (${updatedJson} entries updated)`)
  }

  // Verify
  console.log('\n=== Verification ===')
  const cobras = jsonData.filter(e => e.carModel === '1993 Ford Mustang Cobra R')
  for (const c of cobras) {
    const urlEnd = (c.photo_url || 'NONE').slice(-50)
    const toyStr = (c.toy_num || 'N/A').padEnd(8)
    const colorStr = (c.color || '').slice(0, 25).padEnd(25)
    console.log(`  [${c.year}] ${toyStr} ${colorStr} ...${urlEnd}`)
  }

  // Count remaining shared photos globally
  const modelGroups = new Map<string, Map<string, number>>()
  for (const e of jsonData) {
    const m = e.carModel || ''
    const url = e.photo_url || ''
    if (!m || !url.startsWith('https://')) continue
    if (!modelGroups.has(m)) modelGroups.set(m, new Map())
    const urls = modelGroups.get(m)!
    urls.set(url, (urls.get(url) || 0) + 1)
  }
  let sharedCount = 0
  for (const [, urls] of modelGroups) {
    for (const [, count] of urls) {
      if (count >= 4) sharedCount++
    }
  }
  console.log(`\n📊 URLs still shared 4+ times: ${sharedCount}`)

  await mongoose.disconnect()
  console.log('\n👋 Done.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
