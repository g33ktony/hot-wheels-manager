/**
 * Hot Wheels Cache Service
 * Loads scraped data from local JSON file into memory for fast searching.
 * Both global search and public catalog search use this instead of MongoDB.
 */
import fs from 'fs'
import path from 'path'

export interface CachedHotWheelsCar {
  toy_num: string
  col_num: string
  carModel: string
  model?: string // alias used in older JSON format
  series: string
  series_num: string
  photo_url?: string
  year: string
  color?: string
  tampo?: string
  wheel_type?: string
  car_make?: string
  segment?: string
  country?: string
  base_color?: string
  window_color?: string
  interior_color?: string
  notes?: string
  pack_contents?: Array<{
    casting_name: string
    body_color?: string
    tampo?: string
    wheel_type?: string
    notes?: string
    photo_url?: string
  }>
}

const JSON_DB_PATH = path.join(__dirname, '../../data/hotwheels_database.json')

// In-memory cache
let cachedData: CachedHotWheelsCar[] = []
let lastLoadedAt: Date | null = null
let isLoaded = false

/**
 * Normalize a car entry from either scraper format or old JSON format
 */
function normalizeCar(car: any): CachedHotWheelsCar {
  return {
    toy_num: car.toy_num || '',
    col_num: car.col_num || '',
    carModel: car.carModel || car.model || '',
    model: car.model || car.carModel || '',
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
    base_color: car.base_color || '',
    window_color: car.window_color || '',
    interior_color: car.interior_color || '',
    notes: car.notes || '',
    pack_contents: car.pack_contents || undefined,
  }
}

/**
 * Load (or reload) the JSON file into memory
 */
export function loadCache(): void {
  try {
    if (!fs.existsSync(JSON_DB_PATH)) {
      console.warn('⚠️ hotwheels_database.json not found, cache is empty')
      cachedData = []
      isLoaded = true
      return
    }

    const raw = fs.readFileSync(JSON_DB_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed) ? parsed : (parsed.data || [])
    cachedData = items.map(normalizeCar)
    lastLoadedAt = new Date()
    isLoaded = true
    console.log(`✅ Hot Wheels cache loaded: ${cachedData.length} items (${lastLoadedAt.toISOString()})`)
  } catch (error: any) {
    console.error('❌ Error loading Hot Wheels cache:', error.message)
    cachedData = []
    isLoaded = true
  }
}

/**
 * Force-reload the cache from disk
 */
export function refreshCache(): void {
  console.log('🔄 Refreshing Hot Wheels cache...')
  loadCache()
}

/**
 * Get all cached data
 */
export function getAllCars(): CachedHotWheelsCar[] {
  if (!isLoaded) loadCache()
  return cachedData
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    count: cachedData.length,
    lastLoadedAt,
    isLoaded,
    filePath: JSON_DB_PATH,
  }
}

/**
 * Save an array of cars to the JSON file and refresh cache
 */
export function saveCarsToJSON(cars: any[]): void {
  const normalized = cars.map(normalizeCar)

  // Ensure data directory exists
  const dir = path.dirname(JSON_DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(normalized, null, 2), 'utf-8')
  console.log(`💾 Saved ${normalized.length} cars to ${JSON_DB_PATH}`)

  // Refresh in-memory cache
  refreshCache()
}

/**
 * Merge new scraped cars into existing JSON (upsert by toy_num)
 * Returns count of new entries added
 */
export function mergeCarsIntoJSON(newCars: any[]): number {
  if (!isLoaded) loadCache()

  // Build a map from existing data keyed by toy_num
  const existingMap = new Map<string, CachedHotWheelsCar>()
  for (const car of cachedData) {
    if (car.toy_num) {
      existingMap.set(car.toy_num, car)
    }
  }

  let newCount = 0
  for (const car of newCars) {
    const normalized = normalizeCar(car)
    if (!normalized.toy_num && !normalized.carModel) continue

    const key = normalized.toy_num || `${normalized.carModel}-${normalized.year}-${normalized.series}`
    if (!existingMap.has(key)) {
      existingMap.set(key, normalized)
      newCount++
    } else {
      // Update existing entry with any new non-empty fields
      const existing = existingMap.get(key)!
      for (const [field, value] of Object.entries(normalized)) {
        if (value && !(existing as any)[field]) {
          (existing as any)[field] = value
        }
      }
    }
  }

  // Save merged data
  const merged = Array.from(existingMap.values())
  saveCarsToJSON(merged)

  return newCount
}

// ---------- Search helpers ----------

/**
 * Bigram similarity for fuzzy matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1.includes(s2) || s2.includes(s1)) return 0.85

  const chars1 = new Set(s1.split(''))
  const chars2 = new Set(s2.split(''))
  const intersection = new Set([...chars1].filter(x => chars2.has(x)))
  const charSimilarity = (intersection.size * 2) / (chars1.size + chars2.size)

  const bigrams1: string[] = []
  const bigrams2: string[] = []
  for (let i = 0; i < s1.length - 1; i++) bigrams1.push(s1.substring(i, i + 2))
  for (let i = 0; i < s2.length - 1; i++) bigrams2.push(s2.substring(i, i + 2))

  if (bigrams1.length === 0 || bigrams2.length === 0) return charSimilarity

  const bs1 = new Set(bigrams1)
  const bs2 = new Set(bigrams2)
  const bigramIntersection = new Set([...bs1].filter(x => bs2.has(x)))
  const bigramSimilarity = (bigramIntersection.size * 2) / (bs1.size + bs2.size)

  return charSimilarity * 0.3 + bigramSimilarity * 0.7
}

/**
 * Fuzzy match a car against a search term
 */
export function fuzzyMatchCar(car: CachedHotWheelsCar, searchTerm: string, baseThreshold = 0.45): { match: boolean; score: number } {
  const searchLower = searchTerm.toLowerCase().trim()
  if (!searchLower) return { match: false, score: 0 }

  const dynamicThreshold = searchLower.length <= 4
    ? Math.max(baseThreshold + 0.25, 0.7)
    : baseThreshold

  const fieldsWithWeights = [
    { field: car.carModel || car.model || '', weight: 1.0 },
    { field: car.series || '', weight: 0.8 },
    { field: car.car_make || '', weight: 0.9 },
    { field: car.year || '', weight: 0.6 },
    { field: car.toy_num || '', weight: 0.5 },
    { field: car.col_num || '', weight: 0.4 },
    { field: car.series_num || '', weight: 0.4 },
  ]

  let maxScore = 0
  let bestField = ''

  for (const { field, weight } of fieldsWithWeights) {
    const fieldLower = field.toLowerCase()
    if (!fieldLower) continue

    let fieldScore = 0
    if (fieldLower === searchLower) return { match: true, score: 1.0 }
    if (fieldLower.includes(searchLower)) {
      fieldScore = 0.95
    } else {
      fieldScore = calculateSimilarity(fieldLower, searchLower)
    }

    const weighted = fieldScore * weight
    if (weighted > maxScore) {
      maxScore = weighted
      bestField = field
    }
  }

  if (bestField === (car.carModel || car.model || '') || bestField === (car.car_make || '')) {
    maxScore = Math.min(maxScore * 1.1, 1.0)
  }

  const effectiveThreshold = maxScore >= 0.9 ? 0.45 : dynamicThreshold
  return { match: maxScore >= effectiveThreshold, score: maxScore }
}

/**
 * Search the cache with fuzzy matching, pagination, and filters
 */
export function searchCache(options: {
  search?: string
  year?: string
  series?: string
  page?: number
  limit?: number
}): { cars: CachedHotWheelsCar[]; total: number } {
  if (!isLoaded) loadCache()

  const { search = '', year, series, page = 1, limit = 100 } = options
  const skip = (page - 1) * limit
  const searchTerm = search.trim()

  // Pre-filter by year and series
  let filtered = cachedData
  if (year) {
    filtered = filtered.filter(c => c.year === year)
  }
  if (series) {
    const seriesLower = series.toLowerCase()
    filtered = filtered.filter(c => (c.series || '').toLowerCase().includes(seriesLower))
  }

  if (!searchTerm) {
    // No search - sort by year desc
    const sorted = [...filtered].sort((a, b) => {
      const yA = parseInt(a.year) || 0
      const yB = parseInt(b.year) || 0
      if (yB !== yA) return yB - yA
      return (a.carModel || a.model || '').localeCompare(b.carModel || b.model || '')
    })
    return {
      cars: sorted.slice(skip, skip + limit),
      total: sorted.length,
    }
  }

  // Fuzzy search
  const searchLower = searchTerm.toLowerCase()

  // Fast pre-filter with substring match
  let candidates = filtered.filter(c => {
    const model = (c.carModel || c.model || '').toLowerCase()
    const ser = (c.series || '').toLowerCase()
    const make = (c.car_make || '').toLowerCase()
    const toyNum = (c.toy_num || '').toLowerCase()
    return model.includes(searchLower) || ser.includes(searchLower) || make.includes(searchLower) || toyNum.includes(searchLower)
  })

  // Score and sort
  let scored = candidates.map(car => {
    const { score } = fuzzyMatchCar(car, searchTerm, 0.45)
    return { car, score }
  }).filter(r => r.score >= 0.45)

  // If no pre-filter hits, do full fuzzy scan (limited)
  if (scored.length === 0) {
    const fullScan = filtered.slice(0, 5000)
    scored = fullScan.map(car => {
      const { match, score } = fuzzyMatchCar(car, searchTerm, 0.45)
      return { car, score, match }
    }).filter(r => r.score >= 0.45)
  }

  scored.sort((a, b) => b.score - a.score)

  return {
    cars: scored.slice(skip, skip + limit).map(r => r.car),
    total: scored.length,
  }
}

/**
 * Get all distinct series from cache
 */
export function getDistinctSeries(): string[] {
  if (!isLoaded) loadCache()
  const series = new Set<string>()
  for (const car of cachedData) {
    if (car.series) series.add(car.series)
  }
  return Array.from(series).sort()
}

/**
 * Get all distinct years from cache
 */
export function getDistinctYears(): string[] {
  if (!isLoaded) loadCache()
  const years = new Set<string>()
  for (const car of cachedData) {
    if (car.year) years.add(car.year)
  }
  return Array.from(years).sort().reverse()
}

// Auto-load cache on import
loadCache()
