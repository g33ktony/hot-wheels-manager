/**
 * Script para corregir URLs incompletas obteniendo la URL completa desde Fandom API
 */
import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'
import axios from 'axios'
import * as cheerio from 'cheerio'

dotenv.config()

const FANDOM_API_URL = 'https://hotwheels.fandom.com/api.php'
const DELAY_MS = 300 // Delay between API requests

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Get complete image URL from Fandom using HTML parsing
 */
async function getCompleteImageUrl(carModel: string): Promise<string | null> {
  try {
    const response = await axios.get(FANDOM_API_URL, {
      params: {
        action: 'parse',
        page: carModel,
        prop: 'text',
        format: 'json'
      }
    })

    const html = response.data.parse?.text?.['*']
    if (!html) return null

    const $ = cheerio.load(html)

    // Look for image in infobox
    const infoboxImage = $('.infobox img').first()
    if (infoboxImage.length > 0) {
      const src = infoboxImage.attr('src') || infoboxImage.attr('data-src')
      if (src) {
        // Remove thumbnail parameters and revision suffix
        const imageUrl = src.split('/revision/')[0]
        return imageUrl
      }
    }

    return null
  } catch (error) {
    return null
  }
}

async function fixIncompleteUrls() {
  console.log('🔧 Corrector de URLs Incompletas de Wikia')
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

  for (let i = 0; i < carsWithIncompleteUrls.length; i++) {
    const car = carsWithIncompleteUrls[i]

    console.log(`[${i + 1}/${carsWithIncompleteUrls.length}] ${car.carModel} (${car.toy_num})`)

    try {
      const completeUrl = await getCompleteImageUrl(car.carModel)
      await sleep(DELAY_MS)

      if (completeUrl && completeUrl !== car.photo_url) {
        console.log(`  ✓ URL actualizada`)
        console.log(`    Old: ${car.photo_url}`)
        console.log(`    New: ${completeUrl}`)

        await HotWheelsCarModel.updateOne(
          { _id: car._id },
          { $set: { photo_url: completeUrl } }
        )

        updatedCount++
      } else if (!completeUrl) {
        console.log(`  ⚠️  No se encontró imagen en Fandom`)
        notFoundCount++
      } else {
        console.log(`  ⏭️  URL sin cambios`)
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error}`)
      errorCount++
    }

    // Log progress every 100 items
    if ((i + 1) % 100 === 0) {
      console.log(`\n--- Progreso: ${i + 1}/${carsWithIncompleteUrls.length} (${Math.round((i + 1) / carsWithIncompleteUrls.length * 100)}%) ---`)
      console.log(`Actualizadas: ${updatedCount}, No encontradas: ${notFoundCount}, Errores: ${errorCount}\n`)
    }
  }

  console.log('\n' + '=' .repeat(60))
  console.log('📊 Resumen Final:')
  console.log(`   ✓ URLs actualizadas: ${updatedCount}`)
  console.log(`   ⚠️  No encontradas: ${notFoundCount}`)
  console.log(`   ✗ Errores: ${errorCount}`)
  console.log(`   📦 Total procesados: ${carsWithIncompleteUrls.length}`)

  await mongoose.disconnect()
  console.log('\n✅ Desconectado de MongoDB')
}

// Run the script
fixIncompleteUrls().catch(console.error)
