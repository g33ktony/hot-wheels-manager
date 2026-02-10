import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import dotenv from 'dotenv'

dotenv.config()

async function checkSpecificCar() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI not configured')

  await mongoose.connect(mongoUri)

  const car = await HotWheelsCarModel.findOne({
    toy_num: 'FYC47'
  }).lean()

  if (car) {
    console.log(`Modelo: ${car.carModel}`)
    console.log(`Serie: ${car.series}`)
    console.log(`Año: ${car.year}`)
    console.log(`Toy #: ${car.toy_num}`)
    console.log(`Photo URL: ${car.photo_url || 'NO TIENE FOTO'}`)

    if (car.photo_url) {
      console.log(`\nURL completa para weserv:`)
      console.log(`https://images.weserv.nl/?url=${car.photo_url}&w=300&h=200&fit=contain`)
    }
  } else {
    console.log('Auto no encontrado')
  }

  await mongoose.disconnect()
}

checkSpecificCar().catch(console.error)
