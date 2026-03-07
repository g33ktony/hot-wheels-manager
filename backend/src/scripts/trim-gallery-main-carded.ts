import fs from 'fs'
import path from 'path'

const jsonPath = path.join(__dirname, '../../data/hotwheels_database.json')

function main() {
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ No existe archivo: ${jsonPath}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(jsonPath, 'utf8')
  const items = JSON.parse(raw)

  if (!Array.isArray(items)) {
    console.error('❌ El JSON no es un arreglo')
    process.exit(1)
  }

  let changed = 0
  let withGallery = 0

  const normalized = items.map((item: any) => {
    const mainPhoto = typeof item.photo_url === 'string' && item.photo_url.trim() ? item.photo_url.trim() : ''
    const cardedPhoto = typeof item.photo_url_carded === 'string' && item.photo_url_carded.trim() ? item.photo_url_carded.trim() : ''

    const newGallery = Array.from(new Set([mainPhoto, cardedPhoto].filter(Boolean)))
    const oldGallery = Array.isArray(item.photo_gallery) ? item.photo_gallery : []

    if (JSON.stringify(oldGallery) !== JSON.stringify(newGallery)) {
      changed++
    }

    if (newGallery.length > 0) {
      withGallery++
    }

    return {
      ...item,
      photo_gallery: newGallery,
    }
  })

  fs.writeFileSync(jsonPath, JSON.stringify(normalized, null, 2), 'utf8')

  console.log('✅ Galerías normalizadas a [main, carded]')
  console.log(`   Total items: ${normalized.length}`)
  console.log(`   Items con gallery: ${withGallery}`)
  console.log(`   Items modificados: ${changed}`)
}

main()
