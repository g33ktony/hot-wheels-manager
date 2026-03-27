import { useState } from 'react'
import { uploadImageToCloudinary } from '@/services/cloudinary'
import './PhotoUploadSection.css'

interface PhotoUploadSectionProps {
    itemId: string
    onPhotoUploaded?: () => void
}

export default function PhotoUploadSection({ itemId, onPhotoUploaded }: PhotoUploadSectionProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadType, setUploadType] = useState<'main' | 'carded' | 'gallery'>('main')
    const [uploadError, setUploadError] = useState('')
    const [uploadSuccess, setUploadSuccess] = useState('')
    const [preview, setPreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            setUploadError('Por favor selecciona una imagen válida')
            return
        }

        // Validar tamaño (10MB máximo)
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('El archivo es demasiado grande (máximo 10MB)')
            return
        }

        setSelectedFile(file)
        setUploadError('')

        // Preview
        const reader = new FileReader()
        reader.onload = (event) => {
            setPreview(event.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setUploading(true)
        setUploadError('')
        setUploadSuccess('')

        try {
            // 1. Upload to Cloudinary
            const cloudinaryUrl = await uploadImageToCloudinary(
                selectedFile,
                'hot-wheels-manager/catalog'
            )

            // 2. Save Cloudinary URL to backend (MongoDB + JSON cache)
            const encodedItemId = encodeURIComponent(itemId)
            const res = await fetch(`/api/catalog/items/${encodedItemId}/photos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    photoType: uploadType,
                    photoUrl: cloudinaryUrl,
                }),
            })

            const json = await res.json()

            if (json.success) {
                setUploadSuccess(`✅ ${uploadType === 'main' ? 'Foto principal' : uploadType === 'carded' ? 'Foto empaque' : 'Foto galería'} guardada`)
                setSelectedFile(null)
                setPreview(null)
                setTimeout(() => {
                    setUploadSuccess('')
                    onPhotoUploaded?.()
                }, 2000)
            } else {
                setUploadError(json.error || 'Error guardando foto')
            }
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Error subiendo foto')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="photo-upload-section">
            <div className="upload-container">
                <h2>📸 Gestión de Fotos</h2>

                <div className="upload-type-selector">
                    <label>
                        <input
                            type="radio"
                            value="main"
                            checked={uploadType === 'main'}
                            onChange={(e) => setUploadType(e.target.value as any)}
                        />
                        Foto Principal
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="carded"
                            checked={uploadType === 'carded'}
                            onChange={(e) => setUploadType(e.target.value as any)}
                        />
                        Foto Empaque
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="gallery"
                            checked={uploadType === 'gallery'}
                            onChange={(e) => setUploadType(e.target.value as any)}
                        />
                        Agregar a Galería
                    </label>
                </div>

                <div className="upload-area">
                    {preview ? (
                        <div className="preview-container">
                            <img src={preview} alt="Preview" className="preview-image" />
                            <div className="preview-actions">
                                <label className="change-btn">
                                    🔄 Cambiar
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                                <button onClick={() => setPreview(null)} className="remove-btn">
                                    ✕ Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="drop-zone">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                disabled={uploading}
                                style={{ display: 'none' }}
                            />
                            <div className="drop-icon">📁</div>
                            <div className="drop-text">
                                Arrastra una imagen aquí o <span className="link-text">haz clic para seleccionar</span>
                            </div>
                            <div className="drop-hint">PNG, JPG, GIF • Máximo 10MB</div>
                        </label>
                    )}
                </div>

                {uploadError && <div className="upload-error">{uploadError}</div>}
                {uploadSuccess && <div className="upload-success">{uploadSuccess}</div>}

                {preview && (
                    <button onClick={handleUpload} disabled={uploading || !selectedFile} className="upload-btn">
                        {uploading ? '⏳ Subiendo...' : '💾 Subir Foto'}
                    </button>
                )}
            </div>
        </div>
    )
}
