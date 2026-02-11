import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import axios from 'axios'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'

dotenv.config()

interface ScrapedCar {
  toy_num: string
  col_num?: string
  carModel: string
  series: string
  series_num?: string
  photo_url?: string
  year: string
  color?: string
  tampo?: string
  wheel_type?: string
  car_make?: string
  segment?: string
  country?: string
}

const MAINLINE_YEARS = Array.from({ length: 26 }, (_, i) => 1999 + i) // 1999-2024
const PREMIUM_YEARS = Array.from({ length: 15 }, (_, i) => 2010 + i) // 2010-2024

const CATEGORIES = {
  MAINLINE: MAINLINE_YEARS.map(year => `${year} Hot Wheels`),
  PREMIUM: PREMIUM_YEARS.map(year => `${year} Hot Wheels Premium`),
  TEAM_TRANSPORT: ['Team Transport'],
  RLC: ['Hot Wheels RLC'],
  ELITE_64: ['Elite 64 - 1 by Mattel Series'],
}

async function scrapeFandamWiki(): Promise<ScrapedCar[]> {
  const allCars: ScrapedCar[] = []
  const baseUrl = 'https://hotwheels.fandom.com'
  let processedCount = 0
  let errorCount = 0

  // Combine all categories
  const allCategories = [
    ...CATEGORIES.MAINLINE,
    ...CATEGORIES.PREMIUM,
    ...CATEGORIES.TEAM_TRANSPORT,
    ...CATEGORIES.RLC,
    ...CATEGORIES.ELITE_64
  ]

  console.log(`🚗 Iniciando scraper completo...`)
  console.log(`📚 Categorías a scrapear: ${allCategories.length}`)
  console.log(
    `- Mainline: ${CATEGORIES.MAINLINE.length} años\n` +
    `- Premium: ${CATEGORIES.PREMIUM.length} años\n` +
    `- Team Transport: 1\n` +
    `- RLC: 1\n` +
    `- Elite 64: 1\n`
  )

  for (const category of allCategories) {
    try {
      console.log(`\n🔍 Scrapeando: ${category}...`)
      const categoryUrl = `${baseUrl}/wiki/Category:${encodeURIComponent(category)}`
      
      const response = await axios.get(categoryUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      const $ = cheerio.load(response.data)
      const pageLinks = $('a[title]')
        .map((_, el) => {
          const href = $(el).attr('href')
          const title = $(el).attr('title')
          // Only process if seems like a car page
          if (href && title && !title.includes('Category') && !title.includes('Special')) {
            return title
          }
          return null
        })
        .get()
        .filter(Boolean) as string[]

      console.log(`  ✓ Encontrados ${pageLinks.length} posibles vehículos`)

      for (const carTitle of pageLinks) {
        try {
          const carUrl = `${baseUrl}/wiki/${encodeURIComponent(carTitle)}`
          const carResponse = await axios.get(carUrl, {
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })

          const $car = cheerio.load(carResponse.data)
          
          // Extract data from infobox or page content
          const infoboxText = $car('.pi-data')
            .text()
            .toLowerCase()

          // Skip non-car pages
          if (!infoboxText && !$car('body').text().includes('Hot Wheels')) {
            continue
          }

          // Extract toy number from page (usually in format like "####" or "ABC123")
          const toyNumMatch = carResponse.data.match(/Toy #[:\s]*([A-Z0-9]+)/i)
          const colNumMatch = carResponse.data.match(/Col\. #[:\s]*(\d+)/i)
          
          if (!toyNumMatch) continue // Skip if no toy number found

          const car: ScrapedCar = {
            toy_num: toyNumMatch[1],
            col_num: colNumMatch?.[1],
            carModel: carTitle.trim(),
            series: extractSeriesFromCategory(category),
            series_num: extractSeriesNum(carResponse.data),
            year: extractYear(category),
            photo_url: extractPhotoUrl($car, baseUrl),
            car_make: extractCarMake(carResponse.data),
            color: extractColor(carResponse.data),
            tampo: extractTampo(carResponse.data),
            wheel_type: extractWheelType(carResponse.data),
            segment: extractSegment(carResponse.data)
          }

          // Check if toy_num already exists
          const existingCar = allCars.find(c => c.toy_num === car.toy_num)
          if (!existingCar) {
            allCars.push(car)
            processedCount++
            if (processedCount % 10 === 0) {
              process.stdout.write(`  → ${processedCount} vehículos procesados\r`)
            }
          }

          // Rate limit: 1 request per 200ms
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (carError: any) {
          errorCount++
          if (errorCount < 5) {
            console.log(`  ⚠ Error scrapeando vehículo: ${carError.message}`)
          }
          continue
        }
      }

      // Delay between categories
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (categoryError: any) {
      console.log(`  ❌ Error en categoría ${category}: ${categoryError.message}`)
      continue
    }
  }

  console.log(`\n✅ Scraping completado: ${processedCount} vehículos, ${errorCount} errores`)
  return allCars
}

function extractSeriesFromCategory(category: string): string {
  if (category.includes('Premium')) return 'Premium'
  if (category.includes('Team Transport')) return 'Team Transport'
  if (category.includes('RLC')) return 'RLC'
  if (category.includes('Elite 64')) return 'Elite 64'
  return 'Mainline'
}

function extractYear(category: string): string {
  const yearMatch = category.match(/(\d{4})/)
  return yearMatch ? yearMatch[1] : new Date().getFullYear().toString()
}

function extractSeriesNum(html: string): string | undefined {
  const match = html.match(/Series #[:\s]*(\d+)/i)
  return match?.[1]
}

function extractPhotoUrl(
  $: any,
  baseUrl: string
): string | undefined {
  // Try to find main image
  const imgUrl = $('figure.pi-image img').attr('src')
  if (imgUrl) {
    return imgUrl.startsWith('http') ? imgUrl : `${baseUrl}${imgUrl}`
  }
  return undefined
}

function extractCarMake(html: string): string | undefined {
  const match = html.match(/Make[:\s]*([^<\n]+)/i)
  return match?.[1]?.trim()
}

function extractColor(html: string): string | undefined {
  const match = html.match(/Color[:\s]*([^<\n]+)/i)
  return match?.[1]?.trim()
}

function extractTampo(html: string): string | undefined {
  const match = html.match(/Tampo[:\s]*([^<\n]+)/i)
  return match?.[1]?.trim()
}

function extractWheelType(html: string): string | undefined {
  const match = html.match(/Wheel[s]? Type[:\s]*([^<\n]+)/i)
  return match?.[1]?.trim()
}

function extractSegment(html: string): string | undefined {
  const match = html.match(/Segment[:\s]*([^<\n]+)/i)
  return match?.[1]?.trim()
}

async function saveToDB(cars: ScrapedCar[]): Promise<void> {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI no configurada')

  await mongoose.connect(mongoUri)
  console.log('✅ Conectado a MongoDB')

  // Remove duplicates based on toy_num
  const uniqueCars = Array.from(
    new Map(cars.map(car => [car.toy_num, car])).values()
  )

  console.log(`📥 Guardando ${uniqueCars.length} vehículos únicos...`)

  let insertedCount = 0
  let updatedCount = 0
  let errorCount = 0

  for (const car of uniqueCars) {
    try {
      const result = await HotWheelsCarModel.updateOne(
        { toy_num: car.toy_num },
        car,
        { upsert: true }
      )

      if (result.upsertedId) {
        insertedCount++
      } else if (result.modifiedCount > 0) {
        updatedCount++
      }

      if ((insertedCount + updatedCount) % 50 === 0) {
        process.stdout.write(
          `  → ${insertedCount} insertados, ${updatedCount} actualizados\r`
        )
      }
    } catch (error: any) {
      errorCount++
      if (errorCount <= 5) {
        console.log(`  ⚠ Error guardando ${car.toy_num}: ${error.message}`)
      }
    }
  }

  console.log(
    `\n✅ Base de datos actualizada:\n` +
    `   • ${insertedCount} nuevos\n` +
    `   • ${updatedCount} actualizados\n` +
    `   • ${errorCount} errores\n`
  )

  await mongoose.disconnect()
  console.log('✅ Desconectado de MongoDB')
}

async function main() {
  try {
    console.log('🚀 Iniciando scraper completo de Hot Wheels...\n')
    const startTime = Date.now()

    const cars = await scrapeFandamWiki()
    
    if (cars.length === 0) {
      console.log('⚠ No se encontraron vehículos')
      return
    }

    await saveToDB(cars)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`⏱ Tiempo total: ${duration}s`)
  } catch (error: any) {
    console.error('❌ Error fatal:', error.message)
    process.exit(1)
  }
}

main()
