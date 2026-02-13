/**
 * Adds granular segment classification to hotwheels_database.json
 * 
 * Segments: mainline, premium, fast_furious, elite_64, rlc, sth, th, monster_truck, other
 * 
 * Run: npx tsx src/scripts/classify-segments.ts
 */
import fs from 'fs'
import path from 'path'

const DB_PATH = path.resolve(__dirname, '../../data/hotwheels_database.json')

/**
 * Classifies a series into a granular segment.
 * Order matters — most specific matches first.
 */
function classifySegment(series: string): string {
  if (!series) return 'mainline'
  const s = series.toLowerCase()

  // ─── SUPER TREASURE HUNT ─────────────────────────────
  if (
    s.includes('super treasure hunt') ||
    s === 'sth' ||
    s.includes('super treasure huntNew in Mainline'.toLowerCase()) ||
    /\bsth\b/.test(s)
  ) return 'sth'

  // ─── TREASURE HUNT ───────────────────────────────────
  if (
    s.includes('treasure hunt') ||
    s === 'th' ||
    /\bth\b/.test(s)
  ) return 'th'

  // ─── ELITE 64 ────────────────────────────────────────
  if (s.includes('elite 64') || s.includes('elite64')) return 'elite_64'

  // ─── RLC (Red Line Club) ─────────────────────────────
  if (
    s === 'rlc' ||
    s.startsWith('rlc ') ||
    s.endsWith(' rlc') ||
    s.includes('rlc party') ||
    s.includes('rlc exclusive') ||
    s.includes('red line club') ||
    s.includes('redline club') ||
    s.includes('rlc rewards') ||
    s.includes('rlc membership') ||
    /\brlc\b/.test(s)
  ) return 'rlc'

  // ─── FAST & FURIOUS ──────────────────────────────────
  if (
    s.includes('fast & furious') ||
    s.includes('fast and furious') ||
    s.includes('fast furious')
  ) return 'fast_furious'

  // ─── PREMIUM lines ───────────────────────────────────
  const premiumPatterns = [
    'car culture', 'boulevard', 'pop culture', 'team transport',
    'speed machines', '100% hot wheels',
    'hot wheels classics', 'cool classics', 'hot wheels garage',
    'convention', 'dragstrip demons', 'real riders',
    "since '68", 'since 68', 'g-machines', 'auto affinity',
    'oil can', 'neo-classics', 'hall of fame', "larry's garage",
    'hot wheels heritage', 'modern classics', 'japan historics',
    'vintage racing', 'cargo carriers',
    'slide street', 'car culture 2-pack', 'culture 2-pack',
    'hot wheels id', 'hot wheels premium',
    'flying customs', 'premium box set', 'premium set',
    'cruise boulevard', 'retro entertainment',
    'replica entertainment',
    'hot wheels garage (2010', 'hot wheels garage (2011',
    'holiday hot rods',
  ]
  for (const p of premiumPatterns) {
    if (s.includes(p)) return 'premium'
  }
  if (/^\d{4}\s+car culture/i.test(s)) return 'premium'
  if (/car\s*culture\s*\d{4}/i.test(s)) return 'premium'

  // ─── MONSTER TRUCKS ──────────────────────────────────
  if (s.includes('monster truck') || s.includes('monster jam')) return 'monster_truck'

  // ─── OTHER (non-standard 1:64 products) ──────────────
  const otherPatterns = [
    'racerverse', 'skate', 'character car', 'starship',
    'star wars', 'marvel', 'dc character',
    'disney character', 'mario kart', 'color shifter',
    'color changer', 'color reveal', 'color fx',
    'pull-back', 'pull back', 'action pack',
    'acceleracers', 'battle force', 'world race',
    '1:18 scale', '1:43 scale', '1:50 scale',
    'micro hot wheels', 'charawheels', 'crashers',
    'prototype poster', 'super rigs', 'racing rig',
    'haulers', 'highway hauler', 'hiway hauler',
    'attack pack', 'power command', 'motorized',
    'sto & go', 'track set', 'track builder',
    'battle rollers', 'moto', 'batman 1:50',
  ]
  for (const p of otherPatterns) {
    if (s.includes(p)) return 'other'
  }

  // ─── MAINLINE ────────────────────────────────────────
  if (/^list of \d{4} hot wheels/i.test(s)) return 'mainline'
  if (/^\d{4} hot wheels$/i.test(s)) return 'mainline'
  if (/^\d{4} (first edition|new model|open stock)/i.test(s)) return 'mainline'
  if (/first edition/i.test(s)) return 'mainline'
  if (/new model/i.test(s)) return 'mainline'
  if (/^hw\s/i.test(s)) return 'mainline'

  const mainlinePatterns = [
    'muscle mania', 'then and now', 'nightburnerz', 'night burnerz',
    'street beast', 'x-raycers', 'experimotors', 'tooned',
    'track stars', 'track aces', 'heat fleet', 'all stars',
    'factory fresh', 'super chromes', 'faster than ever',
    'baja blazer', 'rod squad', 'dino rider', 'fast foodie',
    'fright cars', 'checkmate', 'holiday racer', 'mystery cars',
    'digital circuit', 'crew choice', 'speed blur',
    'workshop', 'city works', 'race world',
    'red edition', 'green edition', 'blue edition',
    'kmart', 'walmart', 'target exclusive',
    'mainline', 'basic',
  ]
  for (const p of mainlinePatterns) {
    if (s.includes(p)) return 'mainline'
  }

  // Yearly series patterns "2024 ..." (not car culture/pop culture)
  if (/^\d{4}\s/.test(s) && !s.includes('car culture') && !s.includes('pop culture')) return 'mainline'

  // Default
  return 'mainline'
}

// ─── Main ──────────────────────────────────────────────
console.log('📊 Classifying segments in hotwheels_database.json...')
const data: any[] = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))

const stats: Record<string, number> = {}

for (const car of data) {
  car.segment = classifySegment(car.series || '')
  stats[car.segment] = (stats[car.segment] || 0) + 1
}

fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))

console.log(`\n✅ Classified ${data.length} items:\n`)
const order = ['mainline', 'premium', 'fast_furious', 'elite_64', 'rlc', 'sth', 'th', 'monster_truck', 'other']
for (const seg of order) {
  const count = stats[seg] || 0
  const pct = (100 * count / data.length).toFixed(1)
  const label = seg.padEnd(14)
  console.log(`   ${label} ${String(count).padStart(6)} (${pct}%)`)
}

// Show series samples per segment
for (const seg of order) {
  const seriesInSeg = new Set<string>()
  for (const c of data) {
    if (c.segment === seg) seriesInSeg.add(c.series)
  }
  console.log(`\n📋 ${seg} (${seriesInSeg.size} series):`)
  Array.from(seriesInSeg).sort().slice(0, 8).forEach(s => console.log(`   · ${s}`))
  if (seriesInSeg.size > 8) console.log(`   ... and ${seriesInSeg.size - 8} more`)
}
