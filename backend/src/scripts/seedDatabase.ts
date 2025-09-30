import mongoose from 'mongoose'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const seedDatabase = async () => {
  try {
    console.log('🚀 Iniciando carga de datos...')
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI!
    await mongoose.connect(mongoURI)
    console.log('✅ Conectado a MongoDB Atlas')

    // Load Hot Wheels data from JSON file
    const dataPath = path.join(__dirname, '../../data/hotwheels_database.json')
    console.log(`📁 Buscando datos en: ${dataPath}`)
    const hotwheelsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    console.log(`📦 Datos cargados del archivo: ${hotwheelsData.length} registros`)

    // Clear existing data (optional)
    const existingCount = await HotWheelsCarModel.countDocuments()
    console.log(`📊 Hot Wheels existentes en BD: ${existingCount}`)
    
    if (existingCount > 0) {
      console.log('🧹 Limpiando datos existentes...')
      await HotWheelsCarModel.deleteMany({})
    }

    // Validate and transform data
    console.log(`📦 Preparando ${hotwheelsData.length} registros para carga...`)
    
    let successCount = 0
    let errorCount = 0
    const batchSize = 100

    for (let i = 0; i < hotwheelsData.length; i += batchSize) {
      const batch = hotwheelsData.slice(i, i + batchSize)
      
      try {
        await HotWheelsCarModel.insertMany(batch, { ordered: false })
        successCount += batch.length
        console.log(`✅ Procesados: ${Math.min(i + batchSize, hotwheelsData.length)}/${hotwheelsData.length}`)
      } catch (error: any) {
        console.warn(`⚠️  Error en lote ${i}-${i + batchSize}:`, error.message)
        
        // Try individual inserts for this batch
        for (const item of batch) {
          try {
            await HotWheelsCarModel.create(item)
            successCount++
          } catch (individualError: any) {
            errorCount++
            console.error(`❌ Error con toy_num ${item.toy_num}:`, individualError.message)
          }
        }
      }
    }

    console.log('\n🎉 ¡Carga completada!')
    console.log(`✅ Registros exitosos: ${successCount}`)
    console.log(`❌ Registros con error: ${errorCount}`)
    console.log(`📊 Total en BD: ${await HotWheelsCarModel.countDocuments()}`)

    // Show some sample data
    const samples = await HotWheelsCarModel.find().limit(5)
    console.log('\n📋 Muestra de datos cargados:')
    samples.forEach(car => {
      console.log(`  • ${car.carModel} (${car.series}, ${car.year}) - ${car.toy_num}`)
    })

  } catch (error) {
    console.error('❌ Error durante la carga:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Desconectado de MongoDB')
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
}

export default seedDatabase
