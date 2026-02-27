import axios from 'axios'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const DELAY_MS = 1000 // Rate limiting: 1 request per second

// Sleep function for rate limiting
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
  photo_url_carded?: string
  tampo?: string
  wheel_type?: string
  car_make?: string
  pack_contents?: Array<{
    casting_name: string
    body_color?: string
    tampo?: string
    wheel_type?: string
    notes?: string
  }>
}

/**
 * Obtiene páginas de una categoría
 */
async function getCategoryMembers(category: string): Promise<Array<{title: string, pageid: number}>> {
  console.log(`📂 Obteniendo miembros de categoría: ${category}`)

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
    console.log(`  ✓ Encontrados ${members.length} elementos`)
    return members
  } catch (error) {
    console.error(`  ✗ Error obteniendo categoría ${category}:`, error)
    return []
  }
}

/**
 * Obtiene subcategorías de una categoría
 */
async function getSubcategories(category: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmtype: 'subcat',
    cmlimit: '500',
    format: 'json'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const subcats = response.data.query?.categorymembers || []
    // Remove "Category:" prefix from titles
    return subcats.map((cat: any) => cat.title.replace('Category:', ''))
  } catch (error) {
    console.error(`  ✗ Error obteniendo subcategorías de ${category}:`, error)
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

  // Parse key=value pairs
  const pairs = templateContent.split('|')
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      params[key.trim()] = value.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1') // Remove wiki links
    }
  }

  // Extract images from wikitext for both main and carded
  const images = extractImages(wikitext)

  return {
    carModel: params.name,
    series: params.series,
    toy_num: params.number,
    year: params.years,
    photo_url: images.main || (params.image ? `https://static.wikia.nocookie.net/hotwheels/images/${params.image}` : undefined),
    photo_url_carded: images.carded
  }
}

/**
 * Extrae múltiples URLs de imágenes (principal y carded) del wikitext
 */
function extractImages(wikitext: string): { main?: string, carded?: string } {
  const images: { main?: string, carded?: string } = {}

  // Buscar sección ==Images== o ==Gallery==
  const imagesSection = wikitext.match(/==(Images|Gallery)==([^]*?)(?===|$)/i)
  if (!imagesSection) return images

  const imageSectionText = imagesSection[2]

  // Método 1: Buscar en tabla de imágenes [[File:xxx.jpg|description]]
  const fileMatches = imageSectionText.match(/\[\[(File|Image):([^\]|]+)[^\]]*\|?([^\]]*)\]\]/gi)
  
  if (fileMatches && fileMatches.length > 0) {
    // Primera imagen = main
    let mainMatch = fileMatches[0].match(/(?:File|Image):([^\]|]+)/i)
    if (mainMatch) {
      const fileName = mainMatch[1].trim().replace(/ /g, '_')
      images.main = `https://static.wikia.nocookie.net/hotwheels/images/${fileName}`
    }

    // Buscar segunda imagen con palabras clave "carded", "card", "boxed", "box", "original"
    for (let i = 1; i < fileMatches.length; i++) {
      const match = fileMatches[i].match(/(?:File|Image):([^\]|]+)[^\]]*\|?([^\]]*)\]\]/i)
      if (match) {
        const fileName = match[1].trim().replace(/ /g, '_')
        const description = (match[2] || '').toLowerCase()
        
        // Buscar keywords que indiquen que es la versión "carded"
        if (description.includes('carded') || description.includes('card') || 
            description.includes('boxed') || description.includes('box') || 
            description.includes('original') || description.includes('package') ||
            fileName.toLowerCase().includes('carded') || fileName.toLowerCase().includes('boxed')) {
          images.carded = `https://static.wikia.nocookie.net/hotwheels/images/${fileName}`
          break
        }
      }
    }

    // Si no encontró carded por descripción, usar la segunda imagen disponible
    if (!images.carded && fileMatches.length > 1) {
      let secondMatch = fileMatches[1].match(/(?:File|Image):([^\]|]+)/i)
      if (secondMatch) {
        const fileName = secondMatch[1].trim().replace(/ /g, '_')
        images.carded = `https://static.wikia.nocookie.net/hotwheels/images/${fileName}`
      }
    }
  }

  // Método 2: Si no encuentra en tabla, buscar en galería <gallery>...</gallery>
  if (!images.carded && !images.main) {
    const galleryMatch = imageSectionText.match(/<gallery[^>]*>([^]*?)<\/gallery>/i)
    if (galleryMatch) {
      const galleryContent = galleryMatch[1]
      const galleryFiles = galleryContent.match(/(?:File|Image):([^\n|]+)/gi)
      if (galleryFiles) {
        // First file in gallery is main
        if (galleryFiles.length > 0) {
          const mainFile = galleryFiles[0].match(/(?:File|Image):([^\n|]+)/i)
          if (mainFile) {
            const fileName = mainFile[1].trim().replace(/ /g, '_')
            images.main = `https://static.wikia.nocookie.net/hotwheels/images/${fileName}`
          }
        }
        // Second file is often carded
        if (galleryFiles.length > 1) {
          const cardedFile = galleryFiles[1].match(/(?:File|Image):([^\n|]+)/i)
          if (cardedFile) {
            const fileName = cardedFile[1].trim().replace(/ /g, '_')
            images.carded = `https://static.wikia.nocookie.net/hotwheels/images/${fileName}`
          }
        }
      }
    }
  }

  return images
}

/**
 * Extrae la URL de la imagen principal de la página desde el wikitext
 */
function extractImageUrl(wikitext: string): string | undefined {
  // Try to find image in template first (|image=filename.jpg)
  const templateImageMatch = wikitext.match(/\|\s*image\s*=\s*([^\|\n]+)/i)
  if (templateImageMatch) {
    const imageName = templateImageMatch[1].trim()
    if (imageName && imageName !== '') {
      return `https://static.wikia.nocookie.net/hotwheels/images/${imageName}`
    }
  }

  // Try to find first [[File:xxx]] or [[Image:xxx]] link
  const fileMatch = wikitext.match(/\[\[(File|Image):([^\]|]+)/i)
  if (fileMatch) {
    const fileName = fileMatch[2].trim()
    if (fileName) {
      // Convert filename to Wikia format (replace spaces with underscores)
      const normalizedName = fileName.replace(/ /g, '_')
      return `https://static.wikia.nocookie.net/hotwheels/images/${normalizedName}`
    }
  }

  return undefined
}

/**
 * Parsea el contenido de un multi-pack (5-Pack, 10-Pack, etc.)
 * Extrae la tabla de autos incluidos en el pack
 */
function parsePackContents(wikitext: string): Array<{casting_name: string, body_color?: string, tampo?: string, wheel_type?: string, notes?: string}> {
  const contents: Array<any> = []

  // Buscar sección ===Cars===
  const carsSection = wikitext.match(/===Cars===([^]*?)(?===|$)/i)
  if (!carsSection) return contents

  const tableSection = carsSection[1]

  // Buscar tabla wikitable
  const tableMatch = tableSection.match(/\{\|[^]*?\|\}/g)
  if (!tableMatch) return contents

  const tableText = tableMatch[0]
  const rows = tableSection.split('|-').slice(1) // Skip header

  for (const row of rows) {
    if (!row.trim() || row.includes('style="border-style') || row.includes('Casting Name')) continue

    const cells = row.split('\n|').map(c => c.trim()).filter(Boolean)
    if (cells.length < 2) continue

    try {
      // Extract casting name (remove wiki links)
      const castingName = cells[0]?.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1').replace(/\'/g, "'").trim()
      if (!castingName) continue

      const item: any = {
        casting_name: castingName,
        body_color: cells[1]?.trim(),
        tampo: cells[2]?.replace(/;/g, ',').trim(),
        wheel_type: cells[6]?.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1').trim(),
        notes: cells[8]?.trim()
      }

      contents.push(item)
    } catch (error) {
      continue
    }
  }

  return contents
}

/**
 * Parsea la tabla de versiones del wikitext
 */
function parseVersionsTable(wikitext: string): Array<Partial<ParsedVehicle>> {
  const versions: Array<Partial<ParsedVehicle>> = []

  // Find table rows
  const tableMatch = wikitext.match(/\{\|[^]*?\|\}/g)
  if (!tableMatch) return versions

  const tableText = tableMatch[0]
  const rows = tableText.split('|-').slice(1) // Skip header

  for (const row of rows) {
    if (!row.trim() || row.includes('style="border-style')) continue

    const cells = row.split('\n|').map(c => c.trim()).filter(Boolean)

    if (cells.length < 10) continue // Need at least col#, year, series, color, tampo, base, window, interior, wheel, toy#

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

      // Only add if has required fields
      if (version.toy_num && version.year) {
        versions.push(version)
      }
    } catch (error) {
      // Skip malformed rows
      continue
    }
  }

  return versions
}

/**
 * Obtiene y parsea una página de Fandom
 */
async function parsePage(pageId: number, title: string): Promise<ParsedVehicle[]> {
  console.log(`  📄 Parseando: ${title} (ID: ${pageId})`)

  const params = new URLSearchParams({
    action: 'parse',
    pageid: pageId.toString(),
    prop: 'wikitext',
    format: 'json'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const wikitext = response.data.parse?.wikitext?.['*']

    if (!wikitext) {
      console.log(`    ⚠️  Sin wikitext`)
      return []
    }

    // Parse template for base info
    const templateData = parseTemplate(wikitext)

    // Check if this is a multi-pack (5-Pack, 10-Pack, etc.)
    const isMultiPack = title.match(/\d+[\s-]Pack/i) || wikitext.includes('===Cars===')
    let packContents: any[] = []

    if (isMultiPack) {
      packContents = parsePackContents(wikitext)
      if (packContents.length > 0) {
        console.log(`    ✓ Multi-pack con ${packContents.length} autos`)
      }
    }

    // For multi-packs without template, extract data from intro text
    if (isMultiPack && (!templateData || !templateData.carModel)) {
      // Extract toy number from text like "Car Meet 5-Pack (GHP52)"
      const toyNumMatch = wikitext.match(/\(([A-Z0-9]{3,10})\)/i)
      // Extract year from text like "released in 2020"
      const yearMatch = wikitext.match(/released in (\d{4})/i)
      // Extract image URLs from wikitext
      const images = extractImages(wikitext)

      if (toyNumMatch && yearMatch && packContents.length > 0) {
        console.log(`    ✓ Multi-pack sin template - extrayendo del texto`)
        return [{
          carModel: title,
          series: title.includes('5-Pack') ? '5-Packs' : 'Multi-Packs',
          toy_num: toyNumMatch[1],
          col_num: '',
          series_num: '',
          year: yearMatch[1],
          photo_url: images.main,
          photo_url_carded: images.carded,
          pack_contents: packContents
        } as ParsedVehicle]
      }

      console.log(`    ⚠️  Multi-pack sin datos suficientes`)
      return []
    }

    if (!templateData || !templateData.carModel) {
      console.log(`    ⚠️  No se pudo parsear template`)
      return []
    }

    // Parse versions table
    const versions = parseVersionsTable(wikitext)

    if (versions.length === 0) {
      // If no table, create single version from template
      if (templateData.toy_num && templateData.year) {
        console.log(`    ✓ 1 versión (template)`)
        return [{
          ...templateData,
          col_num: templateData.col_num || '',
          series_num: templateData.series_num || '',
          carModel: templateData.carModel!,
          series: templateData.series || '',
          toy_num: templateData.toy_num,
          year: templateData.year,
          photo_url_carded: templateData.photo_url_carded,
          pack_contents: packContents.length > 0 ? packContents : undefined
        } as ParsedVehicle]
      }
      return []
    }

    // Merge template data with each version
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
      photo_url: templateData.photo_url,
      photo_url_carded: templateData.photo_url_carded,
      car_make: title.match(/^\d{4}\s+([A-Za-z]+)/)?.[1], // Extract make from title like "1967 Ferrari..."
      pack_contents: packContents.length > 0 ? packContents : undefined
    } as ParsedVehicle))

    console.log(`    ✓ ${vehicles.length} versiones`)
    return vehicles

  } catch (error) {
    console.error(`    ✗ Error parseando página:`, error)
    return []
  }
}

/**
 * Detecta si un vehículo es una serie premium
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
    'exclusive'
  ]
  const lowerSeries = series.toLowerCase()
  return premiumKeywords.some(keyword => lowerSeries.includes(keyword))
}

/**
 * Valida que un vehículo tenga datos mínimos requeridos
 */
function validateVehicle(vehicle: ParsedVehicle): boolean {
  if (!vehicle.carModel || vehicle.carModel === 'Model Name') return false
  if (!vehicle.toy_num || vehicle.toy_num === 'Toy #') return false
  if (!vehicle.year || parseInt(vehicle.year) < 1968 || parseInt(vehicle.year) > 2026) return false
  if (!vehicle.series || vehicle.series === 'Series') return false

  return true
}

/**
 * Scraper principal
 */
async function scrapeFandom() {
  try {
    console.log('🚀 Iniciando Fandom Scraper...\n')

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI!
    await mongoose.connect(mongoURI)
    console.log('✅ Conectado a MongoDB\n')

    // Categories to scrape - EXTENDED YEARS WITH FOCUS ON PREMIUM SERIES
    const categories = [
      // Extended range to capture premium series (2015-2025)
      ...Array.from({ length: 11 }, (_, i) => `${2015 + i} Hot Wheels`),
      // Premium series specific categories
      'Elite 64 - 1 by Mattel Series',
      'Premium Series',
      'Collector Edition',
      'Treasure Hunt',
      'Super Treasure Hunt'
    ]

    let totalVehicles = 0
    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    let premiumCount = 0

    for (const category of categories) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Categoría: ${category}`)
      console.log('='.repeat(60))

      // Get subcategories first (for year categories like "2020 Hot Wheels")
      const subcategories = await getSubcategories(category)
      await sleep(DELAY_MS)

      if (subcategories.length > 0) {
        console.log(`  📂 Encontradas ${subcategories.length} subcategorías`)

        // Process each subcategory
        for (const subcat of subcategories) {
          console.log(`\n  ➜ Subcategoría: ${subcat}`)
          const members = await getCategoryMembers(subcat)
          await sleep(DELAY_MS)

          // Parse each page in subcategory
          for (const member of members) {
            const vehicles = await parsePage(member.pageid, member.title)
            await sleep(DELAY_MS) // Rate limiting

            // Filter and save valid vehicles
            for (const vehicle of vehicles) {
              if (!validateVehicle(vehicle)) {
                continue
              }

              try {
                // Try to insert (skip if duplicate toy_num)
                await HotWheelsCarModel.create(vehicle)
                successCount++
                totalVehicles++

                // Track premium series
                if (isPremiumSeries(vehicle.series)) {
                  premiumCount++
                }
              } catch (error: any) {
                if (error.code === 11000) {
                  // Duplicate - skip silently
                  skipCount++
                  continue
                }
                errorCount++
                console.error(`    ✗ Error guardando ${vehicle.carModel}:`, error.message)
              }
            }
          }
        }
      } else {
        // No subcategories - process members directly (for premium categories)
        const members = await getCategoryMembers(category)
        await sleep(DELAY_MS)

        // Parse each page
        for (const member of members) {
          const vehicles = await parsePage(member.pageid, member.title)
          await sleep(DELAY_MS) // Rate limiting

          // Filter and save valid vehicles
          for (const vehicle of vehicles) {
            if (!validateVehicle(vehicle)) {
              continue
            }

            try {
              // Try to insert (skip if duplicate toy_num)
              await HotWheelsCarModel.create(vehicle)
              successCount++
              totalVehicles++

              // Track premium series
              if (isPremiumSeries(vehicle.series)) {
                premiumCount++
              }
            } catch (error: any) {
              if (error.code === 11000) {
                // Duplicate - skip silently
                skipCount++
                continue
              }
              errorCount++
              console.error(`    ✗ Error guardando ${vehicle.carModel}:`, error.message)
            }
          }
        }
      }

      console.log(`\n📊 Progreso categoría "${category}":`)
      console.log(`   ✓ Exitosos: ${successCount}`)
      console.log(`   ⏭️  Duplicados: ${skipCount}`)
      console.log(`   ✗ Errores: ${errorCount}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Scraping completado!')
    console.log('='.repeat(60))
    console.log(`📊 Total vehículos procesados: ${totalVehicles}`)
    console.log(`✅ Guardados exitosamente: ${successCount}`)
    console.log(`⏭️  Duplicados saltados: ${skipCount}`)
    console.log(`❌ Errores: ${errorCount}`)
    console.log(`🏆 Series premium importadas: ${premiumCount}`)
    console.log(`📦 Total en BD: ${await HotWheelsCarModel.countDocuments()}`)

    // Show breakdown of premium series found
    console.log(`\n${'='.repeat(60)}`)
    console.log('Series Premium Encontradas:')
    console.log('='.repeat(60))

    const premiumSeriesBreakdown = await HotWheelsCarModel.collection.aggregate([
      {
        $match: {
          series: {
            $regex: /elite|rlc|red line club|hwc|premium|collector edition|treasure hunt|exclusive/i
          }
        }
      },
      {
        $group: {
          _id: '$series',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray()

    if (premiumSeriesBreakdown.length > 0) {
      for (const s of premiumSeriesBreakdown) {
        console.log(`  • ${s._id}: ${s.count} autos`)
      }
    } else {
      console.log(`  ℹ️  No se encontraron series premium en el scraping.`)
    }

  } catch (error) {
    console.error('❌ Error durante el scraping:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Desconectado de MongoDB')
  }
}

// Run if called directly
if (require.main === module) {
  scrapeFandom()
}

export default scrapeFandom
