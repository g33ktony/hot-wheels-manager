import { useState } from 'react'
import { X, Facebook, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import Button from './common/Button'
import { publishToFacebook } from '@/services/facebook'
import type { InventoryItem } from '@shared/types'

interface FacebookPublishModalProps {
    isOpen: boolean
    onClose: () => void
    selectedItems: InventoryItem[]
    onSuccess?: () => void
}

export default function FacebookPublishModal({
    isOpen,
    onClose,
    selectedItems,
    onSuccess
}: FacebookPublishModalProps) {
    const [message, setMessage] = useState('')
    const [includePrice, setIncludePrice] = useState(true)
    const [isPublishing, setIsPublishing] = useState(false)
    const [publishResult, setPublishResult] = useState<{
        success: boolean
        message: string
    } | null>(null)

    if (!isOpen) return null

    const handlePublish = async () => {
        if (!message.trim()) {
            setPublishResult({
                success: false,
                message: 'Por favor escribe un mensaje para la publicación'
            })
            return
        }

        setIsPublishing(true)
        setPublishResult(null)

        try {
            const itemIds = selectedItems
                .filter(item => item._id)
                .map(item => item._id as string)

            const result = await publishToFacebook({
                itemIds,
                message: message.trim(),
                includePrice
            })

            setPublishResult({
                success: result.success,
                message: result.message || 'Publicación exitosa'
            })

            if (result.success) {
                // Wait a bit to show success message, then close
                setTimeout(() => {
                    onSuccess?.()
                    handleClose()
                }, 2000)
            }
        } catch (error: any) {
            setPublishResult({
                success: false,
                message: error.response?.data?.message || 'Error al publicar en Facebook'
            })
        } finally {
            setIsPublishing(false)
        }
    }

    const handleClose = () => {
        setMessage('')
        setIncludePrice(true)
        setPublishResult(null)
        onClose()
    }

    // Count items with photos
    const itemsWithPhotos = selectedItems.filter(
        item => item.photos && item.photos.length > 0
    )

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Facebook size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Publicar en Facebook
                            </h3>
                            <p className="text-sm text-gray-500">
                                {itemsWithPhotos.length} item{itemsWithPhotos.length !== 1 ? 's' : ''} con foto{itemsWithPhotos.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isPublishing}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Alert if no photos */}
                    {itemsWithPhotos.length === 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-900">
                                    Ningún item tiene fotos
                                </p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Para publicar en Facebook, al menos un item debe tener fotos.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Message Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mensaje de la publicación <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escribe el mensaje principal de tu publicación..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            rows={4}
                            disabled={isPublishing}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Este texto aparecerá al inicio de la publicación. Los detalles de cada item se agregarán automáticamente.
                        </p>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includePrice}
                                onChange={(e) => setIncludePrice(e.target.checked)}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                disabled={isPublishing}
                            />
                            <span className="text-sm text-gray-700">
                                Incluir precios en la publicación
                            </span>
                        </label>
                    </div>

                    {/* Preview */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Vista previa de items ({itemsWithPhotos.length})
                        </label>
                        <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                            {itemsWithPhotos.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                    {itemsWithPhotos.map((item, index) => (
                                        <div
                                            key={item._id || index}
                                            className="p-3 flex items-center gap-3 hover:bg-gray-50"
                                        >
                                            {/* Image thumbnail */}
                                            {item.photos && item.photos[0] && (
                                                <img
                                                    src={item.photos[0]}
                                                    alt={item.carId}
                                                    className="w-16 h-16 object-cover rounded border border-gray-200"
                                                />
                                            )}
                                            
                                            {/* Item info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {item.hotWheelsCar?.model || item.carId}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.condition === 'mint' ? 'Mint' :
                                                        item.condition === 'good' ? 'Bueno' :
                                                            item.condition === 'fair' ? 'Regular' : 'Malo'}
                                                    {includePrice && ` • $${item.suggestedPrice.toFixed(2)}`}
                                                </p>
                                                {/* Badges */}
                                                <div className="flex gap-1 mt-1">
                                                    {item.isSuperTreasureHunt && (
                                                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                                                            $TH
                                                        </span>
                                                    )}
                                                    {item.isTreasureHunt && !item.isSuperTreasureHunt && (
                                                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
                                                            TH
                                                        </span>
                                                    )}
                                                    {item.isChase && (
                                                        <span className="text-xs px-1.5 py-0.5 bg-pink-100 text-pink-800 rounded">
                                                            CHASE
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    <AlertCircle size={32} className="mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No hay items con fotos para mostrar</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Result Message */}
                    {publishResult && (
                        <div
                            className={`rounded-lg p-4 flex items-start gap-3 ${publishResult.success
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                                }`}
                        >
                            {publishResult.success ? (
                                <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${publishResult.success ? 'text-green-900' : 'text-red-900'
                                    }`}>
                                    {publishResult.message}
                                </p>
                                {publishResult.success && (
                                    <p className="text-xs text-green-700 mt-1">
                                        La publicación está ahora en tu página de Facebook
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={isPublishing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handlePublish}
                        disabled={isPublishing || itemsWithPhotos.length === 0 || !message.trim()}
                        icon={isPublishing ? <Loader size={18} className="animate-spin" /> : <Facebook size={18} />}
                    >
                        {isPublishing ? 'Publicando...' : 'Publicar en Facebook'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
