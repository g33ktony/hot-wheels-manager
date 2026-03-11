import { useState } from 'react'
import { convertImageUrl } from '../utils/imageUtils'

interface ResponsiveImageProps {
    url?: string
    alt: string
    onError?: () => void
}

/**
 * Componente que intenta cargar imágenes con múltiples fallbacks
 * 1. URL original convertida
 * 2. Proxy de Wikimedia si es wiki-file
 * 3. Placeholder SVG si todo falla
 */
export default function ResponsiveImage({ url, alt, onError }: ResponsiveImageProps) {
    const [failedAttempts, setFailedAttempts] = useState(0)
    const [imageSrc, setImageSrc] = useState(() => convertImageUrl(url) || '')

    const handleError = () => {
        const nextAttempt = failedAttempts + 1
        setFailedAttempts(nextAttempt)

        // Intento 1: Usar proxy imgix para Wikimedia
        if (nextAttempt === 1 && url?.startsWith('wiki-file:')) {
            const filename = url.replace('wiki-file:', '').trim().replace(/ /g, '_')
            const proxyUrl = `https://images.weserve.nl/?url=https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=600`
            setImageSrc(proxyUrl)
            return
        }

        // Intento 2: URL directa sin parámetros
        if (nextAttempt === 2 && url?.startsWith('wiki-file:')) {
            const filename = url.replace('wiki-file:', '').trim().replace(/ /g, '_')
            const directUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`
            setImageSrc(directUrl)
            return
        }

        // Final: Placeholder
        setImageSrc(
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="%23999"%3E📷 No disponible%3C/text%3E%3C/svg%3E'
        )
        onError?.()
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            onError={handleError}
            style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
        />
    )
}
