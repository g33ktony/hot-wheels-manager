/**
 * Explorador de Categorías - Descubre cómo están estructuradas en Fandom
 */
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'

async function exploreFandomCategories() {
  try {
    console.log('🔍 Explorando estructura de Fandom...\n')

    // Obtiene todas las categorías
    const allCatsParams = new URLSearchParams({
      action: 'query',
      list: 'allcategories',
      acmin: '1',
      aclimit: '500',
      format: 'json'
    })

    const catsResponse = await axios.get(`${FANDOM_API}?${allCatsParams}`)
    const categories = catsResponse.data.query?.allcategories || []

    // Filtra las que probablemente sean Hot Wheels series
    const relevantCats = categories.filter((cat: any) => {
      const name = cat['*'].toLowerCase()
      return name.includes('mainline') || 
             name.includes('rlc') || 
             name.includes('red line') ||
             name.includes('elite') ||
             name.includes('treasure') ||
             name.includes('premium') ||
             name.includes('collector') ||
             /^\d{4}/.test(cat['*']) // Años
    }).slice(0, 50)

    console.log(`📂 Categorías encontradas (primeras 50):\n`)
    relevantCats.forEach((cat: any, i: number) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${cat['*']}`)
    })

    console.log(`\n\nAhora buscando páginas de ejemplo...`)

    // Busca un ejemplo específico
    const exampleCategory = 'Mainline 2024'
    console.log(`\n🔎 Buscando páginas en: "${exampleCategory}"\n`)

    const pagesParams = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${exampleCategory}`,
      cmlimit: '10',
      format: 'json'
    })

    const pagesResponse = await axios.get(`${FANDOM_API}?${pagesParams}`)
    const pages = pagesResponse.data.query?.categorymembers || []

    if (pages.length > 0) {
      console.log(`Encontradas ${pages.length} páginas:\n`)
      pages.forEach((page: any, i: number) => {
        console.log(`${(i + 1)}. ${page.title}`)
      })

      // Obtiene contenido de la primera página
      if (pages.length > 0) {
        console.log(`\n📄 Contenido de: "${pages[0].title}"\n`)
        const contentParams = new URLSearchParams({
          action: 'query',
          titles: pages[0].title,
          prop: 'revisions',
          rvprop: 'content',
          format: 'json'
        })

        const contentResponse = await axios.get(`${FANDOM_API}?${contentParams}`)
        const pageData = Object.values(contentResponse.data.query?.pages || {})[0] as any
        const content = pageData.revisions?.[0]?.['*'] || ''

        // Muestra primeras 2000 caracteres
        console.log(content.substring(0, 2000))
        console.log(`\n... (${content.length} caracteres totales)`)
      }
    } else {
      console.log(`❌ No encontradas páginas en "${exampleCategory}"`)
      console.log(`\nIntentando con "Red Line Club"...`)

      const rlcParams = new URLSearchParams({
        action: 'query',
        list: 'categorymembers',
        cmtitle: 'Category:Red Line Club',
        cmlimit: '10',
        format: 'json'
      })

      const rlcResponse = await axios.get(`${FANDOM_API}?${rlcParams}`)
      const rlcPages = rlcResponse.data.query?.categorymembers || []

      if (rlcPages.length > 0) {
        console.log(`\n✅ Encontradas ${rlcPages.length} páginas de RLC:\n`)
        rlcPages.forEach((page: any, i: number) => {
          console.log(`${(i + 1)}. ${page.title}`)
        })
      } else {
        console.log(`❌ No encontradas categorías de RLC tampoco`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

exploreFandomCategories()
