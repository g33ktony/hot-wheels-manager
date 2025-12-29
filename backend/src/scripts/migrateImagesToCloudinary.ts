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

import { InventoryItemModel } from '../models/InventoryItem'
import { SaleModel } from '../models/Sale'
import { connectDB, closeDB } from '../config/database'
import fetch from 'node-fetch'
import fs from 'fs/promises'
import path from 'path'

// Cloudinary config - obtén estos valores de https://cloudinary.com/console
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name'
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
 * Upload base64 image to Cloudinary
 */
async function uploadToCloudinary(base64: string, itemId: string, index: number): Promise<string | null> {
  try {
    // Cloudinary solo acepta file uploads, no base64 directo en upload unsigned
    // Así que convertimos el base64 a blob primero
    const formData = new FormData()
    
    // Convertir base64 a Blob
    const binaryString = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    const blob = new Blob([binaryString], { type: 'image/jpeg' })
    
    // @ts-ignore - FormData en Node
    formData.append('file', blob, `inventory-${itemId}-${index}.jpg`)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('folder', 'hot-wheels-manager/inventory-migration')
    formData.append('resource_type', 'auto')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData as any
      }
    )

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const data = await response.json() as any
    console.log(`✅ Uploaded image for item ${itemId}: ${data.secure_url}`)
    return data.secure_url
  } catch (error) {
    const errorMsg = `Error uploading image for item ${itemId}: ${error}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)
    return null
  }
}

/**
 * Create backup of original data
 */
async function createBackup() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true })
    
    const inventoryItems = await InventoryItemModel.find({}).lean()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(BACKUP_DIR, `inventory-backup-${timestamp}.json`)
    
    await fs.writeFile(backupFile, JSON.stringify(inventoryItems, null, 2))
    console.log(`📦 Backup created: ${backupFile}`)
  } catch (error) {
    console.error('❌ Error creating backup:', error)
    stats.errors.push(`Backup failed: ${error}`)
  }
}

/**
 * Migrate inventory items
 */
async function migrateInventoryItems() {
  console.log('\n🔄 Migrating inventory items...')
  
  try {
    const items = await InventoryItemModel.find({
      photos: { $exists: true, $ne: [] }
    })

    stats.totalItems = items.length

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const photos = (item.photos || []) as string[]
      
      if (photos.length > 0) {
        stats.itemsWithPhotos++
        const newPhotos: string[] = []

        for (let j = 0; j < photos.length; j++) {
          const photo = photos[j]
          
          // Skip if already a URL (already migrated)
          if (photo.startsWith('http')) {
            newPhotos.push(photo)
            stats.successfulUploads++
            continue
          }

          // Upload base64 to Cloudinary
          const cloudinaryUrl = await uploadToCloudinary(photo, item._id.toString(), j)
          
          if (cloudinaryUrl) {
            newPhotos.push(cloudinaryUrl)
            stats.successfulUploads++
          } else {
            stats.failedUploads++
            // Keep original if upload fails (for retry later)
            newPhotos.push(photo)
          }
        }

        // Update item with new URLs
        item.photos = newPhotos
        await item.save()
        
        const progress = Math.round((i / items.length) * 100)
        console.log(`📊 Progress: ${progress}% (${i}/${items.length})`)
      }
    }
  } catch (error) {
    console.error('❌ Error migrating inventory items:', error)
    stats.errors.push(`Inventory migration failed: ${error}`)
  }
}

/**
 * Migrate sales items (if they have photos)
 */
async function migrateSalesItems() {
  console.log('\n🔄 Migrating sales items...')
  
  try {
    const sales = await SaleModel.find({
      'items.photo': { $exists: true, $ne: null }
    })

    for (const sale of sales) {
      let updated = false

      for (const item of sale.items) {
        if (item.photo && !item.photo.startsWith('http')) {
          const cloudinaryUrl = await uploadToCloudinary(item.photo, sale._id.toString(), 0)
          
          if (cloudinaryUrl) {
            item.photo = cloudinaryUrl
            stats.successfulUploads++
            updated = true
          } else {
            stats.failedUploads++
          }
        }
      }

      if (updated) {
        await sale.save()
      }
    }
  } catch (error) {
    console.error('❌ Error migrating sales items:', error)
    stats.errors.push(`Sales migration failed: ${error}`)
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📋 MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total items scanned: ${stats.totalItems}`)
  console.log(`Items with photos: ${stats.itemsWithPhotos}`)
  console.log(`✅ Successful uploads: ${stats.successfulUploads}`)
  console.log(`❌ Failed uploads: ${stats.failedUploads}`)
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️ Errors encountered:')
    stats.errors.forEach(err => console.log(`  - ${err}`))
  } else {
    console.log('\n✅ No errors! Migration completed successfully.')
  }
  console.log('='.repeat(60))
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting image migration to Cloudinary...')
    console.log(`Cloud: ${CLOUDINARY_CLOUD_NAME}`)
    console.log(`Preset: ${CLOUDINARY_UPLOAD_PRESET}`)

    // Validate Cloudinary config
    if (CLOUDINARY_CLOUD_NAME === 'your-cloud-name') {
      console.error('❌ Error: CLOUDINARY_CLOUD_NAME not configured')
      console.error('Please set environment variables:')
      console.error('  export CLOUDINARY_CLOUD_NAME=your-cloud-name')
      console.error('  export CLOUDINARY_UPLOAD_PRESET=your-preset')
      process.exit(1)
    }

    // Connect to database
    console.log('\n📡 Connecting to database...')
    await connectDB()
    console.log('✅ Connected')

    // Create backup
    console.log('\n💾 Creating backup...')
    await createBackup()

    // Migrate
    await migrateInventoryItems()
    await migrateSalesItems()

    // Summary
    printSummary()

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await closeDB()
    console.log('\n🔌 Database connection closed')
  }
}

// Run script
main()
