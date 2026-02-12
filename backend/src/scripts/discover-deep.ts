/**
 * Deep discovery: comprehensively find ALL wiki pages that contain vehicle TABLES.
 * 
 * Strategy:
 * 1. Crawl root categories 2 levels deep, collecting SUBCATEGORY NAMES (not individual pages)
 *    → subcategory names are typically series names and have vehicle tables
 * 2. Get "List of YYYY Hot Wheels" pages for mainlines
 * 3. Get all "HW " prefix pages (segment names)  
 * 4. Search for known series names
 * 5. Get all "List of" pages related to Hot Wheels
 * 
 * Does NOT collect individual car pages from categories — those are handled
 * by the scraper when it parses tables in series pages.
 */
import axios from 'axios'
import fs from 'fs'
import path from 'path'

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const DELAY = 300

let apiCalls = 0

async function apiGet(params: Record<string, string>): Promise<any> {
  apiCalls++
  if (apiCalls % 100 === 0) {
    process.stdout.write(`  [${apiCalls} API calls...]\n`)
  }
  const response = await axios.get(FANDOM_API, { params: { ...params, format: 'json', formatversion: '2' } })
  await sleep(DELAY)
  return response.data
}

/**
 * Get all subcategories of a category (with pagination)
 */
async function getSubcategories(category: string): Promise<string[]> {
  const all: string[] = []
  let cmcontinue: string | undefined

  do {
    const params: Record<string, string> = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmtype: 'subcat',
      cmlimit: '500',
    }
    if (cmcontinue) params.cmcontinue = cmcontinue

    const data = await apiGet(params)
    const members = data.query?.categorymembers || []
    all.push(...members.map((m: any) => m.title.replace(/^Category:/, '')))
    cmcontinue = data.continue?.cmcontinue
  } while (cmcontinue)

  return all
}

/**
 * Get all pages in a category (with pagination)
 */
async function getCategoryPages(category: string): Promise<string[]> {
  const all: string[] = []
  let cmcontinue: string | undefined

  do {
    const params: Record<string, string> = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmtype: 'page',
      cmlimit: '500',
    }
    if (cmcontinue) params.cmcontinue = cmcontinue

    const data = await apiGet(params)
    const members = data.query?.categorymembers || []
    all.push(...members.map((m: any) => m.title))
    cmcontinue = data.continue?.cmcontinue
  } while (cmcontinue)

  return all
}

/**
 * Recursively get all subcategories down to maxDepth
 */
async function getSubcategoriesRecursive(
  rootCategory: string,
  maxDepth: number,
  visited: Set<string> = new Set()
): Promise<string[]> {
  if (maxDepth <= 0 || visited.has(rootCategory)) return []
  visited.add(rootCategory)

  const subcats = await getSubcategories(rootCategory)
  const all = [...subcats]

  for (const sub of subcats) {
    if (!visited.has(sub)) {
      const deeper = await getSubcategoriesRecursive(sub, maxDepth - 1, visited)
      all.push(...deeper)
    }
  }

  return all
}

/**
 * Search for pages matching a query
 */
async function searchPages(query: string, limit = 50): Promise<string[]> {
  const data = await apiGet({
    action: 'query',
    list: 'search',
    srsearch: query,
    srnamespace: '0',
    srlimit: String(limit),
  })
  return (data.query?.search || []).map((r: any) => r.title)
}

/**
 * Check if a page has tables (quick check via parse API)
 */
async function pageHasTables(pageTitle: string): Promise<boolean> {
  try {
    const data = await apiGet({
      action: 'query',
      titles: pageTitle,
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      rvsection: '0', // just first section to speed up
    })
    const page = data.query?.pages?.[0]
    if (!page?.revisions?.[0]) return false
    const content = page.revisions[0].content || page.revisions[0].slots?.main?.content || ''
    return content.includes('{|')
  } catch {
    return false
  }
}

async function main() {
  console.log('🔍 DEEP Discovery of ALL Hot Wheels series & pages...\n')
  const startTime = Date.now()

  const allSeriesPages = new Set<string>()
  const allMainlineLists = new Set<string>()

  // ================================================================
  // 1. CRAWL ROOT CATEGORIES — collect subcategory names (2 levels)
  //    Subcategory names = series names = pages with vehicle tables
  // ================================================================
  const rootCategories = [
    'Mainline Segment',
    'Hot Wheels Segments',
    'Hot Wheels Premium',
    'Premium lines',
    'Exclusives',
    'Special Series',
    'Hot Wheels Collector',
    'RLC Exclusives',
    'Hot Wheels Classics',
    'Hot Wheels Convention Exclusives',
    'Car Culture',
    'Team Transport',
    'Hot Wheels id',
    'Hot Wheels Entertainment',
    'Hot Wheels Scale',
    'Larger Scale',
    'Monster Trucks',
    'Hot Wheels Racing',
    'Multi-Packs',
    'Color Shifters',
    'Treasure Hunts',
    'Super Treasure Hunts',
    'Track Stars',
    'Sky Busters',
    'Hot Wheels City',
    'Hot Wheels Action',
    'Hot Wheels series',
    'Mainline',
    'Hot Wheels Mainline',
  ]

  console.log(`📂 Step 1: Crawling ${rootCategories.length} root categories (2 levels)...\n`)

  const visitedCats = new Set<string>()
  
  for (const root of rootCategories) {
    process.stdout.write(`  📂 ${root}...`)
    
    // Get subcategories (2 levels deep)
    const subcats = await getSubcategoriesRecursive(root, 2, visitedCats)
    
    // Each subcategory name is likely a series page
    for (const sub of subcats) {
      allSeriesPages.add(sub)
    }
    
    // Also get DIRECT PAGES from root category (not sub-subcategories)
    // These are often series pages too (e.g. "List of 2024 Hot Wheels")
    const rootDirectPages = await getCategoryPages(root)
    for (const page of rootDirectPages) {
      if (isLikelySeriesPage(page)) {
        allSeriesPages.add(page)
        if (/^List of \d{4}/i.test(page)) {
          allMainlineLists.add(page)
        }
      }
    }
    
    console.log(` ${subcats.length} subcats, ${rootDirectPages.filter(p => isLikelySeriesPage(p)).length} series pages`)
  }

  // ================================================================
  // 2. YEAR-SPECIFIC LISTS (1968–2026)
  // ================================================================
  console.log('\n🔍 Step 2: Searching for mainline year pages (1968-2026)...')
  for (let year = 1968; year <= 2026; year++) {
    const results = await searchPages(`"List of ${year} Hot Wheels"`)
    for (const r of results) {
      if (r.includes(String(year)) && /list of.*hot wheels/i.test(r)) {
        allMainlineLists.add(r)
        allSeriesPages.add(r)
      }
    }
  }
  console.log(`   Found ${allMainlineLists.size} mainline year pages`)

  // ================================================================
  // 3. ALL "List of" PAGES
  // ================================================================
  console.log('\n🔍 Step 3: Fetching all "List of" pages...')
  let apcontinue: string | undefined
  do {
    const params: Record<string, string> = {
      action: 'query',
      list: 'allpages',
      apprefix: 'List of',
      aplimit: '500',
      apnamespace: '0',
    }
    if (apcontinue) params.apcontinue = apcontinue

    const data = await apiGet(params)
    const pages = data.query?.allpages || []
    for (const p of pages) {
      if (/hot wheels/i.test(p.title)) {
        allSeriesPages.add(p.title)
        if (/\d{4}/.test(p.title)) {
          allMainlineLists.add(p.title)
        }
      }
    }
    apcontinue = data.continue?.apcontinue
  } while (apcontinue)

  // ================================================================
  // 4. ALL "HW " PREFIX PAGES (segment names like HW Turbo, HW Flames)
  // ================================================================
  console.log('🔍 Step 4: Fetching all "HW " prefix pages...')
  apcontinue = undefined
  do {
    const params: Record<string, string> = {
      action: 'query',
      list: 'allpages',
      apprefix: 'HW ',
      aplimit: '500',
      apnamespace: '0',
    }
    if (apcontinue) params.apcontinue = apcontinue

    const data = await apiGet(params)
    const pages = data.query?.allpages || []
    for (const p of pages) {
      allSeriesPages.add(p.title)
    }
    apcontinue = data.continue?.apcontinue
  } while (apcontinue)

  // ================================================================
  // 5. SEARCH for known series by name
  // ================================================================
  console.log('🔍 Step 5: Searching for known series...')
  const knownSearchTerms = [
    'Hot Wheels Boulevard', 'Retro Entertainment', 'Japan Historics',
    'Speed Machines', 'Elite 64', 'Red Line Club', 'NFT Garage',
    'AcceleRacers', 'Highway 35 World Race', 'Fast & Furious',
    'Mario Kart', 'Star Wars Starships', 'Marvel Character Cars',
    'Batman', 'Jurassic World', 'Forza', 'Gran Turismo',
    'Flying Colors', 'Real Riders', 'Larry\'s Garage',
    'Since \'68', 'Nostalgia', 'Heritage', 'Hot Wheels 100%',
    'Car Culture', 'Team Transport', 'Pop Culture',
    'Replica Entertainment', 'Character Cars', 'Color Shifters',
    'Cool Classics', 'Vintage Racing', 'Dragstrip Demons',
    'Collector Edition', 'Flying Customs', 'Pro Racing',
    'Pearl and Chrome', '50th Anniversary', 'Throwback',
    'Cop Rods', 'Fire Rods', 'Fright Cars', 'Halloween Cars',
    'Holiday Hot Rods', 'Easter', 'Spring', 'Neon Speeders',
    'Stars & Stripes', 'Pride Rides', 'Hot Wheels Racing',
    'Formula One', 'Delivery', 'Volkswagen', 'Porsche',
    'Auto Affinity', 'Hot Wheels Garage', 'Hall of Fame',
    'Track Stars', 'Sky Busters', 'Super Rigs',
    'Sizzlers', 'Gran Toros', 'RRRumblers', 'Redlines',
    'Hot Birds', 'Hot Line', 'Scorchers', 'Zowees',
    'Action Packs', 'Crack-Ups', 'Color FX', 'Flip Outs',
    'Baja Blazers', 'Nightburnerz', 'Muscle Mania', 'Tooned',
    'Factory Fresh', 'Then And Now', 'Experimotors', 'Rod Squad',
    'HW Exotics', 'HW Turbo', 'HW Flames', 'HW Art Cars',
    'HW Race Day', 'HW Speed Graphics', 'HW Metro',
    'HW Hot Trucks', 'HW J-Imports', 'HW Green Speed',
    'HW Screen Time', 'HW Rescue', 'HW Drift',
    'HW Glow Racers', 'HW Drag Strip', 'HW Compact Kings',
    'HW Contoured', 'HW Horsepower', 'HW Roadsters',
    'Dino Riders', 'X-Raycers', 'Pure Muscle',
    'Mattel Creations', 'RacerVerse', 'Monster Trucks',
    'Gift Pack Hot Wheels', '5-Pack Hot Wheels', '9-Pack',
    'Collector Numbers', 'Hot Wheels 1:87',
    'Rapid Transit', 'Track Fleet', 'Speed Cycles',
  ]

  for (const term of knownSearchTerms) {
    const results = await searchPages(term, 30)
    for (const r of results) {
      if (isLikelySeriesPage(r)) {
        allSeriesPages.add(r)
      }
    }
  }

  // ================================================================
  // RESULTS
  // ================================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)

  // Separate mainline lists from series pages
  const sortedMainline = Array.from(allMainlineLists).sort()
  const sortedSeriesOnly = Array.from(allSeriesPages)
    .filter(p => !allMainlineLists.has(p))
    .sort()
  const totalAll = sortedMainline.length + sortedSeriesOnly.length

  console.log('\n' + '='.repeat(70))
  console.log(`🎉 DEEP DISCOVERY COMPLETE in ${elapsed}s`)
  console.log('='.repeat(70))
  console.log(`   📊 API calls: ${apiCalls}`)
  console.log(`   📋 Mainline year lists: ${sortedMainline.length}`)
  console.log(`   📄 Series/other pages: ${sortedSeriesOnly.length}`)
  console.log(`   📊 TOTAL: ${totalAll}`)
  console.log()

  // Save raw discovery
  const rawPath = path.join(__dirname, '../../data/discovered-deep.json')
  fs.mkdirSync(path.dirname(rawPath), { recursive: true })
  fs.writeFileSync(rawPath, JSON.stringify({
    discoveredAt: new Date().toISOString(),
    totalPages: totalAll,
    mainlineLists: sortedMainline,
    seriesPages: sortedSeriesOnly,
    apiCalls,
    elapsedSeconds: parseInt(elapsed),
  }, null, 2))
  console.log(`💾 Saved raw to data/discovered-deep.json`)

  // Update filtered-series.json (used by scrape-intelligent.ts)
  const filteredPath = path.join(__dirname, '../../data/filtered-series.json')
  fs.writeFileSync(filteredPath, JSON.stringify({
    totalFiltered: totalAll,
    seriesPages: sortedSeriesOnly,
    mainlineLists: sortedMainline,
    mergedAt: new Date().toISOString(),
  }, null, 2))
  console.log(`💾 Updated data/filtered-series.json (${totalAll} pages ready for scraper)`)
}

/**
 * Heuristic: is this page title likely a series/list page?
 * Returns false only for pages that are CLEARLY individual cars or non-vehicle content.
 */
function isLikelySeriesPage(title: string): boolean {
  const lower = title.toLowerCase()
  
  // Skip wiki meta pages
  if (lower.startsWith('user:') || lower.startsWith('template:') || 
      lower.startsWith('category:') || lower.startsWith('file:') ||
      lower.startsWith('talk:') || lower.startsWith('module:')) return false
  
  // Skip disambiguation
  if (lower.includes('(disambiguation)')) return false
  
  // Skip obvious non-vehicle pages
  if (/^timeline of/i.test(title)) return false
  if (/^wheel types/i.test(title)) return false
  
  // Include everything else — the scraper will handle pages with no tables gracefully
  return true
}

main().catch(console.error)
