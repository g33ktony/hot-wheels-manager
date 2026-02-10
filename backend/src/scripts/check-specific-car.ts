import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

async function checkSpecificCar() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI not configured')

  await mongoose.connect(mongoUri)

  // Search for any Porsche 911 from 2019
  const cars = await HotWheelsCarModel.find({
    $or: [
      { carModel: /911/i },
      { carModel: /porsche/i }
    ],
    year: '2019'
  }).select('carModel toy_num year photo_url series').lean()

  console.log(`\nEncontrados ${cars.length} resultados:\n`)
  cars.forEach((car: any) => {
    console.log(`Modelo: ${car.carModel}`)
    console.log(`Serie: ${car.series}`)
    console.log(`Año: ${car.year}`)
    console.log(`Toy #: ${car.toy_num}`)
    console.log(`Photo URL: ${car.photo_url || 'NO TIENE'}`)
    console.log('---')
  })

  await mongoose.disconnect()
}

checkSpecificCar().catch(console.error)
