import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { Upload, Camera, X } from 'lucide-react'
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'
import imageCompression from 'browser-image-compression'
import toast from 'react-hot-toast'

interface EditingItem {
    _id?: string
    carId: string
    quantity: number | ''
    purchasePrice: number | ''
    suggestedPrice: number | ''
    actualPrice?: number
    condition: string
    location?: string
    brand?: string
    pieceType?: string
    isTreasureHunt?: boolean
    isSuperTreasureHunt?: boolean
    isFantasy?: boolean
    isChase?: boolean
    isMoto?: boolean
    isCamioneta?: boolean
    isFastFurious?: boolean
    seriesId?: string
    seriesName?: string
    seriesSize?: number
    seriesPosition?: number
    seriesPrice?: number
    notes?: string
    photos?: string[]
    primaryPhotoIndex?: number
    [key: string]: any
}

interface InventoryEditModalProps {
    isOpen: boolean
    editingItem: EditingItem | null
    isSaving: boolean
    isDark: boolean
    allBrands: string[]
    onItemChange: (item: EditingItem) => void
    onClose: () => void
    onSave: () => void
}

export default function InventoryEditModal({
    isOpen,
    editingItem,
    isSaving,
    isDark,
    allBrands,
    onItemChange,
    onClose,
    onSave,
}: InventoryEditModalProps) {
    const set = (patch: Partial<EditingItem>) => {
        if (!editingItem) return
        onItemChange({ ...editingItem, ...patch })
    }

    const { uploadImage } = useCloudinaryUpload()

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || !editingItem) return
        const compressionOptions = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
            fileType: 'image/jpeg',
        }
        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                try {
                    const compressedFile = await imageCompression(file, compressionOptions)
                    const result = await uploadImage(compressedFile)
                    if (result) {
                        onItemChange({ ...editingItem, photos: [...(editingItem.photos || []), result.url] })
                    } else {
                        toast.error('Falló la carga de imagen a Cloudinary')
                    }
                } catch (err) {
                    console.error('Error al subir imagen:', err)
                    toast.error('Error al subir imagen a Cloudinary')
                }
            }
        }
    }

    const removePhoto = (index: number) => {
        if (!editingItem) return
        onItemChange({
            ...editingItem,
            photos: (editingItem.photos || []).filter((_: any, i: number) => i !== index)
        })
    }

    return (
        <Modal
            isOpen={isOpen && editingItem !== null}
            onClose={onClose}
            title="Editar Pieza"
            maxWidth="md"
            footer={
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button variant="secondary" className="w-full sm:flex-1 h-10" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        className="w-full sm:flex-1 h-10"
                        onClick={onSave}
                        disabled={!editingItem?.carId || isSaving}
                    >
                        Actualizar Pieza
                    </Button>
                </div>
            }
        >
            {editingItem && (
                <div className="space-y-4 sm:space-y-5">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Código/ID del auto a escala
                        </label>
                        <input
                            type="text"
                            className="input w-full"
                            placeholder="ej: FHY65"
                            value={editingItem.carId}
                            onChange={(e) => set({ carId: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Cantidad
                        </label>
                        <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            className="input w-full"
                            value={editingItem.quantity || ''}
                            onChange={(e) => {
                                const v = e.target.value
                                if (v === '') { set({ quantity: '' }); return }
                                const n = parseInt(v)
                                set({ quantity: isNaN(n) ? 1 : Math.max(1, n) })
                            }}
                            onBlur={(e) => {
                                if (e.target.value === '' || parseInt(e.target.value) < 1) set({ quantity: 1 })
                            }}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Precio de Compra
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            className="input w-full"
                            placeholder="0.00"
                            value={editingItem.purchasePrice === 0 || editingItem.purchasePrice === '' ? '' : editingItem.purchasePrice}
                            onChange={(e) => {
                                const v = e.target.value.replace(/[^0-9.]/g, '')
                                if (v === '') { set({ purchasePrice: '' }); return }
                                const n = parseFloat(v)
                                set({ purchasePrice: isNaN(n) ? 0 : n })
                            }}
                            onBlur={(e) => {
                                if (e.target.value.replace(/[^0-9.]/g, '') === '') set({ purchasePrice: 0 })
                            }}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Precio Sugerido
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            className="input w-full"
                            placeholder="0.00"
                            value={editingItem.suggestedPrice === 0 || editingItem.suggestedPrice === '' ? '' : editingItem.suggestedPrice}
                            onChange={(e) => {
                                const v = e.target.value.replace(/[^0-9.]/g, '')
                                if (v === '') { set({ suggestedPrice: '' }); return }
                                const n = parseFloat(v)
                                set({ suggestedPrice: isNaN(n) ? 0 : n })
                            }}
                            onBlur={(e) => {
                                if (e.target.value.replace(/[^0-9.]/g, '') === '') set({ suggestedPrice: 0 })
                            }}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Precio Actual (Opcional)
                        </label>
                        <input
                            type="text"
                            className="input w-full"
                            placeholder="0.00"
                            value={editingItem.actualPrice === 0 || editingItem.actualPrice === undefined ? '' : editingItem.actualPrice}
                            onChange={(e) => {
                                const v = e.target.value.replace(/[^0-9.]/g, '')
                                const n = v === '' ? undefined : parseFloat(v)
                                set({ actualPrice: n === undefined || isNaN(n) ? undefined : n })
                            }}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Condición
                        </label>
                        <select
                            className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                            value={editingItem.condition}
                            onChange={(e) => set({ condition: e.target.value })}
                        >
                            <option value="mint">Mint</option>
                            <option value="good">Bueno</option>
                            <option value="fair">Regular</option>
                            <option value="poor">Malo</option>
                        </select>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Ubicación Física (Opcional)
                        </label>
                        <input
                            type="text"
                            className="input w-full"
                            placeholder="ej: Caja A, Estante 3"
                            value={editingItem.location || ''}
                            onChange={(e) => set({ location: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Marca
                        </label>
                        <select
                            className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                            value={editingItem.brand || ''}
                            onChange={(e) => set({ brand: e.target.value })}
                        >
                            <option value="">Sin marca</option>
                            {allBrands.map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                    </div>

                    {editingItem.brand && (
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                Tipo de Pieza
                            </label>
                            <select
                                className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                                value={editingItem.pieceType || ''}
                                onChange={(e) => set({ pieceType: e.target.value })}
                            >
                                <option value="">Sin tipo</option>
                                <option value="basic">Básico</option>
                                <option value="premium">Premium</option>
                                <option value="rlc">RLC</option>
                                <option value="silver_series">Silver Series</option>
                                <option value="elite_64">Elite 64</option>
                            </select>
                        </div>
                    )}

                    {editingItem.brand?.toLowerCase() === 'hot wheels' && editingItem.pieceType === 'basic' && (
                        <div className="space-y-2">
                            <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={editingItem.isTreasureHunt || false}
                                    disabled={!!editingItem.isSuperTreasureHunt}
                                    onChange={(e) => set({ isTreasureHunt: e.target.checked, isSuperTreasureHunt: false })}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span className={`text-sm font-medium ${editingItem.isSuperTreasureHunt ? (isDark ? 'text-slate-500' : 'text-gray-400') : ''}`}>
                                    🔍 Treasure Hunt (TH)
                                </span>
                            </label>
                            <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={editingItem.isSuperTreasureHunt || false}
                                    disabled={!!editingItem.isTreasureHunt}
                                    onChange={(e) => set({ isSuperTreasureHunt: e.target.checked, isTreasureHunt: false })}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span className={`text-sm font-medium ${editingItem.isTreasureHunt ? (isDark ? 'text-slate-500' : 'text-gray-400') : ''}`}>
                                    ⭐ Super Treasure Hunt (STH)
                                </span>
                            </label>
                        </div>
                    )}

                    {editingItem.brand?.toLowerCase() === 'hot wheels' && (
                        <div>
                            <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={editingItem.isFantasy || false}
                                    onChange={(e) => set({ isFantasy: e.target.checked })}
                                    className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                />
                                <span className="text-sm font-medium">🎨 Fantasía (diseño original)</span>
                            </label>
                        </div>
                    )}

                    {((editingItem.brand && ['mini gt', 'kaido house', 'm2 machines'].includes(editingItem.brand.toLowerCase())) ||
                        (editingItem.brand?.toLowerCase() === 'hot wheels' && editingItem.pieceType === 'premium')) && (
                            <div>
                                <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    <input
                                        type="checkbox"
                                        checked={editingItem.isChase || false}
                                        onChange={(e) => set({ isChase: e.target.checked })}
                                        className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                                    />
                                    <span className="text-sm font-medium">🌟 Chase</span>
                                </label>
                            </div>
                        )}

                    <div>
                        <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            <input
                                type="checkbox"
                                checked={editingItem.isMoto || false}
                                onChange={(e) => set({ isMoto: e.target.checked })}
                                className="w-4 h-4 accent-primary-600 cursor-pointer rounded"
                            />
                            <span className="text-sm font-medium">🏍️ Moto</span>
                        </label>
                    </div>

                    <div>
                        <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            <input
                                type="checkbox"
                                checked={editingItem.isCamioneta || false}
                                onChange={(e) => set({ isCamioneta: e.target.checked })}
                                className="rounded"
                            />
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>🚚 Camioneta</span>
                        </label>
                    </div>

                    <div>
                        <label className={`flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            <input
                                type="checkbox"
                                checked={editingItem.isFastFurious || false}
                                onChange={(e) => set({ isFastFurious: e.target.checked })}
                                className="rounded"
                            />
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>🏎️ Fast and Furious</span>
                        </label>
                    </div>

                    <div className={`pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Información de Serie (Opcional)</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>ID de Serie</label>
                                    <input
                                        type="text"
                                        className="input w-full text-sm"
                                        placeholder="ej: MARVEL-2024-001"
                                        value={editingItem.seriesId || ''}
                                        onChange={(e) => set({ seriesId: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>Nombre de Serie</label>
                                    <input
                                        type="text"
                                        className="input w-full text-sm"
                                        placeholder="ej: Marvel Series 2024"
                                        value={editingItem.seriesName || ''}
                                        onChange={(e) => set({ seriesName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>Tamaño Serie</label>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        className="input w-full text-sm"
                                        placeholder="5"
                                        value={editingItem.seriesSize || ''}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            if (v === '') { set({ seriesSize: undefined }); return }
                                            const n = parseInt(v)
                                            set({ seriesSize: isNaN(n) ? undefined : n })
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>Posición</label>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        className="input w-full text-sm"
                                        placeholder="1"
                                        value={editingItem.seriesPosition || ''}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            if (v === '') { set({ seriesPosition: undefined }); return }
                                            const n = parseInt(v)
                                            set({ seriesPosition: isNaN(n) ? undefined : n })
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>Precio Serie</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="input w-full text-sm"
                                        placeholder="0.00"
                                        value={editingItem.seriesPrice || ''}
                                        onChange={(e) => {
                                            const v = e.target.value.replace(/[^0-9.]/g, '')
                                            if (v === '') { set({ seriesPrice: undefined }); return }
                                            const n = parseFloat(v)
                                            set({ seriesPrice: isNaN(n) ? undefined : n })
                                        }}
                                    />
                                </div>
                            </div>
                            {editingItem.seriesId && (
                                <div className={`text-xs p-2 rounded ${isDark ? 'text-slate-300 bg-slate-700/30' : 'text-slate-600 bg-slate-100'}`}>
                                    💡 Los items con el mismo ID de serie se pueden vender como set completo
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>Notas (Opcional)</label>
                        <textarea
                            className="input w-full h-20 resize-none"
                            placeholder="Notas adicionales..."
                            value={editingItem.notes || ''}
                            onChange={(e) => set({ notes: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>Fotos</label>
                        <div className="mb-3 space-y-2">
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                                multiple
                                onChange={(e) => handleFileUpload(e.target.files)}
                                className="hidden"
                                id="photo-upload-edit"
                            />
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                                multiple
                                capture="environment"
                                onChange={(e) => handleFileUpload(e.target.files)}
                                className="hidden"
                                id="photo-camera-edit"
                            />
                            <div className="flex gap-2">
                                <label
                                    htmlFor="photo-upload-edit"
                                    className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                                >
                                    <Upload size={20} className="text-gray-400" />
                                    <span className="text-sm text-slate-400">Galería</span>
                                </label>
                                <label
                                    htmlFor="photo-camera-edit"
                                    className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                                >
                                    <Camera size={20} className="text-gray-400" />
                                    <span className="text-sm text-slate-400">Cámara</span>
                                </label>
                            </div>
                        </div>

                        {editingItem.photos && editingItem.photos.length > 0 && (
                            <div className="space-y-3">
                                <div className="border-2 border-blue-400 rounded-lg p-2 bg-blue-50">
                                    <p className="text-xs text-blue-700 font-semibold mb-2">⭐ FOTO DESTACADA</p>
                                    <img
                                        src={editingItem.photos[editingItem.primaryPhotoIndex || 0]}
                                        alt="Foto destacada"
                                        loading="lazy"
                                        className="w-full h-32 object-cover rounded"
                                    />
                                </div>
                                {editingItem.photos.length > 1 && (
                                    <div>
                                        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Doble click para cambiar foto destacada:</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {editingItem.photos.map((photo: string, index: number) => (
                                                <div
                                                    key={index}
                                                    className="relative group cursor-pointer"
                                                    onClick={() => set({ primaryPhotoIndex: index })}
                                                >
                                                    <img
                                                        src={photo}
                                                        alt={`Foto ${index + 1}`}
                                                        loading="lazy"
                                                        className={`w-full h-20 object-cover rounded border-2 transition-all ${(editingItem.primaryPhotoIndex || 0) === index
                                                            ? 'border-blue-500 ring-2 ring-blue-300'
                                                            : 'border-gray-300 hover:border-blue-400'
                                                            }`}
                                                    />
                                                    {(editingItem.primaryPhotoIndex || 0) === index && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded">
                                                            <span className="text-white text-xl">⭐</span>
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removePhoto(index) }}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    )
}
