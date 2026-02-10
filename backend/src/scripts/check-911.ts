import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

async function check911() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI not configured')

  await mongoose.connect(mongoUri)

  const cars = await HotWheelsCarModel.find({
    carModel: /'71 Porsche 911/i,
    year: '2019'
  }).lean()

  console.log(`Encontrados ${cars.length} resultados:\n`)

  for (const car of cars) {
    console.log(`Modelo: ${car.carModel}`)
    console.log(`Serie: ${car.series}`)
    console.log(`Año: ${car.year}`)
    console.log(`Toy #: ${car.toy_num}`)
    console.log(`Photo URL: ${car.photo_url || 'NO TIENE'}`)
    console.log('---')
  }

  await mongoose.disconnect()
}

check911().catch(console.error)
