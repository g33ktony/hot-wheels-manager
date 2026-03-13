/**
 * eBay Price Enrichment Script
 *
 * Batch-fetches average eBay prices for Hot Wheels items and stores
 * them in the JSON database.
 *
 * Because the free-tier eBay Browse API allows 5,000 calls/day,
 * this script:
 *   - Processes items in configurable batches (default 4,500/run)
 *   - Saves progress so it can resume across multiple runs
 *   - Skips items already priced within the freshness window (default 7 days)
 *   - Prioritises items that have never been priced
 *
 * Usage:
 *   cd backend
 *   npm run enrich:ebay-prices                  # default batch
 *   EBAY_BATCH=1000 npm run enrich:ebay-prices  # smaller batch
 *   EBAY_FORCE=true npm run enrich:ebay-prices   # re-check all regardless of freshness
 *
 * Requires EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in .env
 */

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { EbayPriceService, type EbayPriceResult } from '../services/ebayPriceService'

dotenv.config()

// ─── Configuration ───────────────────────────────────────────────

const JSON_DB_PATH = path.join(__dirname, '../../data/hotwheels_database.json')
const PROGRESS_PATH = path.join(__dirname, '../../data/ebay-price-progress.json')
const STATS_DIR = path.join(__dirname, '../../data')

const BATCH_SIZE = parseInt(process.env.EBAY_BATCH || '4500', 10)
const FRESHNESS_DAYS = parseInt(process.env.EBAY_FRESHNESS_DAYS || '7', 10)
const FORCE_ALL = process.env.EBAY_FORCE === 'true'

// How often to save progress (every N items)
const SAVE_INTERVAL = 50

// ─── Types ───────────────────────────────────────────────────────

interface EbayPriceData {
  ebay_avg_price?: number | null
  ebay_min_price?: number | null
  ebay_max_price?: number | null
  ebay_sold_count?: number
  ebay_price_currency?: string
  ebay_price_updated?: string // ISO date
}

interface EnrichProgress {
  lastProcessedIndex: number
  totalProcessed: number
  lastRunDate: string
  batchesCompleted: number
}

interface RunStats {
  startTime: string
  endTime: string
  totalItems: number
  processed: number
  priced: number          // items where avg price was found
  skippedFresh: number    // skipped because recently priced
  skippedNoToyNum: number
  errors: number
  avgPriceOverall: number | null
}

// ─── Helpers ─────────────────────────────────────────────────────

function loadProgress(): EnrichProgress {
  try {
    if (fs.existsSync(PROGRESS_PATH)) {
      return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { lastProcessedIndex: -1, totalProcessed: 0, lastRunDate: '', batchesCompleted: 0 }
}

function saveProgress(p: EnrichProgress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2))
}

function isFresh(item: any): boolean {
  if (FORCE_ALL) return false
  const updated = item.ebay_price_updated
  if (!updated) return false
  const age = Date.now() - new Date(updated).getTime()
  return age < FRESHNESS_DAYS * 24 * 60 * 60 * 1000
}

function progressBar(done: number, total: number, width = 30): string {
  const pct = Math.round((done / total) * 100)
  const filled = Math.round((done / total) * width)
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  return `[${bar}] ${pct}% (${done}/${total})`
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('🏷️  eBay Price Enrichment Script')
  console.log('═'.repeat(50))

  // ── Check credentials
  if (!EbayPriceService.isConfigured()) {
    console.log('')
    console.log('⚠️  eBay API credentials not configured.')
    console.log('   Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in your .env file.')
    console.log('   Register at https://developer.ebay.com to get your keys.')
    console.log('')
    console.log('   Once you have them, add to backend/.env:')
    console.log('     EBAY_CLIENT_ID=your-client-id')
    console.log('     EBAY_CLIENT_SECRET=your-client-secret')
    console.log('')
    process.exit(0)
  }

  // ── Load database
  if (!fs.existsSync(JSON_DB_PATH)) {
    console.error('❌ Database not found:', JSON_DB_PATH)
    process.exit(1)
  }

  const data: any[] = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf-8'))
  console.log(`📦 Loaded ${data.length} items from database`)

  // ── Filter candidates
  const candidates: { index: number; toyNum: string; carModel: string }[] = []
  let skippedFresh = 0
  let skippedNoToyNum = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const toyNum = (item.toy_num || '').trim()

    if (!toyNum) {
      skippedNoToyNum++
      continue
    }

    if (isFresh(item)) {
      skippedFresh++
      continue
    }

    candidates.push({
      index: i,
      toyNum,
      carModel: item.carModel || item.model || '',
    })
  }

  console.log(`🎯 Candidates: ${candidates.length} (skipped ${skippedFresh} fresh, ${skippedNoToyNum} no toy_num)`)
  console.log(`📊 Batch size: ${BATCH_SIZE}, Freshness: ${FRESHNESS_DAYS} days, Force: ${FORCE_ALL}`)

  if (candidates.length === 0) {
    console.log('✅ All items are up to date!')
    process.exit(0)
  }

  // ── Limit to batch size
  const batch = candidates.slice(0, BATCH_SIZE)
  console.log(`🚀 Processing ${batch.length} items this run...\n`)

  // ── Process
  const stats: RunStats = {
    startTime: new Date().toISOString(),
    endTime: '',
    totalItems: data.length,
    processed: 0,
    priced: 0,
    skippedFresh,
    skippedNoToyNum,
    errors: 0,
    avgPriceOverall: null,
  }

  const allPrices: number[] = []
  const progress = loadProgress()

  for (let i = 0; i < batch.length; i++) {
    const { index, toyNum, carModel } = batch[i]

    try {
      const result: EbayPriceResult = await EbayPriceService.getAveragePrice(toyNum, carModel)

      // Update the item in the database array
      const priceData: EbayPriceData = {
        ebay_avg_price: result.avgPrice,
        ebay_min_price: result.minPrice,
        ebay_max_price: result.maxPrice,
        ebay_sold_count: result.soldCount,
        ebay_price_currency: result.currency,
        ebay_price_updated: result.lastChecked,
      }

      Object.assign(data[index], priceData)

      stats.processed++
      if (result.avgPrice !== null) {
        stats.priced++
        allPrices.push(result.avgPrice)
      }
    } catch (err: any) {
      stats.errors++
      console.error(`  ❌ Error for ${toyNum}: ${err.message}`)
    }

    // Log progress
    if ((i + 1) % 10 === 0 || i === batch.length - 1) {
      process.stdout.write(`\r  ${progressBar(i + 1, batch.length)} | Priced: ${stats.priced} | Errors: ${stats.errors}`)
    }

    // Save periodically
    if ((i + 1) % SAVE_INTERVAL === 0) {
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2))
      progress.lastProcessedIndex = index
      progress.totalProcessed += SAVE_INTERVAL
      progress.lastRunDate = new Date().toISOString()
      saveProgress(progress)
    }
  }

  // ── Final save
  console.log('\n\n💾 Saving database...')
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2))
  progress.totalProcessed += batch.length % SAVE_INTERVAL
  progress.lastRunDate = new Date().toISOString()
  progress.batchesCompleted++
  saveProgress(progress)

  // ── Stats
  stats.endTime = new Date().toISOString()
  stats.avgPriceOverall = allPrices.length > 0
    ? Math.round((allPrices.reduce((s, p) => s + p, 0) / allPrices.length) * 100) / 100
    : null

  console.log('\n📊 ===== RUN STATISTICS =====')
  console.log(`  Total items in DB:  ${stats.totalItems}`)
  console.log(`  Processed this run: ${stats.processed}`)
  console.log(`  Priced (found):     ${stats.priced}`)
  console.log(`  Skipped (fresh):    ${stats.skippedFresh}`)
  console.log(`  Skipped (no ID):    ${stats.skippedNoToyNum}`)
  console.log(`  Errors:             ${stats.errors}`)
  console.log(`  Avg price overall:  ${stats.avgPriceOverall ? '$' + stats.avgPriceOverall : 'N/A'}`)
  console.log(`  Remaining:          ${candidates.length - batch.length} items for next run`)

  // Save stats
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const statsFile = path.join(STATS_DIR, `ebay-price-stats-${timestamp}.json`)
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2))
  console.log(`\n💾 Stats saved: ${statsFile}`)

  console.log('\n✅ Done!')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
