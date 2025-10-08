import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { DeliveryLocationModel } from '../models/DeliveryLocation'

// Load environment variables
dotenv.config()

const initialLocations = [
  'Soriana del Valle',
  'Aurrera del palmar',
  'Aurrera de tulipanes',
  'Gran Patio',
  'Explanada',
  'El Reloj',
  'La mega'
]

const seedDeliveryLocations = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in environment variables')
      process.exit(1)
    }

    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB')

    // Check if locations already exist
    const existingCount = await DeliveryLocationModel.countDocuments()
    
    if (existingCount > 0) {
      console.log(`ℹ️  Found ${existingCount} existing delivery locations`)
      console.log('⚠️  Skipping seed to avoid duplicates')
      console.log('   To re-seed, delete existing locations first')
      await mongoose.connection.close()
      process.exit(0)
    }

    console.log('🌱 Seeding delivery locations...')
    
    // Insert all initial locations
    const locations = await DeliveryLocationModel.insertMany(
      initialLocations.map(name => ({ name }))
    )

    console.log(`✅ Successfully seeded ${locations.length} delivery locations:`)
    locations.forEach((loc: any, index: number) => {
      console.log(`   ${index + 1}. ${loc.name}`)
    })

    await mongoose.connection.close()
    console.log('🔌 MongoDB connection closed')
    console.log('✨ Seed completed successfully!')
    process.exit(0)

  } catch (error) {
    console.error('❌ Error seeding delivery locations:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run the seed
seedDeliveryLocations()
