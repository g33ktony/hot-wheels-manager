import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePreSaleItem, useUpdatePreSaleItem } from '@/hooks/usePresale'
import { useUpdatePreSalePhoto } from '@/hooks/usePresale'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import { uploadImageToCloudinary } from '@/services/cloudinary'
import { DollarSign, Calendar, ArrowLeft, Upload, X, Package } from 'lucide-react'
import LoadingSpinner from '@/components/common/Loading'

interface PreSaleEditItem {
    _id: string
    carId: string
    carModel?: string
    totalQuantity: number
    basePricePerUnit: number
    markupPercentage: number
    finalPricePerUnit: number
    preSalePrice?: number
    normalPrice?: number
    condition?: string
    notes?: string
    startDate: string
    endDate?: string
}

export default function PreSaleEditPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: item, isLoading, error } = usePreSaleItem(id || '')
    const updatePreSaleItem = useUpdatePreSaleItem()
    const updatePhoto = useUpdatePreSalePhoto()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState<Partial<PreSaleEditItem>>({
        totalQuantity: 1,
        basePricePerUnit: 0,
        markupPercentage: 15,
        finalPricePerUnit: 0,
        preSalePrice: 0,
        normalPrice: 0,
        condition: 'mint',
        notes: '',
        endDate: '',
    })
    const [isSaving, setIsSaving] = useState(false)
    const [photo, setPhoto] = useState<string>('')
    const [photoPreview, setPhotoPreview] = useState<string>('')

    useEffect(() => {
        if (item) {
            const formatDate = (date: any) => {
                if (!date) return ''
                if (date instanceof Date) return date.toISOString().split('T')[0]
                if (typeof date === 'string') return date.split('T')[0]
                return ''
            }

            setFormData({
                _id: item._id,
                carId: item.carId,
                carModel: (item as any).carModel,
                totalQuantity: item.totalQuantity,
                basePricePerUnit: item.basePricePerUnit,
                markupPercentage: item.markupPercentage,
                finalPricePerUnit: item.finalPricePerUnit,
                preSalePrice: (item as any).preSalePrice || 0,
                normalPrice: (item as any).normalPrice || 0,
                condition: (item as any).condition || 'mint',
                notes: (item as any).notes || '',
                startDate: formatDate(item.startDate),
                endDate: formatDate((item as any).endDate),
            })

            // Load existing photo
            if ((item as any).photo) {
                setPhoto((item as any).photo)
                setPhotoPreview((item as any).photo)
            }
        }
    }, [item])

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert('Photo must be less than 5MB')
            return
        }

        try {
            const cloudinaryUrl = await uploadImageToCloudinary(file, 'hot-wheels-manager/presales')
            setPhoto(cloudinaryUrl)
            setPhotoPreview(cloudinaryUrl)
        } catch (err) {
            console.error('Photo upload error:', err)
            alert('Failed to upload photo')
        }
    }

    const handleRemovePhoto = () => {
        setPhoto('')
        setPhotoPreview('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSavePhoto = async () => {
        if (!formData._id || !photo) return

        try {
            await updatePhoto.mutateAsync({
                id: formData._id,
                photo
            })
        } catch (error) {
            console.error('Error updating photo:', error)
        }
    }

    const handleSave = async () => {
        if (!formData._id) {
            return
        }

        setIsSaving(true)
        try {
            // Save all changes
            await updatePreSaleItem.mutateAsync({
                id: formData._id,
                data: {
                    totalQuantity: formData.totalQuantity,
                    basePricePerUnit: formData.basePricePerUnit,
                    markupPercentage: formData.markupPercentage,
                    preSalePrice: formData.preSalePrice && formData.preSalePrice > 0 ? formData.preSalePrice : undefined,
                    normalPrice: formData.normalPrice && formData.normalPrice > 0 ? formData.normalPrice : undefined,
                    condition: formData.condition,
                    notes: formData.notes,
                    endDate: formData.endDate ? new Date(formData.endDate) : undefined,
                }
            })

            // Save photo if changed
            if (photo && photo !== (item as any)?.photo) {
                await handleSavePhoto()
            }

            navigate('/presale')
        } catch (error) {
            console.error('Error updating presale:', error)
        } finally {
            setIsSaving(false)
        }
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-red-800 font-semibold mb-2">Error loading presale item</h3>
                    <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
                    <button
                        onClick={() => navigate('/presale')}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="text-gray-600 mt-4">Loading presale item...</p>
                </div>
            </div>
        )
    }

    if (!formData._id) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-yellow-800 font-semibold mb-2">Presale item not found</h3>
                    <button
                        onClick={() => navigate('/presale')}
                        className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <button
                    onClick={() => navigate('/presale')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>
                <h1 className="text-3xl font-bold text-gray-900">{formData.carModel || formData.carId}</h1>
                <p className="text-gray-600 mt-1">{formData.carId}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Edit Pre-Sale Item</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-6">
                        {/* Photo Section */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-900 mb-4">Foto del Item</h3>

                            {photoPreview ? (
                                <div className="space-y-3">
                                    <div className="relative inline-block">
                                        <img
                                            src={photoPreview}
                                            alt="Preview"
                                            className="w-full max-w-xs rounded-lg shadow-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                                    >
                                        Cambiar Foto
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition flex flex-col items-center gap-2 text-gray-600 hover:text-blue-600"
                                    >
                                        <Upload size={32} />
                                        <span className="font-medium">Subir Foto</span>
                                        <span className="text-sm">Click para seleccionar una imagen</span>
                                    </button>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                            />
                        </div>

                        {/* Base Information */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            <h3 className="font-semibold text-gray-900">Información del Item</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Car ID</label>
                                    <p className="text-lg font-semibold text-gray-900">{formData.carId}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <Package className="w-4 h-4" />
                                        Cantidad Total
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.totalQuantity || 0}
                                        onChange={(e) => setFormData({ ...formData, totalQuantity: parseInt(e.target.value) || 0 })}
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Condición</label>
                                    <select
                                        value={formData.condition || 'mint'}
                                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="mint">🔶 Mint</option>
                                        <option value="good">🟡 Good</option>
                                        <option value="fair">🟠 Fair</option>
                                        <option value="poor">🔴 Poor</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                <textarea
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Agrega notas sobre este item de pre-venta..."
                                />
                            </div>
                        </div>

                        {/* Pricing Section */}
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Información de Precios
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Precio Base / Unidad</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={formData.basePricePerUnit || 0}
                                            onChange={(e) => {
                                                const basePrice = parseFloat(e.target.value) || 0
                                                setFormData({ ...formData, basePricePerUnit: basePrice })
                                            }}
                                            step="0.01"
                                            min="0"
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Markup %</label>
                                    <input
                                        type="number"
                                        value={formData.markupPercentage || 0}
                                        onChange={(e) => {
                                            const markup = parseFloat(e.target.value) || 0
                                            setFormData({ ...formData, markupPercentage: parseFloat(markup.toFixed(2)) })
                                        }}
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Dual Pricing System */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                    <label className="block text-sm font-medium text-green-800 mb-2">
                                        Precio Normal
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={formData.normalPrice || 0}
                                            onChange={(e) => {
                                                const normalPrice = parseFloat(e.target.value) || 0
                                                setFormData({ ...formData, normalPrice: normalPrice })
                                            }}
                                            step="0.01"
                                            min="0"
                                            className="w-full pl-8 pr-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <p className="text-xs text-green-700 mt-1">Después de recibir</p>
                                </div>

                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                    <label className="block text-sm font-medium text-blue-800 mb-2">
                                        Precio Pre-Venta (Opcional)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={formData.preSalePrice || 0}
                                            onChange={(e) => {
                                                const preSalePrice = parseFloat(e.target.value) || 0
                                                setFormData({ ...formData, preSalePrice: preSalePrice })
                                            }}
                                            step="0.01"
                                            min="0"
                                            className="w-full pl-8 pr-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <p className="text-xs text-blue-700 mt-1">Durante status 'active'</p>
                                </div>
                            </div>
                        </div>

                        {/* Dates Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="inline-block w-4 h-4 mr-1" />
                                    Start Date
                                </label>
                                <p className="text-sm text-gray-600">
                                    {formData.startDate ? new Date(formData.startDate).toLocaleDateString('es-MX') : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="inline-block w-4 h-4 mr-1" />
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate || ''}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="submit"
                                disabled={isSaving || updatePreSaleItem.isLoading}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving || updatePreSaleItem.isLoading ? (
                                    <>
                                        <LoadingSpinner size="sm" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/presale')}
                                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
