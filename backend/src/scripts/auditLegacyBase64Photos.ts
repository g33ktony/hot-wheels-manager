import mongoose from 'mongoose'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../../.env') })
dotenv.config({ path: path.join(__dirname, '../../../.env') })

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
const DB_NAME_ARG = process.argv[2]
const patterns = [/^data:image\//i, /base64/i]

function hasLegacyPhotoString(value: unknown): boolean {
  if (typeof value === 'string') {
    return patterns.some((re) => re.test(value))
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasLegacyPhotoString(item))
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) => hasLegacyPhotoString(v))
  }

  return false
}

function buildDbUri(baseUri: string, dbName?: string): string {
  if (!dbName) return baseUri
  return baseUri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`)
}

async function run() {
  const finalUri = buildDbUri(uri, DB_NAME_ARG)
  await mongoose.connect(finalUri)

  const db = mongoose.connection.db
  if (!db) {
    throw new Error('No database connection available')
  }

  const collectionsToScan = ['inventoryitems', 'purchases', 'sales', 'deliveries', 'presaleitems']

  console.log('=== LEGACY BASE64 PHOTO AUDIT ===')
  console.log(`DB: ${finalUri}`)

  let grandTotal = 0

  for (const name of collectionsToScan) {
    const exists = await db.listCollections({ name }).hasNext()

    if (!exists) {
      console.log(`- ${name}: 0/0`)
      continue
    }

    const col = db.collection(name)
    const total = await col.countDocuments({})

    const cursor = col.find({}, { projection: { _id: 1, photos: 1, items: 1 } })
    let withLegacy = 0
    const sampleIds: string[] = []

    for await (const doc of cursor) {
      if (hasLegacyPhotoString(doc)) {
        withLegacy++
        if (sampleIds.length < 10) {
          sampleIds.push(String((doc as any)._id))
        }
      }
    }

    grandTotal += withLegacy

    console.log(`- ${name}: ${withLegacy}/${total}`)
    if (sampleIds.length > 0) {
      console.log(`  samples: ${sampleIds.join(', ')}`)
    }
  }

  console.log(`TOTAL_DOCS_WITH_LEGACY_PHOTOS=${grandTotal}`)

  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error('AUDIT_ERROR', error)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore
  }
  process.exit(1)
})
