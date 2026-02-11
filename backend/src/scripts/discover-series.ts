/**
 * Discover ALL Hot Wheels series pages from the Fandom wiki
 * Uses the MediaWiki API to enumerate categories and subcategories
 * Outputs a comprehensive list of series page names
 */
import axios from 'axios'
import fs from 'fs'

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const DELAY_MS = 600
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Top-level categories to explore
const ROOT_CATEGORIES = [
  'Hot Wheels',
  'Hot Wheels series',
  'Mainline',
  'Hot Wheels Mainline',
  'Segments',
  'Mainline Segments',
  'Sub-series',
  'Series',
  'Premium lines',
  'Premium Series',
  'Hot Wheels Premium',
  'Exclusives',
  'Special Series',
  'Red Line Club',
  'RLC',
  'Elite 64',
  'Treasure Hunts',
  'Super Treasure Hunts',
  'Convention',
  'Car Culture',
  'Pop Culture',
  'Retro Entertainment',
  'Team Transport',
  'AcceleRacers',
  'Highway 35',
  'Monster Trucks',
  'Track Stars',
  'Hot Wheels id',
  'Hot Wheels Classics',
  'Larry\'s Garage',
  'Boulevard',
  'Speed Machines',
  'Vintage',
  'Flying Colors',
  'Real Riders',
  'Blackwall',
  'The Hot Ones',
  'Sizzlers',
  'Gran Toros',
  'Hot Wheels by year',
  'Hot Wheels by series',
  'Lists of Hot Wheels',
  // Themed
  'Batman',
  'Star Wars',
  'Marvel',
  'DC Comics',
  'Mario Kart',
  'Fast & Furious',
  'Forza',
  'Gran Turismo',
  // Scale
  '1:18 scale',
  '1:43 scale',
  '1:50 scale',
  // Modern sub-series
  'HW Exotics',
  'HW Art Cars', 
  'Nightburnerz',
  'Muscle Mania',
  'Then and Now',
  'Factory Fresh',
  'HW Flames',
  'Rod Squad',
  'HW Hot Trucks',
  'HW Race Day',
  'Experimotors',
  'HW Screen Time',
  'HW City',
  'HW Off-Road',
  'HW Race',
  'HW Workshop',
  'HW Imagination',
  'Baja Blazers',
  'HW Green Speed',
  'HW Dream Garage',
  'HW Speed Graphics',
  'HW Metro',
  'Street Beasts',
  'Tooned',
  'HW Sports',
  'HW Turbo',
  'HW Rescue',
  'HW Glow Racers',
  'HW Drag Strip',
  'HW Contoured',
  'HW Wagons',
  'Compact Kings',
  'HW Roadsters',
  'HW J-Imports',
  'Speed Blur',
  'Super Chromes',
  'Dino Riders',
  'HW Daredevils',
  'HW Showroom',
  'HW Getaways',
  'HW Braking',
  'HW Modified',
  'HW Slammed',
  'HW Ride-Ons',
  'HW Space',
  'HW Torque',
  'HW City Works',
  'Checkmate',
  'HW Legends Tour',
]

interface DiscoveredPage {
  title: string
  source: string  // which category it came from
}

const discoveredPages = new Map<string, DiscoveredPage>()
const discoveredCategories = new Set<string>()
const exploredCategories = new Set<string>()

/**
 * Get subcategories of a category
 */
async function getSubcategories(category: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmtype: 'subcat',
    cmlimit: '500',
    format: 'json',
    formatversion: '2'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const members = response.data.query?.categorymembers || []
    return members.map((m: any) => m.title.replace(/^Category:/, ''))
  } catch {
    return []
  }
}

/**
 * Get pages in a category
 */
async function getCategoryPages(category: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmtype: 'page',
    cmlimit: '500',
    format: 'json',
    formatversion: '2'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const members = response.data.query?.categorymembers || []
    return members.map((m: any) => m.title)
  } catch {
    return []
  }
}

/**
 * Check if a page has wikitext tables (likely a series listing)
 */
async function pageHasTables(title: string): Promise<boolean> {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    formatversion: '2',
    rvsection: '0' // Just first section to be fast
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const page = response.data.query?.pages?.[0]
    const content = page?.revisions?.[0]?.content || ''
    return content.includes('{|')
  } catch {
    return false
  }
}

/**
 * Search for pages matching a query
 */
async function searchPages(query: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srnamespace: '0',
    srlimit: '50',
    format: 'json',
    formatversion: '2'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const results = response.data.query?.search || []
    return results.map((r: any) => r.title)
  } catch {
    return []
  }
}

/**
 * Explore a category recursively (1 level deep to avoid explosion)
 */
async function exploreCategory(category: string, depth: number = 0) {
  if (exploredCategories.has(category) || depth > 2) return
  exploredCategories.add(category)

  // Get pages in this category
  const pages = await getCategoryPages(category)
  await sleep(DELAY_MS)

  for (const page of pages) {
    if (!discoveredPages.has(page)) {
      discoveredPages.set(page, { title: page, source: category })
    }
  }

  if (pages.length > 0) {
    console.log(`  📂 ${category}: ${pages.length} pages`)
  }

  // Get subcategories
  if (depth < 2) {
    const subcats = await getSubcategories(category)
    await sleep(DELAY_MS)

    for (const subcat of subcats) {
      discoveredCategories.add(subcat)
      await exploreCategory(subcat, depth + 1)
      await sleep(DELAY_MS)
    }
  }
}

/**
 * Filter pages that are likely series listings (have tables with vehicle data)
 */
function isLikelySeriesPage(title: string): boolean {
  // Include pages that match series patterns
  const patterns = [
    /^list of \d{4} hot wheels/i,
    /^hw /i,
    /series$/i,
    /\(series\)$/i,
    /\(toy line\)$/i,
    /mainline/i,
    /segment/i,
    /treasure hunt/i,
    /elite 64/i,
    /red line club/i,
    /car culture/i,
    /pop culture/i,
    /team transport/i,
    /retro entertainment/i,
    /boulevard/i,
    /speed machines/i,
    /track stars/i,
    /monster truck/i,
    /sky busters/i,
    /hot wheels id/i,
    /classics/i,
    /convention/i,
    /premium/i,
    /fast & furious/i,
    /mario kart/i,
    /batman/i,
    /star wars/i,
    /marvel/i,
    /forza/i,
    /gran turismo/i,
    /acceleracers/i,
    /highway 35/i,
    /sizzlers/i,
    /gran toros/i,
    /flying colors/i,
    /real riders/i,
    /blackwall/i,
  ]

  // Exclude individual car pages, user pages, etc.
  const excludePatterns = [
    /^user:/i,
    /^talk:/i,
    /^template:/i,
    /^file:/i,
    /^category:/i,
    /^Special:/i,
    /gallery$/i,
    /\(casting\)$/i,  // individual car castings
  ]

  if (excludePatterns.some(p => p.test(title))) return false
  if (patterns.some(p => p.test(title))) return true

  return false
}

async function discoverAllSeries() {
  console.log('🔍 Discovering ALL Hot Wheels series from Fandom wiki...\n')

  // Step 1: Explore root categories
  console.log('📂 Step 1: Exploring categories...\n')
  for (const cat of ROOT_CATEGORIES) {
    await exploreCategory(cat, 0)
    await sleep(DELAY_MS)
  }

  console.log(`\n📊 Found ${discoveredPages.size} pages from ${exploredCategories.size} categories`)
  console.log(`📊 Also discovered ${discoveredCategories.size} subcategories\n`)

  // Step 2: Search for "List of YYYY Hot Wheels" pages
  console.log('🔍 Step 2: Searching for mainline year pages...\n')
  for (let year = 1968; year <= 2026; year++) {
    const results = await searchPages(`List of ${year} Hot Wheels`)
    await sleep(DELAY_MS)
    for (const page of results) {
      if (page.includes(`${year}`) && page.toLowerCase().includes('hot wheels')) {
        discoveredPages.set(page, { title: page, source: 'search-mainline' })
      }
    }
  }

  // Step 3: Search for known series names
  console.log('🔍 Step 3: Searching for known series...\n')
  const searchTerms = [
    'Hot Wheels series',
    'mainline segment',
    'Hot Wheels sub-series',
    'Hot Wheels premium',
    'Hot Wheels exclusive',
    'Hot Wheels convention',
    'Hot Wheels treasure hunt',
    'HW mainline',
  ]
  for (const term of searchTerms) {
    const results = await searchPages(term)
    await sleep(DELAY_MS)
    for (const page of results) {
      discoveredPages.set(page, { title: page, source: `search: ${term}` })
    }
  }

  console.log(`\n📊 Total discovered: ${discoveredPages.size} pages\n`)

  // Step 4: Filter to likely series pages
  const allPages = Array.from(discoveredPages.values()).map(p => p.title).sort()
  
  // Save ALL discovered pages
  const output = {
    discoveredAt: new Date().toISOString(),
    totalPages: allPages.length,
    categoriesExplored: exploredCategories.size,
    subcategoriesFound: discoveredCategories.size,
    allPages: allPages,
    bySource: {} as Record<string, string[]>
  }

  // Group by source
  for (const [title, data] of discoveredPages) {
    if (!output.bySource[data.source]) output.bySource[data.source] = []
    output.bySource[data.source].push(title)
  }

  const outputPath = 'data/discovered-series.json'
  fs.mkdirSync('data', { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`💾 Saved to ${outputPath}\n`)

  // Print summary
  console.log('='.repeat(70))
  console.log('📋 ALL DISCOVERED PAGES:')
  console.log('='.repeat(70))
  for (const page of allPages) {
    console.log(`  - ${page}`)
  }
  console.log(`\n📊 Total: ${allPages.length} pages`)

  // Print top sources
  console.log('\n📂 Pages by source category:')
  const sources = Object.entries(output.bySource).sort((a, b) => b[1].length - a[1].length)
  for (const [source, pages] of sources.slice(0, 20)) {
    console.log(`  ${source}: ${pages.length} pages`)
  }
}

discoverAllSeries().catch(console.error)
