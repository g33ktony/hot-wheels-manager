/**
 * Convierte diferentes formatos de URLs a URLs válidas accesibles
 */
export const convertImageUrl = (url: string | undefined): string | null => {
  if (!url || !url.trim()) {
    return null
  }

  const cleanUrl = String(url).trim()
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  // Extract base URL (remove /api path if present)
  const baseUrl = apiUrl.replace(/\/api\/?$/, '')

  // Si es URL absoluta (http/https), devolverla como está
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl
  }

  // Si es una URL relativa a uploads, agregar base url (sin /api)
  if (cleanUrl.startsWith('/uploads/')) {
    return `${baseUrl}${cleanUrl}`
  }

  // Convertir wiki-file: a URL de Wikimedia Commons
  // Formato: wiki-file:Speed_Blaster_bluprlrd3sp.JPG
  if (cleanUrl.startsWith('wiki-file:')) {
    const filename = cleanUrl.replace('wiki-file:', '').trim()
    // Reemplazar espacios con guiones bajos
    const cleanFilename = filename.replace(/ /g, '_')
    // URL directa a File namespace de Commons
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${cleanFilename}?width=600`
  }

  // Si no coincide con nada, devolver null
  return null
}

/**
 * Genera múltiples URLs de fallback para una imagen
 * Útil para intentar cargar desde diferentes fuentes
 */
export const getImageFallbacks = (url: string | undefined): string[] => {
  if (!url || !url.trim()) {
    return []
  }

  const fallbacks: string[] = []
  const primary = convertImageUrl(url)

  if (primary) {
    fallbacks.push(primary)
  }

  // Si es wiki-file, agregar alternativa con proxy
  if (url.startsWith('wiki-file:')) {
    const filename = url.replace('wiki-file:', '').trim().replace(/ /g, '_')
    // Proxy mediante imgix
    fallbacks.push(
      `https://images.weserve.nl/?url=https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`
    )
  }

  // SVG placeholder al final
  fallbacks.push(
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="%23999"%3E📷 No disponible%3C/text%3E%3C/svg%3E'
  )

  return fallbacks
}

/**
 * Obtiene una URL de imagen válida con fallback a placeholder SVG
 */
export const getImageUrl = (url: string | undefined, fallback?: string): string => {
  const converted = convertImageUrl(url)
  return converted || fallback || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="%23999"%3E📷 Sin foto disponible%3C/text%3E%3C/svg%3E'
}
