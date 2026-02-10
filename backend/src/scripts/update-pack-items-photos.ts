/**
 * Script para actualizar las fotos de los items individuales dentro de pack_contents
 * Busca cada casting en Fandom y extrae su imagen
 */
import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'
import axios from 'axios'
import * as cheerio from 'cheerio'

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
 * Busca la imagen de un infobox usando la API de parseo de HTML
 */
async function getImageFromInfobox(title: string): Promise<string | undefined> {
  try {
    const response = await axios.get(FANDOM_API_URL, {
      params: {
        action: 'parse',
        page: title,
        prop: 'text',
        format: 'json'
      }
    })

    const html = response.data.parse?.text?.['*']
    if (!html) return undefined

    // Parse HTML with cheerio
    const $ = cheerio.load(html)

    // Look for image in infobox
    const infoboxImage = $('.infobox img').first()
    if (infoboxImage.length > 0) {
      const src = infoboxImage.attr('src') || infoboxImage.attr('data-src')
      if (src) {
        // Convert thumbnail URL to full image URL
        const imageUrl = src.split('/revision/')[0]
        return imageUrl
      }
    }

    return undefined
  } catch (error) {
    return undefined
  }
}

/**
 * Busca una página en Fandom por título y retorna URL de imagen
 */
async function getImageForCasting(castingName: string): Promise<string | null> {
  try {
    // First try HTML parsing approach (faster and more reliable)
    const infoboxImage = await getImageFromInfobox(castingName)
    if (infoboxImage) {
      return infoboxImage
    }

    // Fallback to wikitext parsing
    const response = await axios.get(FANDOM_API_URL, {
      params: {
        action: 'query',
        prop: 'revisions',
        titles: castingName,
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

    if (!content) return null

    // Extract image URL
    const imageUrl = extractImageUrl(content)
    return imageUrl || null
  } catch (error) {
    console.error(`  ✗ Error fetching image for "${castingName}":`, error)
    return null
  }
}

/**
 * Main function
 */
async function updatePackItemsPhotos() {
  console.log('🎨 Actualizador de Fotos de Items en Multi-Packs')
  console.log('=' .repeat(60))

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      throw new Error('MONGODB_URI no está configurado en .env')
    }

    await mongoose.connect(mongoUri)
    console.log('✅ Conectado a MongoDB\n')

    // Find all packs with pack_contents
    const packs = await HotWheelsCarModel.find({
      pack_contents: { $exists: true, $ne: null, $ne: [] }
    }).select('_id carModel toy_num pack_contents').lean()

    console.log(`📦 Encontrados ${packs.length} packs con contenido\n`)

    if (packs.length === 0) {
      console.log('✓ No hay packs para procesar!')
      await mongoose.disconnect()
      return
    }

    let totalItems = 0
    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const pack of packs) {
      console.log(`\n📍 Procesando pack: ${pack.carModel} (${pack.toy_num})`)

      if (!pack.pack_contents || pack.pack_contents.length === 0) {
        continue
      }

      let packModified = false
      const updatedContents = []

      for (let i = 0; i < pack.pack_contents.length; i++) {
        const item = pack.pack_contents[i]
        totalItems++

        console.log(`  ${i + 1}/${pack.pack_contents.length} - ${item.casting_name}`)

        // Skip if already has photo
        if (item.photo_url) {
          console.log(`    ⏭️  Ya tiene foto`)
          skippedCount++
          updatedContents.push(item)
          continue
        }

        // Search for image
        const imageUrl = await getImageForCasting(item.casting_name)
        await sleep(DELAY_MS)

        if (imageUrl) {
          console.log(`    ✓ Foto encontrada: ${imageUrl.substring(0, 60)}...`)
          updatedContents.push({
            ...item,
            photo_url: imageUrl
          })
          updatedCount++
          packModified = true
        } else {
          console.log(`    ⚠️  No se encontró imagen`)
          updatedContents.push(item)
          errorCount++
        }
      }

      // Update pack if any items were modified
      if (packModified) {
        await HotWheelsCarModel.updateOne(
          { _id: pack._id },
          { $set: { pack_contents: updatedContents } }
        )
        console.log(`  ✅ Pack actualizado`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Resumen:')
    console.log(`   📦 Packs procesados: ${packs.length}`)
    console.log(`   🎯 Items totales: ${totalItems}`)
    console.log(`   ✓ Fotos agregadas: ${updatedCount}`)
    console.log(`   ⏭️  Ya tenían foto: ${skippedCount}`)
    console.log(`   ⚠️  Sin imagen: ${errorCount}`)

    await mongoose.disconnect()
    console.log('\n✅ Desconectado de MongoDB')
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
updatePackItemsPhotos()
