/**
 * Debug script to test parsing logic
 */
import axios from 'axios'

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'

async function testParsing() {
  const params = new URLSearchParams({
    action: 'query',
    titles: '4-Loop Crashout',
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    formatversion: '2'
  })

  try {
    const response = await axios.get(`${FANDOM_API}?${params}`)
    const page = response.data.query?.pages?.[0]

    if (!page || !page.revisions || !page.revisions[0].content) {
      console.log('No content found')
      return
    }

    const wikitext = page.revisions[0].content
    console.log('WIKITEXT:')
    console.log(wikitext)
    console.log('\n' + '='.repeat(50))

    // Test casting template parsing
    const match = wikitext.match(/\{\{casting([\s\S]*?)\}\}/)
    if (match) {
      console.log('CASTING TEMPLATE FOUND:')
      console.log(match[0])

      const content = match[1]
      const fields: Record<string, string> = {}

      const lines = content.split('|')
      console.log('\nPARSED LINES:')
      for (const line of lines) {
        console.log(`  "${line}"`)
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
          const cleanKey = key.trim().toLowerCase()
          const cleanValue = valueParts.join('=').trim()
          fields[cleanKey] = cleanValue
          console.log(`    ${cleanKey} = "${cleanValue}"`)
        }
      }

      console.log('\nFINAL FIELDS:')
      console.log(JSON.stringify(fields, null, 2))

      const vehicle = {
        carModel: fields.name || '4-Loop Crashout',
        toy_num: fields.number || fields.toy || 'N/A',
        year: fields.year || fields.years || '2024',
        color: fields.color || '',
        series: fields.series || '2024',
        col_num: fields.number || '',
        tampo: fields.tampo || '',
        wheel_type: fields.wheels || '',
        photo_url: fields.image ? `https://static.wikia.nocookie.net/hotwheels/images/${fields.image.replace(/ /g, '_')}` : undefined
      }

      console.log('\nPARSED VEHICLE:')
      console.log(JSON.stringify(vehicle, null, 2))
    } else {
      console.log('NO CASTING TEMPLATE FOUND')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

testParsing()