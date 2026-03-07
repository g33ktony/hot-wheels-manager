import axios from 'axios'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { getAllCars, refreshCache, saveCarsToJSON, type CachedHotWheelsCar } from '../services/hotWheelsCacheService'

dotenv.config()

const FANDOM_API = 'https://hotwheels.fandom.com/api.php'
const REQUEST_DELAY_MS = 120

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type EnrichableCar = CachedHotWheelsCar

type ExtractedRef = {
  url: string
  text: string
}

function normalizeModel(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function toWikiFile(fileName: string): string {
  return `wiki-file:${fileName.trim().replace(/ /g, '_')}`
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function extractImageRefs(wikitext: string): ExtractedRef[] {
  const section = wikitext.match(/==(Images|Gallery)==([^]*?)(?===|$)/i)
  const standaloneGalleryBlocks = Array.from(wikitext.matchAll(/<gallery[^>]*>([^]*?)<\/gallery>/gi))
    .map(match => match[1])
    .join('\n')

  const source = section?.[2] || standaloneGalleryBlocks

  if (!source || !source.trim()) {
    return []
  }

  const refs: Array<{ file: string; description: string }> = []

  const fileRegex = /\[\[(?:File|Image):([^\]|#]+)([^\]]*)\]\]/gi
  let fileMatch: RegExpExecArray | null = null
  while ((fileMatch = fileRegex.exec(source)) !== null) {
    refs.push({
      file: fileMatch[1].trim(),
      description: (fileMatch[2] || '').toLowerCase(),
    })
  }

  const galleryBlockRegex = /<gallery[^>]*>([^]*?)<\/gallery>/gi
  let galleryMatch: RegExpExecArray | null = null
  while ((galleryMatch = galleryBlockRegex.exec(source)) !== null) {
    const lines = galleryMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    for (const line of lines) {
      const lineMatch = line.match(/^(?:File|Image):([^|#]+)\|?(.*)$/i)
      if (!lineMatch) continue
      refs.push({
        file: lineMatch[1].trim(),
        description: (lineMatch[2] || '').toLowerCase(),
      })
    }
  }

  const dedup = new Map<string, ExtractedRef>()
  for (const ref of refs) {
    const url = toWikiFile(ref.file)
    const text = `${ref.file} ${ref.description}`.toLowerCase()
    if (!dedup.has(url)) {
      dedup.set(url, { url, text })
    }
  }

  return Array.from(dedup.values())
}

function includesCardedKeyword(text: string): boolean {
  return (
    text.includes('carded') ||
    text.includes('card') ||
    text.includes('package') ||
    text.includes('boxed') ||
    text.includes('blister')
  )
}

function computeRefScore(car: EnrichableCar, refText: string): number {
  let score = 0
  const text = refText.toLowerCase()

  const toyNum = String(car.toy_num || '').trim().toLowerCase()
  if (toyNum && text.includes(toyNum)) {
    score += 8
  }

  const year = String(car.year || '').trim()
  if (year && text.includes(year)) {
    score += 4
  }

  const modelTokens = tokenize(car.carModel || '')
  for (const token of modelTokens) {
    if (token.length >= 4 && text.includes(token)) {
      score += 2
    }
  }

  const seriesTokens = tokenize(String(car.series || ''))
  for (const token of seriesTokens) {
    if (token.length >= 4 && text.includes(token)) {
      score += 1
    }
  }

  if (text.includes('prototype') || text.includes('concept') || text.includes('playset')) {
    score -= 4
  }

  return score
}

function selectMainAndCarded(car: EnrichableCar, refs: ExtractedRef[]): { main?: string; carded?: string } {
  if (refs.length === 0) return {}

  const ranked = refs
    .map(ref => ({
      ref,
      score: computeRefScore(car, ref.text),
      carded: includesCardedKeyword(ref.text),
    }))
    .sort((a, b) => b.score - a.score)

  const mainCandidate = ranked.find(item => !item.carded) || ranked[0]
  const main = mainCandidate?.ref.url

  const cardedCandidate = ranked.find(item => item.carded && item.ref.url !== main)
  const carded = cardedCandidate?.ref.url || main

  return { main, carded }
}

async function fetchPageWikitext(title: string): Promise<{ title: string; content: string | null }> {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    redirects: '1',
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    formatversion: '2',
  })

  const response = await axios.get(`${FANDOM_API}?${params}`)
  const page = response.data?.query?.pages?.[0]

  if (!page || page.missing || !page.revisions?.[0]?.content) {
    return { title, content: null }
  }

  return {
    title: page.title || title,
    content: page.revisions[0].content,
  }
}

async function findPageBySearch(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `intitle:"${query}"`,
    srlimit: '5',
    format: 'json',
  })

  const response = await axios.get(`${FANDOM_API}?${params}`)
  const results: Array<{ title: string }> = response.data?.query?.search || []
  if (results.length === 0) return null

  const exact = results.find(item => normalizeModel(item.title) === normalizeModel(query))
  return exact?.title || results[0].title || null
}

async function discoverMissingCastings(existingModels: Set<string>): Promise<string[]> {
  const discovered: string[] = []
  let cmcontinue: string | undefined

  for (let i = 0; i < 5; i++) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: 'Category:Castings',
      cmnamespace: '0',
      cmlimit: '500',
      format: 'json',
    })

    if (cmcontinue) {
      params.set('cmcontinue', cmcontinue)
    }

    const response = await axios.get(`${FANDOM_API}?${params}`)
    const members: Array<{ title: string }> = response.data?.query?.categorymembers || []

    for (const member of members) {
      const normalized = normalizeModel(member.title)
      if (!normalized || existingModels.has(normalized)) continue
      if (/^list of|^timeline of/i.test(member.title)) continue
      discovered.push(member.title)
    }

    cmcontinue = response.data?.continue?.cmcontinue
    if (!cmcontinue) break
    await sleep(80)
  }

  return Array.from(new Set(discovered)).sort()
}

async function main() {
  const limit = Number(process.env.GALLERY_ENRICH_LIMIT || 400)
  const enableDiscovery = process.env.GALLERY_DISCOVER_MODELS !== 'false'
  const replaceGallery = process.env.GALLERY_REPLACE_MODE === 'true'
  const modelFilter = (process.env.GALLERY_MODEL_FILTER || '').trim().toLowerCase()

  refreshCache()

  const cars = getAllCars().map(car => ({
    ...car,
    photo_gallery: Array.isArray(car.photo_gallery)
      ? [...car.photo_gallery]
      : [],
  })) as EnrichableCar[]

  if (cars.length === 0) {
    console.log('⚠️ No hay autos en cache para enriquecer')
    return
  }

  const modelToIndexes = new Map<string, number[]>()
  for (let i = 0; i < cars.length; i++) {
    const name = (cars[i].carModel || '').trim()
    if (!name) continue
    const key = normalizeModel(name)
    if (!key) continue
    const list = modelToIndexes.get(key) || []
    list.push(i)
    modelToIndexes.set(key, list)
  }

  let models = Array.from(modelToIndexes.keys())
  if (modelFilter) {
    models = models.filter(model => model.includes(modelFilter))
  }
  models = models.slice(0, limit)

  console.log(`🚀 Enriqueciendo galerías de ${models.length} castings (de ${modelToIndexes.size} disponibles)`)
  if (modelFilter) {
    console.log(`🎯 Filtro por modelo activo: "${modelFilter}"`)
  }
  if (replaceGallery) {
    console.log('♻️ Modo reemplazo activo: photo_gallery se recalcula desde Fandom')
  }

  let foundPages = 0
  let modelsWithMain = 0
  let modelsWithCarded = 0
  let updatedCars = 0
  const unresolvedModels: string[] = []

  for (let i = 0; i < models.length; i++) {
    const modelKey = models[i]
    const representative = cars[modelToIndexes.get(modelKey)![0]].carModel

    let page = await fetchPageWikitext(representative)
    if (!page.content) {
      const alternative = await findPageBySearch(representative)
      if (alternative) {
        await sleep(REQUEST_DELAY_MS)
        page = await fetchPageWikitext(alternative)
      }
    }

    if (!page.content) {
      unresolvedModels.push(representative)
      if ((i + 1) % 25 === 0) {
        console.log(`... ${i + 1}/${models.length} procesados (sin página: ${unresolvedModels.length})`)
      }
      await sleep(REQUEST_DELAY_MS)
      continue
    }

    foundPages++
    const refs = extractImageRefs(page.content)

    let anyMainInModel = false
    let anyCardedInModel = false

    const indexes = modelToIndexes.get(modelKey) || []
    for (const index of indexes) {
      const car = cars[index]
      const selected = selectMainAndCarded(car, refs)
      const before = JSON.stringify({
        photo_url: car.photo_url || '',
        photo_url_carded: car.photo_url_carded || '',
        photo_gallery: Array.isArray(car.photo_gallery) ? car.photo_gallery : [],
      })

      if (selected.main) {
        anyMainInModel = true
      }
      if (selected.carded) {
        anyCardedInModel = true
      }

      if (replaceGallery || !car.photo_url) {
        car.photo_url = selected.main || ''
      }
      if (replaceGallery || !car.photo_url_carded) {
        car.photo_url_carded = selected.carded || ''
      }

      // No extra gallery images by request
      car.photo_gallery = []

      const after = JSON.stringify({
        photo_url: car.photo_url || '',
        photo_url_carded: car.photo_url_carded || '',
        photo_gallery: car.photo_gallery || [],
      })

      if (before !== after) {
        updatedCars++
      }
    }

    if (anyMainInModel) modelsWithMain++
    if (anyCardedInModel) modelsWithCarded++

    if ((i + 1) % 25 === 0) {
      console.log(`... ${i + 1}/${models.length} procesados (páginas encontradas: ${foundPages}, con main: ${modelsWithMain}, con carded: ${modelsWithCarded})`)
    }

    await sleep(REQUEST_DELAY_MS)
  }

  saveCarsToJSON(cars)

  const unresolvedPath = path.join(__dirname, '../../data/gallery-enrichment-unresolved.json')
  fs.writeFileSync(
    unresolvedPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalUnresolved: unresolvedModels.length,
        unresolvedModels,
      },
      null,
      2,
    ),
    'utf-8',
  )

  if (enableDiscovery) {
    const existingSet = new Set(Array.from(modelToIndexes.keys()))
    const missingCastings = await discoverMissingCastings(existingSet)
    const discoveryPath = path.join(__dirname, '../../data/discovered-casting-pages.json')
    fs.writeFileSync(
      discoveryPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalCandidates: missingCastings.length,
          candidates: missingCastings,
        },
        null,
        2,
      ),
      'utf-8',
    )
    console.log(`🆕 Candidatos de modelos nuevos detectados: ${missingCastings.length} (guardado en data/discovered-casting-pages.json)`)
  }

  console.log('')
  console.log('✅ Enriquecimiento de galerías completado')
  console.log(`   Modelos revisados: ${models.length}`)
  console.log(`   Páginas encontradas: ${foundPages}`)
  console.log(`   Modelos con main: ${modelsWithMain}`)
  console.log(`   Modelos con carded: ${modelsWithCarded}`)
  console.log(`   Registros actualizados: ${updatedCars}`)
  console.log(`   Sin resolver: ${unresolvedModels.length}`)
  console.log('')
}

main().catch((error) => {
  console.error('❌ Error enriqueciendo galerías:', error)
  process.exit(1)
})
