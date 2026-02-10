/**
 * Script to scrape premium series cars from Fandom
 * Includes: Elite 64, RLC (Red Line Club), HWC (Hot Wheels Collector), Premium series
 */
import axios from 'axios'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const DELAY_MS = 800 // Rate limiting: 1 request per second

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
    cmcontinue: '',
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

  return {
    carModel: params.name,
    series: params.series,
    toy_num: params.number,
    year: params.years,
    photo_url: params.image ? `https://static.wikia.nocookie.net/hotwheels/images/${params.image}` : undefined
  }
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
          year: templateData.year
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
      photo_url: templateData.photo_url || extractImageUrl(wikitext),
      car_make: title.match(/^\d{4}\s+([A-Za-z]+)/)?.[1] // Extract make from title
    } as ParsedVehicle))

    console.log(`    ✓ ${vehicles.length} versiones`)
    return vehicles

  } catch (error) {
    console.error(`    ✗ Error parseando página:`, error)
    return []
  }
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
 * Scraper principal para series premium
 */
async function scrapePremiumSeries() {
  try {
    console.log('🚀 Iniciando Premium Series Scraper...\n')

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI!
    await mongoose.connect(mongoURI)
    console.log('✅ Conectado a MongoDB\n')

    // Premium series categories to scrape
    const categories = [
      'Elite 64 - 1 by Mattel Series',
      'HWC (2020-2025) Releases',
      'RLC (Red Line Club) - 2020 Releases',
      'RLC (Red Line Club) - 2021 Releases',
      'RLC (Red Line Club) - 2022 Releases',
      'RLC (Red Line Club) - 2023 Releases',
      'RLC (Red Line Club) - 2024 Releases',
      'RLC (Red Line Club) - 2025 Releases',
      'Premium Series (2020-2025)',
      'Collector Edition (2020-2025)',
      'Treasure Hunt (2020-2025)',
      'Super Treasure Hunt (2020-2025)'
    ]

    let totalVehicles = 0
    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (const category of categories) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Categoría: ${category}`)
      console.log('='.repeat(60))

      const members = await getCategoryMembers(category)
      await sleep(DELAY_MS)

      if (members.length === 0) {
        console.log(`  ⚠️  Categoría no encontrada o vacía`)
        continue
      }

      // Parse each page in category
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

      console.log(`\n📊 Progreso categoría "${category}":`)
      console.log(`   ✓ Exitosos: ${successCount}`)
      console.log(`   ⏭️  Duplicados: ${skipCount}`)
      console.log(`   ✗ Errores: ${errorCount}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Scraping de series premium completado!')
    console.log('='.repeat(60))
    console.log(`📊 Total vehículos procesados: ${totalVehicles}`)
    console.log(`✅ Guardados exitosamente: ${successCount}`)
    console.log(`⏭️  Duplicados saltados: ${skipCount}`)
    console.log(`❌ Errores: ${errorCount}`)
    console.log(`📦 Total en BD: ${await HotWheelsCarModel.countDocuments()}`)

    // Show what we found
    console.log(`\n${'='.repeat(60)}`)
    console.log('Verificando series premium agregadas:')
    console.log('='.repeat(60))

    const seriesCount = await HotWheelsCarModel.collection.aggregate([
      {
        $match: {
          series: {
            $regex: /elite.*64|RLC|red line club|premium|collector edition|treasure hunt/i
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

    if (seriesCount.length > 0) {
      console.log(`\nSeries premium encontradas:`)
      for (const s of seriesCount) {
        console.log(`  • ${s._id}: ${s.count} autos`)
      }
    } else {
      console.log(`\nℹ️  No se encontraron series premium. Las categorías pueden no existir en Fandom.`)
      console.log(`    Intenta scrapear años específicos con el scraper principal.`)
    }

  } catch (error) {
    console.error('❌ Error durante el scraping:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Desconectado de MongoDB')
  }
}

// Run if called directly
if (require.main === module) {
  scrapePremiumSeries()
}

export default scrapePremiumSeries
