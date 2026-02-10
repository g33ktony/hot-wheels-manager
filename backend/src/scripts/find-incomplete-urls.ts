import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

async function findIncompleteUrls() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI not configured')

  await mongoose.connect(mongoUri)

  // Find URLs that don't have the hash pattern (X/XX/)
  // Valid URLs: https://static.wikia.nocookie.net/hotwheels/images/X/XX/filename.jpg
  // Invalid URLs: https://static.wikia.nocookie.net/hotwheels/images/filename.jpg
  const carsWithIncompleteUrls = await HotWheelsCarModel.find({
    photo_url: {
      $exists: true,
      $nin: [null, ''],
      $regex: /^https:\/\/static\.wikia\.nocookie\.net\/hotwheels\/images\/[^\/]+\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP)$/i
    }
  }).lean()

  console.log(`📦 Encontrados ${carsWithIncompleteUrls.length} autos con URLs incompletas\n`)

  // Show first 10 examples
  console.log('Ejemplos de URLs incompletas:')
  carsWithIncompleteUrls.slice(0, 10).forEach(car => {
    console.log(`- ${car.carModel} (${car.toy_num}): ${car.photo_url}`)
  })

  await mongoose.disconnect()
}

findIncompleteUrls().catch(console.error)
