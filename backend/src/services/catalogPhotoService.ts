/**
 * Servicio de validación y priorización de fotos
 */

export class CatalogPhotoService {
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
