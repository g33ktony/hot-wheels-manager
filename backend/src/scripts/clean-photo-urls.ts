import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Limpia las URLs de Wikia removiendo /revision/latest y query params
 */
function cleanWikiaUrl(url: string): string {
  if (!url) return url

  // Remove /revision/latest?cb=... from Wikia URLs
  let cleanUrl = url.split('/revision/')[0]

  // If the URL doesn't have the required hash structure, return as-is
  if (!cleanUrl.includes('hotwheels/images/')) {
    return url
  }

  return cleanUrl
}

async function cleanPhotoUrls() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI not configured')

  await mongoose.connect(mongoUri)
  console.log('✅ Conectado a MongoDB\n')

  // Get all cars with photo_url
  const cars = await HotWheelsCarModel.find({
    photo_url: { $exists: true, $ne: null, $ne: '' }
  }).lean()

  console.log(`📦 Encontrados ${cars.length} autos con foto_url\n`)

  let updatedCount = 0
  let skippedCount = 0

  for (const car of cars) {
    if (!car.photo_url) continue

    const cleanUrl = cleanWikiaUrl(car.photo_url)

    if (cleanUrl !== car.photo_url) {
      await HotWheelsCarModel.updateOne(
        { _id: car._id },
        { $set: { photo_url: cleanUrl } }
      )
      updatedCount++

      if (updatedCount <= 5) {
        console.log(`✓ ${car.carModel}`)
        console.log(`  Old: ${car.photo_url}`)
        console.log(`  New: ${cleanUrl}\n`)
      }
    } else {
      skippedCount++
    }

    // Also clean pack_contents if exists
    if (car.pack_contents && car.pack_contents.length > 0) {
      let packModified = false
      const updatedContents = car.pack_contents.map((item: any) => {
        if (item.photo_url) {
          const cleanItemUrl = cleanWikiaUrl(item.photo_url)
          if (cleanItemUrl !== item.photo_url) {
            packModified = true
            return { ...item, photo_url: cleanItemUrl }
          }
        }
        return item
      })

      if (packModified) {
        await HotWheelsCarModel.updateOne(
          { _id: car._id },
          { $set: { pack_contents: updatedContents } }
        )
      }
    }
  }

  console.log('='.repeat(60))
  console.log('📊 Resumen:')
  console.log(`   ✓ URLs limpiadas: ${updatedCount}`)
  console.log(`   ⏭️  Sin cambios: ${skippedCount}`)
  console.log(`   📦 Total procesados: ${cars.length}`)

  await mongoose.disconnect()
  console.log('\n✅ Desconectado de MongoDB')
}

cleanPhotoUrls().catch(console.error)
