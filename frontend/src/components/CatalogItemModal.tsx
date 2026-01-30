import { useState, useRef } from 'react'
import { X, ChevronLeft, Plus } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import Button from './common/Button'
import toast from 'react-hot-toast'
import api from '@/services/api'

interface CatalogItem {
    _id: string
    type: 'catalog'
    title: string
    subtitle: string
    description: string
    metadata: {
        model: string
        year: number
        series: string
        color: string
        photoUrl: string
        tampo?: string
        wheelType?: string
        carMake?: string
    }
}

interface CatalogItemModalProps {
    isOpen: boolean
    item: CatalogItem | null
    onClose: () => void
    initialMode?: 'detail' | 'add'
}

export default function CatalogItemModal({ isOpen, item, onClose, initialMode = 'detail' }: CatalogItemModalProps) {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const [showImageZoom, setShowImageZoom] = useState(false)
    const [currentMode, setCurrentMode] = useState<'detail' | 'add'>(initialMode)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form refs
    const quantityRef = useRef<HTMLInputElement>(null)
    const priceRef = useRef<HTMLInputElement>(null)
    const costRef = useRef<HTMLInputElement>(null)

    if (!item || !isOpen) return null

    const handleSwitchToAdd = () => {
        setCurrentMode('add')
    }

    const handleBackToDetail = () => {
        setCurrentMode('detail')
    }

    const handleAddToStock = async () => {
        const quantity = quantityRef.current?.value
        const price = priceRef.current?.value
        const cost = costRef.current?.value

        if (!quantity || isNaN(parseInt(quantity))) {
            toast.error('Cantidad inválida')
            return
        }

        if (!price || isNaN(parseFloat(price))) {
            toast.error('Precio inválido')
            return
        }

        if (!cost || isNaN(parseFloat(cost))) {
            toast.error('Costo inválido')
            return
        }

        try {
            setIsSubmitting(true)

            const newItem = {
                carId: item.metadata.model,
                carName: item.metadata.model,
                quantity: parseInt(quantity),
                purchasePrice: parseFloat(cost),
                suggestedPrice: parseFloat(price),
                condition: 'mint',
                brand: item.metadata.carMake || 'Hot Wheels',
                series: item.metadata.series,
                year: item.metadata.year,
                color: item.metadata.color,
                photos: item.metadata.photoUrl ? [item.metadata.photoUrl] : [],
                notes: `Agregado desde catálogo - ${item.metadata.year} ${item.metadata.series}`,
                ...(item.metadata.tampo && { tampo: item.metadata.tampo }),
                ...(item.metadata.wheelType && { wheelType: item.metadata.wheelType })
            }

            await api.post('/inventory', newItem)

            toast.success(`✅ ${quantity} unidades de ${item.metadata.model} agregadas al inventario`)
            onClose()
            setCurrentMode('detail')
        } catch (error) {
            console.error('Error adding to stock:', error)
            toast.error('Error al agregar al inventario')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            {/* Modal Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Modal Content */}
                <div
                    className={`w-full max-w-2xl rounded-lg overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3 flex-1">
                            {currentMode === 'add' && (
                                <button
                                    onClick={handleBackToDetail}
                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}
                            <div>
                                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {currentMode === 'detail' ? item.metadata.model : 'Agregar al Inventario'}
                                </h2>
                                {currentMode === 'detail' && (
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {item.metadata.year} • {item.metadata.series}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {currentMode === 'detail' ? (
                            // DETAIL MODE
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Imagen */}
                                <div className="flex flex-col gap-3">
                                    <div
                                        className={`relative rounded-lg overflow-hidden cursor-pointer group aspect-square flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                                        onClick={() => setShowImageZoom(true)}
                                    >
                                        {item.metadata.photoUrl ? (
                                            <>
                                                <img
                                                    src={`https://images.weserv.nl/?url=${encodeURIComponent(item.metadata.photoUrl)}&w=600&h=600&fit=contain`}
                                                    alt={item.metadata.model}
                                                    className="w-full h-full object-contain group-hover:opacity-75 transition-opacity"
                                                    crossOrigin="anonymous"
                                                />
                                                <div className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="bg-white/20 rounded-full p-3">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                                            </svg>
                                                        </div>
                                                        <p className="text-white text-sm font-medium">Click para ampliar</p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className={`text-4xl ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>📷</div>
                                        )}
                                    </div>
                                </div>

                                {/* Información */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Año</label>
                                            <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.metadata.year}</p>
                                        </div>
                                        <div>
                                            <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Serie</label>
                                            <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.metadata.series}</p>
                                        </div>
                                        <div>
                                            <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Color</label>
                                            <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.metadata.color}</p>
                                        </div>
                                        <div>
                                            <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Marca</label>
                                            <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.metadata.carMake || 'Hot Wheels'}</p>
                                        </div>
                                    </div>

                                    {item.metadata.wheelType && (
                                        <div>
                                            <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tipo de Rueda</label>
                                            <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.metadata.wheelType}</p>
                                        </div>
                                    )}

                                    {item.metadata.tampo && (
                                        <div>
                                            <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tampo</label>
                                            <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.metadata.tampo}</p>
                                        </div>
                                    )}

                                    <div className={`border-t ${isDark ? 'border-slate-600' : 'border-slate-200'} pt-4 mt-4`}>
                                        <Button
                                            onClick={handleSwitchToAdd}
                                            className="w-full flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Agregar a Stock
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // ADD MODE
                            <div className="space-y-4 max-w-md mx-auto">
                                {/* Metadata display */}
                                <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Detalles del Item</p>
                                    <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.metadata.model}</p>
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.metadata.year} • {item.metadata.series} • {item.metadata.color}</p>
                                </div>

                                {/* Form Inputs */}
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Cantidad
                                    </label>
                                    <input
                                        ref={quantityRef}
                                        type="number"
                                        min="1"
                                        defaultValue="1"
                                        placeholder="Cantidad"
                                        className={`w-full px-4 py-2 rounded-lg border text-lg ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Precio Sugerido ($)
                                    </label>
                                    <input
                                        ref={priceRef}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className={`w-full px-4 py-2 rounded-lg border text-lg ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Costo de Compra ($)
                                    </label>
                                    <input
                                        ref={costRef}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className={`w-full px-4 py-2 rounded-lg border text-lg ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
                                    />
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        variant="secondary"
                                        onClick={handleBackToDetail}
                                        className="flex-1"
                                        disabled={isSubmitting}
                                    >
                                        Atrás
                                    </Button>
                                    <Button
                                        onClick={handleAddToStock}
                                        disabled={isSubmitting}
                                        className="flex-1 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-5 h-5" />
                                        {isSubmitting ? 'Agregando...' : 'Agregar'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Zoom Modal */}
            {showImageZoom && item.metadata.photoUrl && (
                <div
                    className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setShowImageZoom(false)}
                >
                    <div className="relative max-w-4xl w-full max-h-screen flex items-center justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowImageZoom(false)
                            }}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors z-10"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>

                        <img
                            src={`https://images.weserv.nl/?url=${encodeURIComponent(item.metadata.photoUrl)}&w=1200&h=1200&fit=contain`}
                            alt={item.metadata.model}
                            className="w-full h-full object-contain"
                            crossOrigin="anonymous"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
