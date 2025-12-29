/**
 * Script para migrar imágenes base64 de MongoDB a Cloudinary
 * 
 * Uso: npx ts-node src/scripts/migrateImagesToCloudinary.ts
 * 
 * Este script:
 * 1. Lee todas las imágenes base64 de la BD
 * 2. Las sube a Cloudinary
 * 3. Reemplaza los datos en la BD con URLs de Cloudinary
 * 4. Crea un backup de los datos originales
 */

import mongoose from 'mongoose'
import { InventoryItemModel } from '../models/InventoryItem'
import { connectDB } from '../config/database'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()
dotenv.config({ path: path.join(__dirname, '../../.env') })
dotenv.config({ path: path.join(__dirname, '../../../.env') })

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name'
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'unsigned_upload'
const BACKUP_DIR = path.join(__dirname, '../../backups')

interface MigrationStats {
  totalItems: number
  itemsWithPhotos: number
  successfulUploads: number
  failedUploads: number
  errors: string[]
}

const stats: MigrationStats = {
  totalItems: 0,
  itemsWithPhotos: 0,
  successfulUploads: 0,
  failedUploads: 0,
  errors: []
}

/**
 * Upload base64 image to Cloudinary using fetch (Node 18+)
 */
async function uploadToCloudinary(base64: string, itemId: string, index: number): Promise<string | null> {
  try {
    // Convert base64 to Buffer
    let imageData = base64
    if (base64.includes(';base64,')) {
      imageData = base64.split(';base64,')[1]
    }

    const buffer = Buffer.from(imageData, 'base64')

    // Create FormData for multipart upload
    const formData = new FormData()
    const blob = new Blob([buffer], { type: 'image/jpeg' })
    formData.append('file', blob, `inventory-${itemId}-${index}.jpg`)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('folder', 'hot-wheels-manager/inventory-migration')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData as any
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed (${response.status}): ${errorText}`)
    }

    const data: any = await response.json()
    console.log(`✅ Uploaded: ${data.secure_url}`)
    stats.successfulUploads++
    return data.secure_url
  } catch (error) {
    const errorMsg = `Error uploading image for item ${itemId}: ${error}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)
    stats.failedUploads++
    return null
  }
}

/**
 * Create backup of original data
 */
async function createBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const inventoryItems = await InventoryItemModel.find({}).lean()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(BACKUP_DIR, `inventory-backup-${timestamp}.json`)

    fs.writeFileSync(backupFile, JSON.stringify(inventoryItems, null, 2))
    console.log(`\n📦 Backup created: ${backupFile}`)
    return backupFile
  } catch (error) {
    console.error('❌ Error creating backup:', error)
    throw error
  }
}

/**
 * Migrate inventory item photos
 */
async function migrateInventoryItems() {
  console.log('\n📸 Starting inventory items migration...')

  try {
    const items = await InventoryItemModel.find({ photos: { $exists: true, $ne: [] } })
    stats.totalItems = items.length
    console.log(`Found ${items.length} items with photos`)

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemId = (item._id as any).toString()

      if (!item.photos || item.photos.length === 0) {
        continue
      }

      stats.itemsWithPhotos++
      const newPhotos: string[] = []

      for (let j = 0; j < item.photos.length; j++) {
        const photo = item.photos[j]

        // Skip if already migrated (URL starts with http)
        if (photo.startsWith('http')) {
          console.log(`⏭️  Skipping already migrated photo`)
          newPhotos.push(photo)
          continue
        }

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(photo, itemId, j)
        if (cloudinaryUrl) {
          newPhotos.push(cloudinaryUrl)
        }
      }

      // Update item with new photo URLs
      if (newPhotos.length > 0) {
        await InventoryItemModel.updateOne(
          { _id: item._id },
          { $set: { photos: newPhotos } }
        )
        console.log(`✅ Updated item ${itemId}: ${newPhotos.length} photos migrated\n`)
      }
    }
  } catch (error) {
    console.error('❌ Error migrating inventory items:', error)
    throw error
  }
}

/**
 * Print migration summary
 */
function printSummary() {
  console.log('\n')
  console.log('╔════════════════════════════════════════════╗')
  console.log('║       🎉 MIGRATION COMPLETED! 🎉          ║')
  console.log('╚════════════════════════════════════════════╝')
  console.log('')
  console.log(`📊 Statistics:`)
  console.log(`   Total items scanned: ${stats.totalItems}`)
  console.log(`   Items with photos: ${stats.itemsWithPhotos}`)
  console.log(`   Successful uploads: ${stats.successfulUploads}`)
  console.log(`   Failed uploads: ${stats.failedUploads}`)

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`)
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`)
    })
  }

  console.log('')
  console.log(`💾 Your database has been backed up in the backups/ directory`)
  console.log(`📸 ${stats.successfulUploads} images are now hosted on Cloudinary`)
  console.log(`🚀 Your app will load images from CDN (faster!)`)
  console.log('')
}

/**
 * Main migration function
 */
async function runMigration() {
  // Get database argument from command line (default: 'hot-wheels-manager')
  const dbName = process.argv[2] || 'hot-wheels-manager'
  
  console.log('🚀 Starting Cloudinary Image Migration')
  console.log(`Cloud Name: ${CLOUDINARY_CLOUD_NAME}`)
  console.log(`Upload Preset: ${CLOUDINARY_UPLOAD_PRESET}`)
  console.log(`Target Database: ${dbName}`)

  try {
    // Connect to database
    console.log('\n🔗 Connecting to database...')
    
    // Build URI with specified database
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    const dbUri = baseUri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`)
    
    await connectDB(dbUri)

    // Create backup
    console.log('📦 Creating backup...')
    await createBackup()

    // Migrate inventory items
    await migrateInventoryItems()

    // Print summary
    printSummary()

    // Close connection
    await mongoose.disconnect()
    console.log('✅ Database connection closed')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
runMigration()
