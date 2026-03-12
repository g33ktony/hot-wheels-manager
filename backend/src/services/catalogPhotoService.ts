import axios from 'axios'

/**
 * Servicio de validación y priorización de fotos
 */

export class CatalogPhotoService {
  private static FANDOM_API = 'https://hotwheels.fandom.com/api.php'
  private static resolvedWikiUrlsCache = new Map<string, string | null>() // Cache para evitar llamadas repetidas

  /**
   * Resuelve una URL de tipo wiki-file: a una URL HTTPS de CDN.
   * Usa un caché para evitar llamadas repetidas a la API.
   */
  static async resolveWikiFileUrl(wikiFileUrl: string): Promise<string | undefined> {
    if (!wikiFileUrl.startsWith('wiki-file:')) {
      return wikiFileUrl // No es una URL wiki-file, retornar tal cual
    }

    const cached = this.resolvedWikiUrlsCache.get(wikiFileUrl)
    if (cached !== undefined) {
      return cached || undefined // Retornar del caché (null significa no resuelto)
    }

    const fileName = wikiFileUrl.replace('wiki-file:', '')
    if (!fileName.trim()) {
      this.resolvedWikiUrlsCache.set(wikiFileUrl, null)
      return undefined
    }

    const params = new URLSearchParams({
      action: 'query',
      titles: `File:${fileName.replace(/_/g, ' ')}`, // Fandom usa espacios en los títulos de archivo
      prop: 'imageinfo',
      iiprop: 'url',
      format: 'json',
      formatversion: '2',
    })

    try {
      const response = await axios.get(`${this.FANDOM_API}?${params}`)
      const page = response.data.query?.pages?.[0]

      if (page && !page.missing && page.imageinfo?.[0]?.url) {
        const resolvedUrl = page.imageinfo[0].url
        this.resolvedWikiUrlsCache.set(wikiFileUrl, resolvedUrl)
        return resolvedUrl
      }
    } catch (error) {
      console.warn(`⚠️ Error al resolver wiki-file: ${wikiFileUrl}:`, (error as Error).message)
    }

    this.resolvedWikiUrlsCache.set(wikiFileUrl, null)
    return undefined
  }

  /**
   * Resuelve múltiples wiki-file: URLs en lote (hasta 50 por request).
   * Mucho más eficiente que resolver una por una.
   */
  static async resolveWikiFilesBatch(wikiFileUrls: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    
    // Filtrar las que ya están en caché
    const toResolve: string[] = []
    for (const url of wikiFileUrls) {
      if (!url.startsWith('wiki-file:')) continue
      const cached = this.resolvedWikiUrlsCache.get(url)
      if (cached !== undefined) {
        if (cached) results.set(url, cached)
      } else {
        toResolve.push(url)
      }
    }

    if (toResolve.length === 0) return results

    // Procesar en lotes de 50 (límite de la API MediaWiki)
    const BATCH_SIZE = 50
    for (let i = 0; i < toResolve.length; i += BATCH_SIZE) {
      const batch = toResolve.slice(i, i + BATCH_SIZE)
      const titles = batch.map(url => {
        const fileName = url.replace('wiki-file:', '')
        return `File:${fileName.replace(/_/g, ' ')}`
      }).join('|')

      const params = new URLSearchParams({
        action: 'query',
        titles,
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json',
        formatversion: '2',
      })

      try {
        const response = await axios.get(`${this.FANDOM_API}?${params}`)
        const pages = response.data.query?.pages || []

        for (const page of pages) {
          if (!page || page.missing || !page.imageinfo?.[0]?.url) continue
          const resolvedUrl = page.imageinfo[0].url
          // Map back from "File:Some Name.jpg" to the original wiki-file: URL
          const normalizedTitle = (page.title || '').replace(/^File:/i, '').replace(/ /g, '_')
          const originalUrl = batch.find(url => {
            const fn = url.replace('wiki-file:', '')
            return fn === normalizedTitle || fn.replace(/_/g, ' ') === normalizedTitle.replace(/_/g, ' ')
          })
          if (originalUrl) {
            this.resolvedWikiUrlsCache.set(originalUrl, resolvedUrl)
            results.set(originalUrl, resolvedUrl)
          }
        }

        // Mark unresolved as null in cache
        for (const url of batch) {
          if (!results.has(url) && !this.resolvedWikiUrlsCache.has(url)) {
            this.resolvedWikiUrlsCache.set(url, null)
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error en lote de resolución wiki-file (${batch.length} URLs):`, (error as Error).message)
        for (const url of batch) {
          if (!this.resolvedWikiUrlsCache.has(url)) {
            this.resolvedWikiUrlsCache.set(url, null)
          }
        }
      }

      // Rate limit
      if (i + BATCH_SIZE < toResolve.length) {
        await new Promise(r => setTimeout(r, 150))
      }
    }

    return results
  }

  /**
   * Resuelve TODAS las wiki-file: URLs en un array de items, reemplazándolas in-place
   * con URLs HTTPS de CDN. Modifica photo_url, photo_url_carded y photo_gallery.
   * Retorna estadísticas de resolución.
   */
  static async resolveAllWikiUrls(
    items: any[],
    onProgress?: (resolved: number, total: number) => void
  ): Promise<{ total: number; resolved: number; failed: number }> {
    // 1. Recopilar todas las wiki-file: URLs únicas
    const allWikiUrls = new Set<string>()
    for (const item of items) {
      if (item.photo_url && String(item.photo_url).startsWith('wiki-file:')) {
        allWikiUrls.add(item.photo_url)
      }
      if (item.photo_url_carded && String(item.photo_url_carded).startsWith('wiki-file:')) {
        allWikiUrls.add(item.photo_url_carded)
      }
      if (Array.isArray(item.photo_gallery)) {
        for (const url of item.photo_gallery) {
          if (url && String(url).startsWith('wiki-file:')) {
            allWikiUrls.add(url)
          }
        }
      }
    }

    const totalWiki = allWikiUrls.size
    if (totalWiki === 0) return { total: 0, resolved: 0, failed: 0 }

    console.log(`🔗 Resolviendo ${totalWiki} URLs wiki-file: únicas...`)

    // 2. Resolver en lotes
    const resolvedMap = await this.resolveWikiFilesBatch(Array.from(allWikiUrls))
    const resolvedCount = resolvedMap.size
    const failedCount = totalWiki - resolvedCount

    console.log(`   ✅ Resueltas: ${resolvedCount} | ❌ Fallidas: ${failedCount}`)

    // 3. Reemplazar in-place en todos los items
    let replacements = 0
    for (const item of items) {
      if (item.photo_url && resolvedMap.has(item.photo_url)) {
        item.photo_url = resolvedMap.get(item.photo_url)
        replacements++
      }
      if (item.photo_url_carded && resolvedMap.has(item.photo_url_carded)) {
        item.photo_url_carded = resolvedMap.get(item.photo_url_carded)
        replacements++
      }
      if (Array.isArray(item.photo_gallery)) {
        for (let g = 0; g < item.photo_gallery.length; g++) {
          if (item.photo_gallery[g] && resolvedMap.has(item.photo_gallery[g])) {
            item.photo_gallery[g] = resolvedMap.get(item.photo_gallery[g])
            replacements++
          }
        }
      }
    }

    console.log(`   🔄 ${replacements} campos de foto actualizados en items`)
    if (onProgress) onProgress(resolvedCount, totalWiki)

    return { total: totalWiki, resolved: resolvedCount, failed: failedCount }
  }

  /**
   * Prioriza fotos según: Main → Carded (validado) → Gallery (primer https válido)
   * Retorna la foto que debe usarse y su fuente
   */
  static prioritizePhoto(
    item: any,
    validateCardedFn?: (item: any, cardedName: string) => boolean
  ): {
    photoUrl: string | undefined
    source: 'main' | 'carded' | 'gallery' | 'none'
    cardedValidated: boolean
  } {
    // 1. Main photo
    if (this.isValidPhotoUrl(item.photo_url)) {
      return {
        photoUrl: item.photo_url,
        source: 'main',
        cardedValidated: false,
      }
    }

    // 2. Carded photo (con validación)
    if (item.photo_url_carded && this.isValidPhotoUrl(item.photo_url_carded)) {
      const cardedName = String(item.photo_url_carded)
      const isValid = validateCardedFn ? validateCardedFn(item, cardedName) : true

      if (isValid) {
        return {
          photoUrl: item.photo_url_carded,
          source: 'carded',
          cardedValidated: true,
        }
      }
    }

    // 3. Gallery (primer HTTPS o wiki-file válido)
    if (Array.isArray(item.photo_gallery) && item.photo_gallery.length > 0) {
      for (const galleryUrl of item.photo_gallery) {
        if (this.isValidPhotoUrl(galleryUrl)) {
          return {
            photoUrl: galleryUrl,
            source: 'gallery',
            cardedValidated: false,
          }
        }
      }
    }

    // No hay foto válida
    return {
      photoUrl: undefined,
      source: 'none',
      cardedValidated: false,
    }
  }

  /**
   * Valida si una URL de foto es válida
   * Soporta https://, wiki-file: y cloudinary URLs
   */
  private static isValidPhotoUrl(url: string | undefined): boolean {
    if (!url || !String(url).trim()) return false

    const urlStr = String(url).trim()
    return (
      urlStr.startsWith('https://') ||
      urlStr.startsWith('http://') ||
      urlStr.startsWith('wiki-file:') ||
      urlStr.startsWith('data:image')
    )
  }

  /**
   * Cuenta estadísticas de cobertura de fotos
   */
  static calculatePhotoCoverage(items: any[]): {
    total: number
    withMainPhoto: number
    withCardedPhoto: number
    withGallery: number
    withoutPhoto: number
    percentWithMainPhoto: number
  } {
    const total = items.length
    let withMain = 0
    let withCarded = 0
    let withGallery = 0
    let withoutAny = 0

    for (const item of items) {
      const hasMain = this.isValidPhotoUrl(item.photo_url)
      const hasCarded = this.isValidPhotoUrl(item.photo_url_carded)
      const hasGallery =
        Array.isArray(item.photo_gallery) &&
        item.photo_gallery.some((url: any) => this.isValidPhotoUrl(url))

      if (hasMain) withMain++
      if (hasCarded) withCarded++
      if (hasGallery) withGallery++
      if (!hasMain && !hasCarded && !hasGallery) withoutAny++
    }

    return {
      total,
      withMainPhoto: withMain,
      withCardedPhoto: withCarded,
      withGallery,
      withoutPhoto: withoutAny,
      percentWithMainPhoto: total > 0 ? Math.round((withMain / total) * 1000) / 10 : 0,
    }
  }

  /**
   * Limpia y normaliza URLs de fotos
   * Decodifica si están encodadas
   */
  static normalizePhotoUrl(url: string): string {
    if (!url) return ''

    try {
      // Si es una URL encodada, decodificar
      if (url.includes('%')) {
        return decodeURIComponent(url)
      }
      return url.trim()
    } catch (e) {
      return url.trim()
    }
  }

  /**
   * Obtiene extensión y tipo de foto
   */
  static getPhotoType(url: string): { extension: string; isWiki: boolean } {
    if (url.startsWith('wiki-file:')) {
      const filename = url.replace('wiki-file:', '')
      const ext = filename.split('.').pop()?.toLowerCase() || 'unknown'
      return { extension: ext, isWiki: true }
    }

    if (url.includes('cloudinary.com')) {
      // Fuerza formato webp en cloudinary: .../v1/.../image.webp
      return { extension: 'webp', isWiki: false }
    }

    const urlObj = new URL(url)
    const path = urlObj.pathname
    const ext = path.split('.').pop()?.toLowerCase() || 'jpg'
    return { extension: ext, isWiki: false }
  }
}
