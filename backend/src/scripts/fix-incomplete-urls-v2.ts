/**
 * Script mejorado para corregir URLs incompletas usando la API de imageinfo de Fandom
 * En lugar de buscar por nombre del auto, extrae el nombre del archivo y busca la URL completa
 */
import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

const FANDOM_API_URL = 'https://hotwheels.fandom.com/api.php'
const DELAY_MS = 200 // Faster delay since we're using a more efficient API
const BATCH_SIZE = 50 // Process in batches

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Extract filename from incomplete URL
 * Example: https://static.wikia.nocookie.net/hotwheels/images/DSC_5611.jpg -> DSC_5611.jpg
 */
function extractFilename(url: string): string | null {
  const match = url.match(/\/images\/([^\/]+\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP))$/i)
  return match ? match[1] : null
}

/**
 * Get complete image URL from Fandom imageinfo API
 */
async function getCompleteImageUrl(filename: string): Promise<string | null> {
  try {
    const response = await axios.get(FANDOM_API_URL, {
      params: {
        action: 'query',
        titles: `File:${filename}`,
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json'
      }
    })

    const pages = response.data.query?.pages
    if (!pages) return null

    const pageId = Object.keys(pages)[0]
    if (pageId === '-1') return null // File not found

    const imageUrl = pages[pageId]?.imageinfo?.[0]?.url
    if (!imageUrl) return null

    // Remove /revision/latest?cb=... from URL
    const cleanUrl = imageUrl.split('/revision/')[0]
    return cleanUrl
  } catch (error) {
    return null
  }
}

async function fixIncompleteUrlsImproved() {
  console.log('🔧 Corrector Mejorado de URLs Incompletas')
  console.log('=' .repeat(60))

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI no está configurado en .env')
  }

  await mongoose.connect(mongoUri)
  console.log('✅ Conectado a MongoDB\n')

  // Find URLs without the hash pattern
  const carsWithIncompleteUrls = await HotWheelsCarModel.find({
    photo_url: {
      $exists: true,
      $ne: null,
      $ne: '',
      $regex: /^https:\/\/static\.wikia\.nocookie\.net\/hotwheels\/images\/[^\/]+\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP)$/i
    }
  }).select('_id carModel toy_num photo_url').lean()

  console.log(`📦 Encontrados ${carsWithIncompleteUrls.length} autos con URLs incompletas\n`)

  if (carsWithIncompleteUrls.length === 0) {
    console.log('✓ Todas las URLs están completas!')
    await mongoose.disconnect()
    return
  }

  let updatedCount = 0
  let notFoundCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (let i = 0; i < carsWithIncompleteUrls.length; i++) {
    const car = carsWithIncompleteUrls[i]

    // Extract filename from incomplete URL
    const filename = extractFilename(car.photo_url)

    if (!filename) {
      console.log(`[${i + 1}/${carsWithIncompleteUrls.length}] ${car.carModel} - ⏭️  URL malformada, saltando`)
      skippedCount++
      continue
    }

    try {
      const completeUrl = await getCompleteImageUrl(filename)
      await sleep(DELAY_MS)

      if (completeUrl && completeUrl !== car.photo_url) {
        console.log(`[${i + 1}/${carsWithIncompleteUrls.length}] ${car.toy_num} - ✓ Actualizada`)

        await HotWheelsCarModel.updateOne(
          { _id: car._id },
          { $set: { photo_url: completeUrl } }
        )

        updatedCount++
      } else if (!completeUrl) {
        console.log(`[${i + 1}/${carsWithIncompleteUrls.length}] ${car.toy_num} - ⚠️  Archivo no encontrado en Fandom`)
        notFoundCount++
      } else {
        skippedCount++
      }
    } catch (error) {
      console.log(`[${i + 1}/${carsWithIncompleteUrls.length}] ${car.toy_num} - ✗ Error`)
      errorCount++
    }

    // Log progress every 100 items
    if ((i + 1) % 100 === 0) {
      console.log(`\n--- Progreso: ${i + 1}/${carsWithIncompleteUrls.length} (${Math.round((i + 1) / carsWithIncompleteUrls.length * 100)}%) ---`)
      console.log(`✓ Actualizadas: ${updatedCount} | ⚠️  No encontradas: ${notFoundCount} | ⏭️  Saltadas: ${skippedCount}\n`)
    }
  }

  console.log('\n' + '=' .repeat(60))
  console.log('📊 Resumen Final:')
  console.log(`   ✓ URLs actualizadas: ${updatedCount}`)
  console.log(`   ⚠️  No encontradas en Fandom: ${notFoundCount}`)
  console.log(`   ⏭️  Saltadas: ${skippedCount}`)
  console.log(`   ✗ Errores: ${errorCount}`)
  console.log(`   📦 Total procesados: ${carsWithIncompleteUrls.length}`)

  await mongoose.disconnect()
  console.log('\n✅ Desconectado de MongoDB')
}

// Run the script
fixIncompleteUrlsImproved().catch(console.error)
