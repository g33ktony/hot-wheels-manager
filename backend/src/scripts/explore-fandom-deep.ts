/**
 * Explorador profundo - Busca Elite 64, RLC por año, Mainline, etc.
 */
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function deepExplore() {
  try {
    console.log('🔎 BÚSQUEDA PROFUNDA DE CATEGORÍAS\n')
    console.log(`${'='.repeat(70)}\n`)

    // Obtiene TODAS las categorías
    let allCategories: string[] = []
    let cmcontinue = ''
    let batch = 0

    console.log('📥 Descargando todas las categorías...\n')

    while (true) {
      const params = new URLSearchParams({
        action: 'query',
        list: 'allcategories',
        acmin: '1',
        aclimit: '500',
        format: 'json'
      })

      if (cmcontinue) {
        params.append('accontinue', cmcontinue)
      }

      const response = await axios.get(`${FANDOM_API}?${params}`)
      const allcats = response.data.query?.allcategories || []

      batch++
      console.log(`  Lote ${batch}: ${allcats.length} categorías`)

      for (const cat of allcats) {
        allCategories.push(cat['*'])
      }

      cmcontinue = response.data.query?.continue?.accontinue

      if (!cmcontinue) break

      await sleep(600)
    }

    console.log(`\n✅ Total de categorías descargadas: ${allCategories.length}\n`)

    // Busca patrones específicos
    const patterns = {
      'Elite 64': allCategories.filter(c => c.toLowerCase().includes('elite')),
      'RLC/Red Line': allCategories.filter(c => c.toLowerCase().includes('red line') || c.toLowerCase().includes('rlc')),
      'Mainline': allCategories.filter(c => c.toLowerCase().includes('mainline')),
      'Treasure Hunt': allCategories.filter(c => c.toLowerCase().includes('treasure')),
      'Years': allCategories.filter(c => /^\d{4}$/.test(c))
    }

    console.log(`${'='.repeat(70)}`)
    console.log('🏷️  CATEGORÍAS POR TIPO\n')

    for (const [type, cats] of Object.entries(patterns)) {
      console.log(`\n${type} (${cats.length} categorías):`)
      cats.slice(0, 20).forEach((cat, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${cat}`)
      })
      if (cats.length > 20) {
        console.log(`  ... y ${cats.length - 20} más`)
      }
    }

    // Ahora intenta scrapear de categorías reales
    console.log(`\n${'='.repeat(70)}`)
    console.log('📄 EXPLORANDO CONTENIDO DE EJEMPLOS\n')

    // Elite 64
    if (patterns['Elite 64'].length > 0) {
      const elite = patterns['Elite 64'][0]
      console.log(`Explorando: ${elite}`)

      const pagesParams = new URLSearchParams({
        action: 'query',
        list: 'categorymembers',
        cmtitle: `Category:${elite}`,
        cmlimit: '5',
        format: 'json'
      })

      const pagesResponse = await axios.get(`${FANDOM_API}?${pagesParams}`)
      const pages = pagesResponse.data.query?.categorymembers || []
      
      console.log(`  → ${pages.length} páginas encontradas`)
      pages.slice(0, 3).forEach((p: any) => {
        console.log(`     - ${p.title}`)
      })
      console.log()
    }

    // RLC por año
    const rlcCat = patterns['RLC/Red Line'][0]
    if (rlcCat) {
      console.log(`Explorando: ${rlcCat}`)

      const pagesParams = new URLSearchParams({
        action: 'query',
        list: 'categorymembers',
        cmtitle: `Category:${rlcCat}`,
        cmlimit: '5',
        format: 'json'
      })

      const pagesResponse = await axios.get(`${FANDOM_API}?${pagesParams}`)
      const pages = pagesResponse.data.query?.categorymembers || []
      
      console.log(`  → ${pages.length} páginas encontradas`)
      pages.slice(0, 3).forEach((p: any) => {
        console.log(`     - ${p.title}`)
      })
      console.log()
    }

    // Year 2024
    const year2024 = patterns['Years'].find(y => y === '2024')
    if (year2024) {
      console.log(`Explorando: ${year2024}`)

      const pagesParams = new URLSearchParams({
        action: 'query',
        list: 'categorymembers',
        cmtitle: `Category:${year2024}`,
        cmlimit: '5',
        format: 'json'
      })

      const pagesResponse = await axios.get(`${FANDOM_API}?${pagesParams}`)
      const pages = pagesResponse.data.query?.categorymembers || []
      
      console.log(`  → ${pages.length} páginas encontradas`)
      pages.slice(0, 3).forEach((p: any) => {
        console.log(`     - ${p.title}`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

deepExplore()
