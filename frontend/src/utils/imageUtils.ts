/**
 * Convierte diferentes formatos de URLs a URLs válidas accesibles
 */
export const convertImageUrl = (url: string | undefined): string | null => {
  if (!url || !url.trim()) {
    return null
  }

  const cleanUrl = String(url).trim()

  // Si ya es una URL https válida, devolverla
  if (cleanUrl.startsWith('https://')) {
    return cleanUrl
  }

  // Si es una URL relativa, devolverla como está (será relativa al servidor)
  if (cleanUrl.startsWith('/')) {
    return cleanUrl
  }

  // Convertir wiki-file: a URL de Wikimedia Commons
  // Formato: wiki-file:Speed_Blaster_bluprlrd3sp.JPG
  if (cleanUrl.startsWith('wiki-file:')) {
    const filename = cleanUrl.replace('wiki-file:', '')
    // URL directa a Wikimedia Commons - convert spaces to underscores
    const cleanFilename = filename.replace(/ /g, '_')
    // Crear hash MD5 de 2 caracteres para la estructura de carpetas
    const hash = cleanFilename.substring(0, 2).toLowerCase()
    return `https://images.weserve.nl/?url=https://upload.wikimedia.org/wikipedia/commons/${hash}/${cleanFilename}`
  }

  // Si es otro formato, intentar como URL directa
  if (cleanUrl.startsWith('http://')) {
    return cleanUrl
  }

  // Si no coincide con nada, devolver null
  return null
}

/**
 * Obtiene una URL de imagen válida con fallback
 */
export const getImageUrl = (url: string | undefined, fallback?: string): string => {
  const converted = convertImageUrl(url)
  return converted || fallback || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="%23999"%3E📷 Sin foto%3C/text%3E%3C/svg%3E'
}
