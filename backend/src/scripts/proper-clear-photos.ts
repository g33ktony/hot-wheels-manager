import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

async function properClearPhotos() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI not configured')

  await mongoose.connect(mongoUri)
  console.log('✅ Connected to MongoDB')

  // Get all packs
  const packs = await HotWheelsCarModel.find({
    'pack_contents.0': { $exists: true }
  }).lean()

  console.log(`Found ${packs.length} packs`)

  let count = 0
  for (const pack of packs) {
    if (!pack.pack_contents) continue

    const updatedContents = pack.pack_contents.map((item: any) => {
      const { photo_url, ...rest } = item
      return rest
    })

    await HotWheelsCarModel.updateOne(
      { _id: pack._id },
      { $set: { pack_contents: updatedContents } }
    )
    count++
  }

  console.log(`✅ Cleared ${count} packs`)

  await mongoose.disconnect()
}

properClearPhotos().catch(console.error)
