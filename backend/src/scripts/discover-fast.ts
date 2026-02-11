/**
 * Fast discovery: gets ALL subcategory names from "Mainline Segment" and other root categories
 * Uses only subcategory listing (fast) - no page enumeration
 */
import axios from 'axios'
import fs from 'fs'

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function getAllSubcategories(category: string, cmcontinue?: string): Promise<string[]> {
  const params: Record<string, string> = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmtype: 'subcat',
    cmlimit: '500',
    format: 'json',
    formatversion: '2'
  }
  if (cmcontinue) params.cmcontinue = cmcontinue

  const response = await axios.get(FANDOM_API, { params })
  const members = response.data.query?.categorymembers || []
  const names = members.map((m: any) => m.title.replace(/^Category:/, ''))
  
  // Handle pagination
  if (response.data.continue?.cmcontinue) {
    await sleep(300)
    const more = await getAllSubcategories(category, response.data.continue.cmcontinue)
    names.push(...more)
  }
  
  return names
}

async function getAllPages(category: string, cmcontinue?: string): Promise<string[]> {
  const params: Record<string, string> = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmtype: 'page',
    cmlimit: '500',
    format: 'json',
    formatversion: '2'
  }
  if (cmcontinue) params.cmcontinue = cmcontinue

  const response = await axios.get(FANDOM_API, { params })
  const members = response.data.query?.categorymembers || []
  const names = members.map((m: any) => m.title)
  
  if (response.data.continue?.cmcontinue) {
    await sleep(300)
    const more = await getAllPages(category, response.data.continue.cmcontinue)
    names.push(...more)
  }
  
  return names
}

// Search for pages matching a pattern
async function searchPages(query: string): Promise<string[]> {
  const params = {
    action: 'query',
    list: 'search',
    srsearch: query,
    srnamespace: '0',
    srlimit: '50',
    format: 'json',
    formatversion: '2'
  }
  const response = await axios.get(FANDOM_API, { params })
  return (response.data.query?.search || []).map((r: any) => r.title)
}

async function main() {
  console.log('🔍 Fast discovery of ALL Hot Wheels series...\n')
  
  const allSeries = new Set<string>()
  const seriesBySource: Record<string, string[]> = {}
  
  const addSeries = (names: string[], source: string) => {
    seriesBySource[source] = names
    names.forEach(n => allSeries.add(n))
  }

  // 1. Get ALL subcategories of "Mainline Segment" (these are the series)
  console.log('📂 Fetching Mainline Segment subcategories...')
  const mainlineSubcats = await getAllSubcategories('Mainline Segment')
  addSeries(mainlineSubcats, 'Mainline Segment')
  console.log(`   Found ${mainlineSubcats.length} series\n`)
  await sleep(500)

  // 2. Get subcategories of other root categories
  const rootCategories = [
    'Hot Wheels series',
    'Premium lines',
    'Exclusives', 
    'Special Series',
    'Hot Wheels Segments',
    'Hot Wheels Premium',
    'Hot Wheels Collector',
    'RLC Exclusives',
    'Hot Wheels Classics',
    'Hot Wheels Convention Exclusives',
    'Car Culture',
    'Pop Culture (series)',
    'Team Transport',
    'Monster Trucks',
    'Hot Wheels id',
    'Hot Wheels Entertainment',
    'Hot Wheels Scale',
    'Larger Scale',
  ]

  for (const cat of rootCategories) {
    const subcats = await getAllSubcategories(cat)
    await sleep(300)
    if (subcats.length > 0) {
      addSeries(subcats, cat)
      console.log(`📂 ${cat}: ${subcats.length} subcategories`)
    }
    
    // Also get direct pages (some series are pages not subcategories)
    const pages = await getAllPages(cat)
    await sleep(300)
    if (pages.length > 0) {
      addSeries(pages, `${cat} (pages)`)
      console.log(`   📄 ${cat}: ${pages.length} pages`)
    }
  }

  // 3. Search for "List of YYYY Hot Wheels" pages  
  console.log('\n🔍 Searching for mainline year pages...')
  const yearPages: string[] = []
  for (let year = 1968; year <= 2026; year++) {
    const results = await searchPages(`"List of ${year} Hot Wheels"`)
    await sleep(200)
    for (const r of results) {
      if (r.includes(String(year)) && /list of.*hot wheels/i.test(r)) {
        yearPages.push(r)
        allSeries.add(r)
      }
    }
  }
  addSeries(yearPages, 'Mainline Year Pages')
  console.log(`   Found ${yearPages.length} year pages\n`)

  // 4. Search for other known pages 
  console.log('🔍 Searching for additional series pages...')
  const searchTerms = [
    'Hot Wheels Boulevard',
    'Retro Entertainment', 
    'Japan Historics',
    'Speed Machines',
    'Elite 64',
    'Red Line Club',
    'Super Treasure Hunt',
    'NFT Garage',
    'AcceleRacers',
    'Highway 35',
    'Fast & Furious Hot Wheels',
    'Mario Kart Hot Wheels',
    'Hot Wheels Star Wars',
    'Hot Wheels Marvel',
    'Hot Wheels Batman',
    'Sky Busters',
    'Track Stars',
    'Sizzlers Hot Wheels',
    'Gran Toros Hot Wheels',
    'Flying Colors Hot Wheels',
    'Real Riders series',
    'Larry\'s Garage',
    'Hot Wheels 100%',
    'Hot Wheels Since \'68',
    'Hot Wheels Nostalgia',
    'Hot Wheels Heritage',
  ]
  for (const term of searchTerms) {
    const results = await searchPages(term)
    await sleep(200)
    for (const r of results) {
      allSeries.add(r)
    }
  }

  // Output
  const sorted = Array.from(allSeries).sort()
  
  const output = {
    discoveredAt: new Date().toISOString(),
    totalSeries: sorted.length,
    allSeries: sorted,
    bySource: seriesBySource,
  }

  fs.mkdirSync('data', { recursive: true })
  fs.writeFileSync('data/discovered-series.json', JSON.stringify(output, null, 2))
  
  console.log('\n' + '='.repeat(70))
  console.log(`📊 TOTAL DISCOVERED: ${sorted.length} unique series/pages`)
  console.log('='.repeat(70))
  
  // Print by source
  console.log('\n📂 By source:')
  for (const [source, items] of Object.entries(seriesBySource)) {
    console.log(`  ${source}: ${items.length}`)
  }

  // Print all
  console.log('\n📋 All series:')
  for (const s of sorted) {
    console.log(`  - ${s}`)
  }
  
  console.log(`\n💾 Saved to data/discovered-series.json`)
}

main().catch(console.error)
