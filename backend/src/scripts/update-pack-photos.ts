/**
 * Script para actualizar las fotos de los multi-packs existentes en la base de datos
 * Usa la API de Fandom para extraer las imágenes de las páginas de los packs
 */
import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

const FANDOM_API_URL = 'https://hotwheels.fandom.com/api.php'
const DELAY_MS = 500 // Delay between API requests to be respectful

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
 * Busca una página en Fandom por título y retorna su contenido wikitext
 */
async function getPageContent(title: string): Promise<string | null> {
  try {
    const response = await axios.get(FANDOM_API_URL, {
      params: {
        action: 'query',
        prop: 'revisions',
        titles: title,
        rvprop: 'content',
        rvslots: 'main',
        format: 'json'
      }
    })

    const pages = response.data.query.pages
    const pageId = Object.keys(pages)[0]

    if (pageId === '-1') {
      return null // Page not found
    }

    const page = pages[pageId]
    const content = page.revisions?.[0]?.slots?.main?.['*']

    return content || null
  } catch (error) {
    console.error(`  ✗ Error fetching page "${title}":`, error)
    return null
  }
}

/**
 * Main function
 */
async function updatePackPhotos() {
  console.log('🎨 Actualizador de Fotos de Multi-Packs')
  console.log('=' .repeat(60))

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      throw new Error('MONGODB_URI no está configurado en .env')
    }

    await mongoose.connect(mongoUri)
    console.log('✅ Conectado a MongoDB\n')

    // Find all packs without photo_url
    const packsWithoutPhotos = await HotWheelsCarModel.find({
      pack_contents: { $exists: true, $ne: null, $ne: [] },
      $or: [
        { photo_url: { $exists: false } },
        { photo_url: null },
        { photo_url: '' }
      ]
    }).select('_id carModel toy_num year').lean()

    console.log(`📦 Encontrados ${packsWithoutPhotos.length} packs sin foto\n`)

    if (packsWithoutPhotos.length === 0) {
      console.log('✓ Todos los packs ya tienen fotos!')
      await mongoose.disconnect()
      return
    }

    let updatedCount = 0
    let errorCount = 0

    for (const pack of packsWithoutPhotos) {
      console.log(`\n📍 Procesando: ${pack.carModel} (${pack.toy_num})`)

      // Try searching by the pack name
      const wikitext = await getPageContent(pack.carModel)
      await sleep(DELAY_MS)

      if (!wikitext) {
        console.log(`  ⚠️  Página no encontrada en Fandom`)
        errorCount++
        continue
      }

      // Extract image URL
      const imageUrl = extractImageUrl(wikitext)

      if (imageUrl) {
        // Update the pack with the photo_url
        await HotWheelsCarModel.updateOne(
          { _id: pack._id },
          { $set: { photo_url: imageUrl } }
        )
        console.log(`  ✓ Foto actualizada: ${imageUrl.substring(0, 60)}...`)
        updatedCount++
      } else {
        console.log(`  ⚠️  No se encontró imagen en el wikitext`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Resumen:')
    console.log(`   ✓ Actualizados: ${updatedCount}`)
    console.log(`   ⚠️  Sin imagen: ${errorCount}`)
    console.log(`   📦 Total: ${packsWithoutPhotos.length}`)

    await mongoose.disconnect()
    console.log('\n✅ Desconectado de MongoDB')
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
updatePackPhotos()
