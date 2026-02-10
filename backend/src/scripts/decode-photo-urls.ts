/**
 * Script para decodificar URLs de fotos que tienen caracteres codificados dos veces
 */
import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

async function decodePhotoUrls() {
  console.log('🔧 Decodificador de URLs de Fotos')
  console.log('=' .repeat(60))

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI no está configurado en .env')
  }

  await mongoose.connect(mongoUri)
  console.log('✅ Conectado a MongoDB\n')

  // Find all cars with encoded characters in photo_url
  const carsWithEncodedUrls = await HotWheelsCarModel.find({
    photo_url: { $exists: true, $nin: [null, ''], $regex: /%[0-9A-F]{2}/i }
  }).lean()

  console.log(`📦 Encontrados ${carsWithEncodedUrls.length} autos con URLs codificadas\n`)

  let updatedCount = 0

  for (const car of carsWithEncodedUrls) {
    if (!car.photo_url) continue

    // Decode the URL-encoded characters in the filename
    const decodedUrl = decodeURIComponent(car.photo_url)

    if (decodedUrl !== car.photo_url) {
      console.log(`✓ ${car.carModel}`)
      console.log(`  Old: ${car.photo_url}`)
      console.log(`  New: ${decodedUrl}\n`)

      await HotWheelsCarModel.updateOne(
        { _id: car._id },
        { $set: { photo_url: decodedUrl } }
      )

      updatedCount++
    }
  }

  console.log('=' .repeat(60))
  console.log('📊 Resumen:')
  console.log(`   ✓ URLs decodificadas: ${updatedCount}`)

  await mongoose.disconnect()
  console.log('\n✅ Desconectado de MongoDB')
}

// Run the script
decodePhotoUrls().catch(console.error)
