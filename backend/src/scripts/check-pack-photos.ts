import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

async function checkPackPhotos() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI not configured')

  await mongoose.connect(mongoUri)

  const pack = await HotWheelsCarModel.findOne({
    'pack_contents.photo_url': { $exists: true, $ne: null }
  }).lean()

  if (pack) {
    console.log(`\n📦 Pack: ${pack.carModel}`)
    console.log(`Items con foto:`)
    pack.pack_contents?.forEach((item: any, i: number) => {
      if (item.photo_url) {
        console.log(`\n${i + 1}. ${item.casting_name}`)
        console.log(`   URL: ${item.photo_url}`)
      }
    })
  }

  await mongoose.disconnect()
}

checkPackPhotos().catch(console.error)
