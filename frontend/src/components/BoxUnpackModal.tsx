import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Camera, Save, CheckCircle, AlertTriangle } from 'lucide-react'
import { InventoryItem } from '../../../shared/types'
import { useBoxById, useRegisterBoxPieces, useCompleteBox, useDeleteBoxPiece } from '../hooks/useBoxes'
import imageCompression from 'browser-image-compression'

interface BoxUnpackModalProps {
    isOpen: boolean
    onClose: () => void
    box: InventoryItem
}

interface NewPiece {
    carId: string
    condition: 'mint' | 'good' | 'fair' | 'poor'
    isTreasureHunt: boolean
    isSuperTreasureHunt: boolean
    isChase: boolean
    photos: string[]
    location: string
    notes: string
    suggestedPrice: number
}

export default function BoxUnpackModal({ isOpen, onClose, box }: BoxUnpackModalProps) {
    const { data: boxDetail, isLoading } = useBoxById(box._id || '')
    const registerPiecesMutation = useRegisterBoxPieces()
    const completeBoxMutation = useCompleteBox()
    const deletePieceMutation = useDeleteBoxPiece()

    const [newPieces, setNewPieces] = useState<NewPiece[]>([])
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
    const [completeReason, setCompleteReason] = useState('')
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    const costPerPiece = (box.boxPrice || 0) / (box.boxSize || 1)
    const registeredCount = boxDetail?.box.registeredPieces || 0
    const totalCount = boxDetail?.box.boxSize || 0
    const remainingCount = totalCount - registeredCount

    // Initialize with one empty piece
    useEffect(() => {
        if (newPieces.length === 0) {
            handleAddPiece()
        }
    }, [])

    const handleAddPiece = () => {
        setNewPieces([...newPieces, {
            carId: '',
            condition: 'mint',
            isTreasureHunt: false,
            isSuperTreasureHunt: false,
            isChase: false,
            photos: [],
            location: box.location || '',
            notes: '',
            suggestedPrice: costPerPiece * 2 // Default 100% markup
        }])
    }

    const handleRemovePiece = (index: number) => {
        setNewPieces(newPieces.filter((_, i) => i !== index))
    }

    const handlePieceChange = (index: number, field: keyof NewPiece, value: any) => {
        const updated = [...newPieces]
        updated[index] = { ...updated[index], [field]: value }
        
        // TH/STH mutual exclusion for Hot Wheels Basic
        if (box.brand?.toLowerCase() === 'hot wheels' && box.pieceType === 'basic') {
            if (field === 'isTreasureHunt' && value) {
                updated[index].isSuperTreasureHunt = false
            } else if (field === 'isSuperTreasureHunt' && value) {
                updated[index].isTreasureHunt = false
            }
        }
        
        setNewPieces(updated)
    }

    const handlePhotoUpload = async (index: number, file: File) => {
        setUploadingPhoto(true)
        try {
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1024,
                useWebWorker: true,
                fileType: 'image/jpeg'
            }
            const compressedFile = await imageCompression(file, options)
            const reader = new FileReader()
            
            reader.onloadend = () => {
                const base64String = reader.result as string
                const updated = [...newPieces]
                updated[index].photos = [...updated[index].photos, base64String]
                setNewPieces(updated)
                setUploadingPhoto(false)
            }
            
            reader.readAsDataURL(compressedFile)
        } catch (error) {
            console.error('Error uploading photo:', error)
            alert('Error al cargar la foto')
            setUploadingPhoto(false)
        }
    }

    const handleRemovePhoto = (pieceIndex: number, photoIndex: number) => {
        const updated = [...newPieces]
        updated[pieceIndex].photos = updated[pieceIndex].photos.filter((_, i) => i !== photoIndex)
        setNewPieces(updated)
    }

    const handleSaveAndAddAnother = async () => {
        const validPieces = newPieces.filter(p => p.carId.trim() !== '')
        
        if (validPieces.length === 0) {
            alert('Ingresa al menos un Car ID')
            return
        }

        try {
            await registerPiecesMutation.mutateAsync({
                boxId: box._id || '',
                pieces: validPieces
            })
            
            // Reset form with one empty piece
            setNewPieces([{
                carId: '',
                condition: 'mint',
                isTreasureHunt: false,
                isSuperTreasureHunt: false,
                isChase: false,
                photos: [],
                location: box.location || '',
                notes: '',
                suggestedPrice: costPerPiece * 2
            }])
        } catch (error) {
            console.error('Error registering pieces:', error)
            alert('Error al registrar las piezas')
        }
    }

    const handleSaveAndClose = async () => {
        const validPieces = newPieces.filter(p => p.carId.trim() !== '')
        
        if (validPieces.length > 0) {
            try {
                await registerPiecesMutation.mutateAsync({
                    boxId: box._id || '',
                    pieces: validPieces
                })
            } catch (error) {
                console.error('Error registering pieces:', error)
                alert('Error al registrar las piezas')
                return
            }
        }
        
        onClose()
    }

    const handleCompleteIncomplete = async () => {
        if (!completeReason.trim()) {
            alert('Indica la razón por la cual la caja está incompleta')
            return
        }

        try {
            await completeBoxMutation.mutateAsync({
                boxId: box._id || '',
                reason: completeReason
            })
            onClose()
        } catch (error) {
            console.error('Error completing box:', error)
            alert('Error al completar la caja')
        }
    }

    const handleDeletePiece = async (pieceId: string) => {
        if (!confirm('¿Eliminar esta pieza? Se reducirá el contador de piezas registradas.')) {
            return
        }

        try {
            await deletePieceMutation.mutateAsync({
                boxId: box._id || '',
                pieceId
            })
        } catch (error) {
            console.error('Error deleting piece:', error)
            alert('Error al eliminar la pieza')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">📦 {box.boxName}</h2>
                        <p className="text-purple-100 mt-1">
                            {registeredCount} / {totalCount} piezas registradas
                            {remainingCount > 0 && ` • ${remainingCount} pendientes`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-purple-700 p-2 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-3 bg-purple-50 border-b">
                    <div className="w-full bg-purple-200 rounded-full h-3">
                        <div
                            className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${((registeredCount / totalCount) * 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Registered Pieces */}
                            {boxDetail?.registeredPieces && boxDetail.registeredPieces.length > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                                        <CheckCircle size={20} />
                                        Piezas Registradas ({boxDetail.registeredPieces.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                                        {boxDetail.registeredPieces.map((piece: any) => (
                                            <div key={piece._id} className="bg-white border border-green-300 rounded-lg p-3 relative">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm text-gray-900">{piece.carId}</p>
                                                        <div className="flex gap-1 mt-1">
                                                            {piece.isTreasureHunt && (
                                                                <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">TH</span>
                                                            )}
                                                            {piece.isSuperTreasureHunt && (
                                                                <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">STH</span>
                                                            )}
                                                            {piece.isChase && (
                                                                <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Chase</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">Qty: {piece.quantity}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeletePiece(piece._id)}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="Eliminar pieza"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* New Pieces Form */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Registrar Nuevas Piezas
                                </h3>
                                <div className="space-y-4">
                                    {newPieces.map((piece, index) => (
                                        <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-medium text-gray-700">
                                                    Pieza #{index + 1}
                                                </span>
                                                {newPieces.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemovePiece(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Car ID */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Car ID *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={piece.carId}
                                                        onChange={(e) => handlePieceChange(index, 'carId', e.target.value)}
                                                        placeholder="HW-MUSTANG-2024"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                </div>

                                                {/* Condition */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Condición
                                                    </label>
                                                    <select
                                                        value={piece.condition}
                                                        onChange={(e) => handlePieceChange(index, 'condition', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    >
                                                        <option value="mint">Mint</option>
                                                        <option value="good">Good</option>
                                                        <option value="fair">Fair</option>
                                                        <option value="poor">Poor</option>
                                                    </select>
                                                </div>

                                                {/* TH/STH/Chase */}
                                                <div className="md:col-span-2">
                                                    <div className="flex gap-4">
                                                        {box.brand?.toLowerCase() === 'hot wheels' && box.pieceType === 'basic' && (
                                                            <>
                                                                <label className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={piece.isTreasureHunt}
                                                                        onChange={(e) => handlePieceChange(index, 'isTreasureHunt', e.target.checked)}
                                                                        className="h-4 w-4 text-purple-600 rounded"
                                                                    />
                                                                    <span className="text-sm font-medium text-gray-700">TH</span>
                                                                </label>
                                                                <label className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={piece.isSuperTreasureHunt}
                                                                        onChange={(e) => handlePieceChange(index, 'isSuperTreasureHunt', e.target.checked)}
                                                                        className="h-4 w-4 text-purple-600 rounded"
                                                                    />
                                                                    <span className="text-sm font-medium text-gray-700">STH</span>
                                                                </label>
                                                            </>
                                                        )}
                                                        {(box.brand?.toLowerCase() !== 'hot wheels' || box.pieceType !== 'basic') && (
                                                            <label className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={piece.isChase}
                                                                    onChange={(e) => handlePieceChange(index, 'isChase', e.target.checked)}
                                                                    className="h-4 w-4 text-purple-600 rounded"
                                                                />
                                                                <span className="text-sm font-medium text-gray-700">Chase</span>
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Precio de Venta Sugerido
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={piece.suggestedPrice}
                                                        onChange={(e) => handlePieceChange(index, 'suggestedPrice', parseFloat(e.target.value) || 0)}
                                                        step="0.01"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Costo: ${costPerPiece.toFixed(2)}
                                                    </p>
                                                </div>

                                                {/* Location */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Ubicación
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={piece.location}
                                                        onChange={(e) => handlePieceChange(index, 'location', e.target.value)}
                                                        placeholder="Estante 1, Caja A"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                </div>

                                                {/* Photos */}
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Fotos
                                                    </label>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {piece.photos.map((photo, photoIndex) => (
                                                            <div key={photoIndex} className="relative w-20 h-20">
                                                                <img
                                                                    src={photo}
                                                                    alt={`Foto ${photoIndex + 1}`}
                                                                    className="w-full h-full object-cover rounded border"
                                                                />
                                                                <button
                                                                    onClick={() => handleRemovePhoto(index, photoIndex)}
                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-purple-500">
                                                            <Camera size={24} className="text-gray-400" />
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0]
                                                                    if (file) handlePhotoUpload(index, file)
                                                                }}
                                                                disabled={uploadingPhoto}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Notas
                                                    </label>
                                                    <textarea
                                                        value={piece.notes}
                                                        onChange={(e) => handlePieceChange(index, 'notes', e.target.value)}
                                                        placeholder="Observaciones especiales..."
                                                        rows={2}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={handleAddPiece}
                                        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={20} />
                                        Agregar Otra Pieza
                                    </button>
                                </div>
                            </div>

                            {/* Complete Incomplete */}
                            {remainingCount > 0 && !showCompleteConfirm && (
                                <button
                                    onClick={() => setShowCompleteConfirm(true)}
                                    className="w-full bg-yellow-50 border border-yellow-300 text-yellow-800 font-medium py-2 px-4 rounded-lg hover:bg-yellow-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <AlertTriangle size={18} />
                                    Completar Caja Incompleta ({remainingCount} piezas faltantes)
                                </button>
                            )}

                            {showCompleteConfirm && (
                                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                                    <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                                        <AlertTriangle size={20} />
                                        Completar Caja Incompleta
                                    </h4>
                                    <p className="text-sm text-yellow-800 mb-3">
                                        Faltan {remainingCount} piezas por registrar. Indica la razón:
                                    </p>
                                    <textarea
                                        value={completeReason}
                                        onChange={(e) => setCompleteReason(e.target.value)}
                                        placeholder="Ej: 2 piezas dañadas, 3 piezas faltantes..."
                                        rows={2}
                                        className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-3"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCompleteIncomplete}
                                            disabled={completeBoxMutation.isLoading}
                                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Confirmar y Completar
                                        </button>
                                        <button
                                            onClick={() => setShowCompleteConfirm(false)}
                                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t flex gap-3">
                    <button
                        onClick={handleSaveAndAddAnother}
                        disabled={registerPiecesMutation.isLoading}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        Guardar y Agregar Más
                    </button>
                    <button
                        onClick={handleSaveAndClose}
                        disabled={registerPiecesMutation.isLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} />
                        Guardar y Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
