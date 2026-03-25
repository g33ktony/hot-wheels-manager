import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PhotoUploadSection from '../components/PhotoUploadSection'
import { convertImageUrl } from '../utils/imageUtils'
import './CatalogDetailPage.css'

interface DetailItem {
    _id: string
    toy_num: string
    carModel: string
    series: string
    year: string
    color?: string
    colorGroup?: string
    colorVariant?: string
    colorHex?: string
    hwSeriesType?: string
    tampo?: string
    wheel_type?: string
    segment?: string
    photo_url?: string
    photo_url_carded?: string
    photo_gallery?: string[]
    [key: string]: any
}

export default function CatalogDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const [item, setItem] = useState<DetailItem | null>(null)
    const [edited, setEdited] = useState<Partial<DetailItem>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showPhotos, setShowPhotos] = useState(true)
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

    const resolveCatalogId = (rawId: string | undefined): string => {
        if (!rawId) return ''

        if (!rawId.startsWith('ref_')) {
            return rawId
        }

        try {
            const base64 = rawId.slice(4).replace(/-/g, '+').replace(/_/g, '/')
            const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
            const binary = atob(paddedBase64)
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

            return new TextDecoder().decode(bytes)
        } catch {
            return rawId
        }
    }

    const stateCatalogId = (location.state as { catalogItemId?: string } | null)?.catalogItemId
    const catalogId = stateCatalogId ? String(stateCatalogId) : resolveCatalogId(id)

    useEffect(() => {
        loadItem()
    }, [id, stateCatalogId])

    const loadItem = async () => {
        if (!catalogId) {
            setError('ID de item inválido')
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const encodedId = encodeURIComponent(catalogId || '')
            const res = await fetch(`/api/catalog/items/${encodedId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            const json = await res.json()

            if (json.success) {
                setItem(json.data)
                setEdited({})
                setFailedImages(new Set()) // Limpiar imágenes fallidas cuando se carga nuevo item
            } else {
                setError(json.error || 'Error loading item')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading item')
        } finally {
            setLoading(false)
        }
    }

    const handleFieldChange = (field: string, value: any) => {
        setEdited({ ...edited, [field]: value })
    }

    const handleImageError = (imageKey: string) => {
        setFailedImages(prev => new Set([...prev, imageKey]))
    }

    const getImageSrc = (url: string | undefined, imageKey: string): string => {
        if (!url || failedImages.has(imageKey)) {
            return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="%23999"%3E📷 No disponible%3C/text%3E%3C/svg%3E'
        }
        const converted = convertImageUrl(url)
        return converted || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="%23999"%3E📷 No disponible%3C/text%3E%3C/svg%3E'
    }

    const handleSave = async () => {
        if (!item || Object.keys(edited).length === 0) return

        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const encodedId = encodeURIComponent(catalogId || '')
            const res = await fetch(`/api/catalog/items/${encodedId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(edited),
            })

            const json = await res.json()

            if (json.success) {
                setItem(json.data)
                setEdited({})
                setSuccess('Item actualizado correctamente ✅')
                setTimeout(() => setSuccess(''), 3000)
            } else {
                setError(json.error || 'Error updating item')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error updating item')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="detail-loading">⏳ Cargando...</div>
    }

    if (!item) {
        return (
            <div className="detail-error">
                <p>❌ {error || 'Item no encontrado'}</p>
                <button onClick={() => navigate(-1)} className="back-btn">
                    ← Volver
                </button>
            </div>
        )
    }

    const editableFields = [
        { key: 'carModel', label: 'Modelo', type: 'text' },
        { key: 'color', label: 'Color Original', type: 'text' },
        { key: 'colorGroup', label: 'Grupo de Color', type: 'text' },
        { key: 'colorVariant', label: 'Variante de Color', type: 'text' },
        { key: 'colorHex', label: 'Color Hex', type: 'text' },
        { key: 'tampo', label: 'Tampo', type: 'text' },
        { key: 'wheel_type', label: 'Tipo de Rueda', type: 'text' },
        { key: 'segment', label: 'Segmento', type: 'text' },
    ]

    return (
        <div className="catalog-detail-page">
            <div className="detail-header">
                <button onClick={() => navigate(-1)} className="back-btn">
                    ← Volver
                </button>
                <h1>{item.carModel}</h1>
                <p className="toy-num">#{item.toy_num}</p>
            </div>

            {error && <div className="error-banner">{error}</div>}
            {success && <div className="success-banner">{success}</div>}

            <div className="detail-content">
                {/* Panel fotográfico */}
                <div className="photo-panel">
                    <div className="photo-main">
                        {item.photo_url ? (
                            <img
                                src={getImageSrc(item.photo_url, 'photo_main')}
                                alt={item.carModel}
                                onError={() => handleImageError('photo_main')}
                            />
                        ) : (
                            <div className="no-photo">📷 Sin foto principal</div>
                        )}
                    </div>

                    <div className="photo-thumbnails">
                        {item.photo_url_carded && (
                            <a href={getImageSrc(item.photo_url_carded, 'photo_carded') || '#'} target="_blank" rel="noopener noreferrer" className="thumb">
                                <img
                                    src={getImageSrc(item.photo_url_carded, 'photo_carded')}
                                    alt="Carded"
                                    title="Foto empaque"
                                    onError={() => handleImageError('photo_carded')}
                                />
                            </a>
                        )}
                        {Array.isArray(item.photo_gallery) &&
                            item.photo_gallery.map((url, idx) => (
                                <a key={idx} href={getImageSrc(url, `photo_gallery_${idx}`) || '#'} target="_blank" rel="noopener noreferrer" className="thumb">
                                    <img
                                        src={getImageSrc(url, `photo_gallery_${idx}`)}
                                        alt={`Gallery ${idx}`}
                                        onError={() => handleImageError(`photo_gallery_${idx}`)}
                                    />
                                </a>
                            ))}
                    </div>

                    <button onClick={() => setShowPhotos(!showPhotos)} className="toggle-photos">
                        {showPhotos ? '🔽' : '🔼'} Gestión de Fotos
                    </button>
                </div>

                {/* Información y edición */}
                <div className="info-panel">
                    {/* Información de solo lectura */}
                    <div className="read-only-section">
                        <h2>Información General</h2>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Toy Number</label>
                                <div className="value">{item.toy_num}</div>
                            </div>
                            <div className="info-item">
                                <label>Col Number</label>
                                <div className="value">{item.col_num || '-'}</div>
                            </div>
                            <div className="info-item">
                                <label>Serie</label>
                                <div className="value">{item.series}</div>
                            </div>
                            <div className="info-item">
                                <label>Año</label>
                                <div className="value">{item.year}</div>
                            </div>
                            <div className="info-item">
                                <label>Tipo HW</label>
                                <div className="value">{item.hwSeriesType || '-'}</div>
                            </div>
                            <div className="info-item">
                                <label>País</label>
                                <div className="value">{item.country || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Formulario de edición */}
                    <div className="edit-section">
                        <h2>Editar Información</h2>
                        <div className="form-grid">
                            {editableFields.map((field) => (
                                <div key={field.key} className="form-group">
                                    <label htmlFor={field.key}>{field.label}</label>
                                    <input
                                        id={field.key}
                                        type={field.type}
                                        value={edited[field.key] ?? item[field.key] ?? ''}
                                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                        className="form-input"
                                        placeholder={item[field.key] ? undefined : 'Sin valor'}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="form-actions">
                            {Object.keys(edited).length > 0 && (
                                <div className="changes-note">
                                    💡 {Object.keys(edited).length} campo(s) modificado(s)
                                </div>
                            )}
                            <button onClick={handleSave} disabled={saving || Object.keys(edited).length === 0} className="save-btn">
                                {saving ? '⏳' : '💾'} {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                            {Object.keys(edited).length > 0 && (
                                <button
                                    onClick={() => {
                                        setEdited({})
                                        setError('')
                                    }}
                                    className="cancel-btn"
                                >
                                    ✕ Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Gestión de fotos */}
            {showPhotos && catalogId && <PhotoUploadSection itemId={catalogId} onPhotoUploaded={loadItem} />}
        </div>
    )
}
