/**
 * Script para re-codificar URLs de fotos que fueron decodificadas
 */
import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

async function reencodePhotoUrls() {
  console.log('🔧 Re-codificador de URLs de Fotos')
  console.log('=' .repeat(60))

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI no está configurado en .env')
  }

  await mongoose.connect(mongoUri)
  console.log('✅ Conectado a MongoDB\n')

  // Find all cars with special characters that need encoding
  // Characters like apostrophes, parentheses, spaces, etc.
  const carsWithSpecialChars = await HotWheelsCarModel.find({
    photo_url: {
      $exists: true,
      $nin: [null, ''],
      $regex: /['()]/  // Find URLs with apostrophes or parentheses
    }
  }).lean()

  console.log(`📦 Encontrados ${carsWithSpecialChars.length} autos con caracteres especiales\n`)

  let updatedCount = 0

  for (const car of carsWithSpecialChars) {
    if (!car.photo_url) continue

    // Encode special characters in the URL path
    // Split by / to avoid encoding the protocol://
    const parts = car.photo_url.split('/')
    const encodedParts = parts.map((part, index) => {
      // Don't encode the protocol part (http: or https:)
      if (index <= 2) return part
      // Encode each path segment
      return part.replace(/'/g, '%27')
                .replace(/\(/g, '%28')
                .replace(/\)/g, '%29')
    })

    const encodedUrl = encodedParts.join('/')

    if (encodedUrl !== car.photo_url) {
      console.log(`✓ ${car.carModel}`)
      console.log(`  Old: ${car.photo_url}`)
      console.log(`  New: ${encodedUrl}\n`)

      await HotWheelsCarModel.updateOne(
        { _id: car._id },
        { $set: { photo_url: encodedUrl } }
      )

      updatedCount++
    }
  }

  console.log('=' .repeat(60))
  console.log('📊 Resumen:')
  console.log(`   ✓ URLs re-codificadas: ${updatedCount}`)

  await mongoose.disconnect()
  console.log('\n✅ Desconectado de MongoDB')
}

// Run the script
reencodePhotoUrls().catch(console.error)
