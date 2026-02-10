import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

async function clearPackItemPhotos() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI not configured')

  await mongoose.connect(mongoUri)
  console.log('✅ Connected to MongoDB')

  const result = await HotWheelsCarModel.updateMany(
    { 'pack_contents.0': { $exists: true } },
    { $set: { 'pack_contents.$[].photo_url': null } }
  )

  console.log(`✅ Cleared photo_url from ${result.modifiedCount} packs`)

  await mongoose.disconnect()
}

clearPackItemPhotos().catch(console.error)
