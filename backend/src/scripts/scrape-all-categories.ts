/**
 * Comprehensive Fandom Scraper - Imports ALL available Hot Wheels categories
 * Dynamically discovers and scrapes every category from the Fandom wiki
 * Includes: Team Transport, Silver Series, RLC, Elite 64, and everything else
 */
import axios from 'axios'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const DELAY_MS = 600 // Rate limiting

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface ParsedVehicle {
  toy_num: string
  col_num: string
  carModel: string
  series: string
  series_num: string
  year: string
  color?: string
  photo_url?: string
  tampo?: string
  wheel_type?: string
  car_make?: string
}

/**
 * Get all categories from wiki
 */
async function getAllCategories(): Promise<string[]> {
  console.log('📂 Obteniendo todas las categorías de Fandom...\n')
  const categories: string[] = []
  let cmcontinue = ''
  let batch = 0

  try {
    while (true) {
      const params = new URLSearchParams({
        action: 'query',
        list: 'allcategories',
        acmin: '1',
        aclimit: '500',
        format: 'json'
      })

      if (cmcontinue) {
        params.append('accontinue', cmcontinue)
      }

      const response = await axios.get(`${FANDOM_API}?${params}`)
      const allcats = response.data.query?.allcategories || []

      batch++
      console.log(`  Lote ${batch}: ${allcats.length} categorías`)

      for (const cat of allcats) {
        categories.push(cat['*'])
      }

      cmcontinue = response.data.query?.continue?.accontinue

      if (!cmcontinue) break

      await sleep(DELAY_MS)
    }

    console.log(`\n✅ Total de categorías encontradas: ${categories.length}\n`)
    return categories
  } catch (error) {
    console.error('Error obteniendo categorías:', error)
    return []
  }
}

/**
 * Filter relevant categories (exclude namespace, template, etc.)
 */
function filterRelevantCategories(categories: string[]): string[] {
  const excludePatterns = [
    /^wikipedia:/i,
    /^user:/i,
    /^file:/i,
    /^template:/i,
    /^category:/i,
    /^admin:/i,
    /^help:/i,
    /^special:/i,
    /^module:/i,
    /^gadget:/i,
    /^mediawiki:/i,
    /^maintenance/i,
    /^pages needing/i,
    /orphaned pages/i,
    /duplicate/i,
    /copied from/i,
    /stubs/i,
    /to be deleted/i,
    /missing content/i,
    /broken links/i,
    /under construction/i
  ]

  const relevant = categories.filter(cat => {
    const hasExcludePattern = excludePatterns.some(pattern => pattern.test(cat))
    return !hasExcludePattern
  })

  console.log(`✓ Categorías relevantes después del filtrado: ${relevant.length}`)
  console.log('Primeras 20 categorías a scrapear:')
  relevant.slice(0, 20).forEach((cat, i) => {
    console.log(`  ${i + 1}. ${cat}`)
  })
  console.log('  ...\n')

  return relevant
}

/**
 * Obtiene páginas de una categoría
 */
async function getCategoryMembers(category: string): Promise<Array<{ title: string; pageid: number }>> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmlimit: '500',
    format: 'json'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const members = response.data.query?.categorymembers || []
    return members
  } catch (error) {
    return []
  }
}

/**
 * Parsea el template {{casting|...}} del wikitext
 */
function parseTemplate(wikitext: string): Partial<ParsedVehicle> | null {
  const templateMatch = wikitext.match(/\{\{casting\|([^}]+)\}\}/)
  if (!templateMatch) return null

  const templateContent = templateMatch[1]
  const params: Record<string, string> = {}

  const pairs = templateContent.split('|')
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      params[key.trim()] = value.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    }
  }

  return {
    carModel: params.name,
    series: params.series,
    toy_num: params.number,
    year: params.years,
    photo_url: params.image ? `https://static.wikia.nocookie.net/hotwheels/images/${params.image}` : undefined
  }
}

/**
 * Extrae URL de imagen
 */
function extractImageUrl(wikitext: string): string | undefined {
  const templateImageMatch = wikitext.match(/\|\s*image\s*=\s*([^\|\n]+)/i)
  if (templateImageMatch) {
    const imageName = templateImageMatch[1].trim()
    if (imageName && imageName !== '') {
      return `https://static.wikia.nocookie.net/hotwheels/images/${imageName}`
    }
  }

  const fileMatch = wikitext.match(/\[\[(File|Image):([^\]|]+)/i)
  if (fileMatch) {
    const fileName = fileMatch[2].trim()
    if (fileName) {
      const normalizedName = fileName.replace(/ /g, '_')
      return `https://static.wikia.nocookie.net/hotwheels/images/${normalizedName}`
    }
  }

  return undefined
}

/**
 * Parsea tabla de versiones
 */
function parseVersionsTable(wikitext: string): Array<Partial<ParsedVehicle>> {
  const versions: Array<Partial<ParsedVehicle>> = []

  const tableMatch = wikitext.match(/\{\|[^]*?\|\}/g)
  if (!tableMatch) return versions

  const tableText = tableMatch[0]
  const rows = tableText.split('|-').slice(1)

  for (const row of rows) {
    if (!row.trim() || row.includes('style="border-style')) continue

    const cells = row.split('\n|').map(c => c.trim()).filter(Boolean)

    if (cells.length < 10) continue

    try {
      const version: Partial<ParsedVehicle> = {
        col_num: cells[0]?.replace(/[\[\]']/g, '').trim(),
        year: cells[1]?.replace(/[\[\]']/g, '').trim(),
        series: cells[2]?.replace(/[\[\]<>br/]/g, ' ').replace(/\s+/g, ' ').trim(),
        color: cells[3]?.replace(/[']/g, '').trim(),
        tampo: cells[4]?.trim(),
        wheel_type: cells[8]?.replace(/[\[\]']/g, '').trim(),
        toy_num: cells[9]?.trim()
      }

      if (version.toy_num && version.year) {
        versions.push(version)
      }
    } catch (error) {
      continue
    }
  }

  return versions
}

/**
 * Obtiene y parsea una página
 */
async function parsePage(pageId: number, title: string): Promise<ParsedVehicle[]> {
  const params = new URLSearchParams({
    action: 'parse',
    pageid: pageId.toString(),
    prop: 'wikitext',
    format: 'json'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const wikitext = response.data.parse?.wikitext?.['*']

    if (!wikitext) return []

    const templateData = parseTemplate(wikitext)
    if (!templateData || !templateData.carModel) return []

    const versions = parseVersionsTable(wikitext)

    if (versions.length === 0) {
      if (templateData.toy_num && templateData.year) {
        return [{
          ...templateData,
          col_num: templateData.col_num || '',
          series_num: templateData.series_num || '',
          carModel: templateData.carModel!,
          series: templateData.series || '',
          toy_num: templateData.toy_num,
          year: templateData.year
        } as ParsedVehicle]
      }
      return []
    }

    const vehicles = versions.map(version => ({
      carModel: templateData.carModel!,
      series: version.series || templateData.series || '',
      toy_num: version.toy_num || templateData.toy_num || '',
      col_num: version.col_num || '',
      series_num: templateData.series_num || '',
      year: version.year || templateData.year || '',
      color: version.color,
      tampo: version.tampo,
      wheel_type: version.wheel_type,
      photo_url: templateData.photo_url || extractImageUrl(wikitext),
      car_make: title.match(/^\d{4}\s+([A-Za-z]+)/)?.[1]
    } as ParsedVehicle))

    return vehicles
  } catch (error) {
    return []
  }
}

/**
 * Valida vehículo
 */
function validateVehicle(vehicle: ParsedVehicle): boolean {
  if (!vehicle.carModel || vehicle.carModel === 'Model Name') return false
  if (!vehicle.toy_num || vehicle.toy_num === 'Toy #') return false
  if (!vehicle.year || parseInt(vehicle.year) < 1968 || parseInt(vehicle.year) > 2026) return false
  if (!vehicle.series || vehicle.series === 'Series') return false
  return true
}

/**
 * Detecta si es serie premium
 */
function isPremiumSeries(series: string): boolean {
  if (!series) return false
  const premiumKeywords = [
    'elite',
    'rlc',
    'red line club',
    'hwc',
    'hot wheels collector',
    'premium',
    'collector edition',
    'treasure hunt',
    'super treasure hunt',
    'collector series',
    'exclusive',
    'team transport',
    'silver series'
  ]
  const lowerSeries = series.toLowerCase()
  return premiumKeywords.some(keyword => lowerSeries.includes(keyword))
}

/**
 * Scraper principal - todos los categorías
 */
async function scrapeAllCategories() {
  try {
    console.log('🚀 Iniciando Scraper COMPLETO de Fandom (Todas las categorías)...\n')

    const mongoURI = process.env.MONGODB_URI!
    await mongoose.connect(mongoURI)
    console.log('✅ Conectado a MongoDB\n')

    // Get all categories
    const allCategories = await getAllCategories()
    if (allCategories.length === 0) {
      console.log('❌ No se pudieron obtener categorías')
      await mongoose.disconnect()
      return
    }

    // Filter to relevant ones
    const relevantCategories = filterRelevantCategories(allCategories)

    let totalVehicles = 0
    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    let premiumCount = 0
    let processedCategories = 0
    let emptyCategories = 0
    const seriesCounts: Record<string, number> = {}

    console.log(`\n${'='.repeat(60)}`)
    console.log('Iniciando procesamiento de categorías...')
    console.log('='.repeat(60))\n`)

    // Process each category
    for (let i = 0; i < relevantCategories.length; i++) {
      const category = relevantCategories[i]

      const members = await getCategoryMembers(category)
      await sleep(DELAY_MS)

      if (members.length === 0) {
        emptyCategories++
        continue
      }

      processedCategories++
      if (processedCategories % 10 === 0) {
        console.log(`\n[${processedCategories}/${relevantCategories.length}] Procesadas ${processedCategories} categorías no vacías...`)
      }

      // Parse each page in category
      for (const member of members) {
        const vehicles = await parsePage(member.pageid, member.title)
        await sleep(DELAY_MS)

        for (const vehicle of vehicles) {
          if (!validateVehicle(vehicle)) continue

          try {
            await HotWheelsCarModel.create(vehicle)
            successCount++
            totalVehicles++

            // Track series
            seriesCounts[vehicle.series] = (seriesCounts[vehicle.series] || 0) + 1

            if (isPremiumSeries(vehicle.series)) {
              premiumCount++
            }
          } catch (error: any) {
            if (error.code === 11000) {
              skipCount++
              continue
            }
            errorCount++
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎉 ¡Scraping completado!')
    console.log('='.repeat(60))
    console.log(`📊 Estadísticas Generales:`)
    console.log(`   Total vehículos procesados: ${totalVehicles}`)
    console.log(`   ✅ Guardados exitosamente: ${successCount}`)
    console.log(`   ⏭️  Duplicados saltados: ${skipCount}`)
    console.log(`   ❌ Errores: ${errorCount}`)
    console.log(`   🏆 Series premium: ${premiumCount}`)
    console.log(`   📦 Total en BD: ${await HotWheelsCarModel.countDocuments()}`)
    console.log(`\n📁 Categorías:`)
    console.log(`   Total encontradas: ${allCategories.length}`)
    console.log(`   Relevantes (filtradas): ${relevantCategories.length}`)
    console.log(`   Procesadas (no vacías): ${processedCategories}`)
    console.log(`   Vacías: ${emptyCategories}`)

    // Show top series
    console.log(`\n${'='.repeat(60)}`)
    console.log('Top 30 Series Importadas:')
    console.log('='.repeat(60))

    const sortedSeries = Object.entries(seriesCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)

    sortedSeries.forEach((s, i) => {
      const isPremium = isPremiumSeries(s[0]) ? ' 🏆' : ''
      console.log(`${(i + 1).toString().padStart(2)}. ${s[0]}: ${s[1]} autos${isPremium}`)
    })

  } catch (error) {
    console.error('❌ Error durante el scraping:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Desconectado de MongoDB')
  }
}

// Run if called directly
if (require.main === module) {
  scrapeAllCategories()
}

export default scrapeAllCategories
