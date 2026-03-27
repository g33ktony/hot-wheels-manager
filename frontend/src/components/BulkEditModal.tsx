import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'
import type { InventoryItem } from '@shared/types'

interface BulkEditModalProps {
    isOpen: boolean
    onClose: () => void
    selectedItems: InventoryItem[]
    onSave: (updates: Partial<InventoryItem>) => Promise<void>
}

const PREDEFINED_BRANDS = [
    'Hot Wheels',
    'Kaido House',
    'Mini GT',
    'M2 Machines',
    'Tomica',
    'Matchbox',
    'Johnny Lightning',
    'Greenlight'
]

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
    isOpen,
    onClose,
    selectedItems,
    onSave
}) => {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const [editType, setEditType] = useState<'price' | 'brand' | 'condition' | 'notes' | null>(null)
    const [editValue, setEditValue] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!editType || !editValue.trim()) {
            toast.error('Por favor completa los campos')
            return
        }

        try {
            setIsSaving(true)
            const updates: Partial<InventoryItem> = {}

            switch (editType) {
                case 'price':
                    const price = parseFloat(editValue)
                    if (isNaN(price) || price < 0) {
                        toast.error('El precio debe ser un número válido')
                        return
                    }
                    updates.actualPrice = price
                    break
                case 'brand':
                    updates.brand = editValue
                    break
                case 'condition':
                    updates.condition = editValue as any
                    break
                case 'notes':
                    updates.notes = editValue
                    break
            }

            await onSave(updates)

            toast.success(`${selectedItems.length} ${selectedItems.length === 1 ? 'pieza actualizada' : 'piezas actualizadas'}`)

            // Reset form
            setEditType(null)
            setEditValue('')
            onClose()
        } catch (error) {
            console.error('Error updating items:', error)
            toast.error('Error al actualizar las piezas')
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Editar ${selectedItems.length} ${selectedItems.length === 1 ? 'pieza' : 'piezas'}`}
            maxWidth="md"
        >
            <div className="space-y-5 sm:space-y-6">
                {/* Selection Summary */}
                <div className={`border rounded-lg p-4 ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                    <h3 className={`font-semibold text-sm mb-2 ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>Piezas seleccionadas:</h3>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {selectedItems.map(item => (
                            <div key={item._id} className={`text-xs flex justify-between ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                <span>{item.carId || item._id}</span>
                                <span className={isDark ? 'text-blue-300' : 'text-blue-600'}>
                                    {item.brand && `${item.brand} - `}
                                    ${item.actualPrice?.toFixed(2) || '0.00'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Edit Options */}
                {!editType ? (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setEditType('price')}
                            className={`p-3 border-2 rounded-lg transition text-left ${isDark ? 'border-slate-600 hover:border-primary-500 hover:bg-slate-700/40' : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'}`}
                        >
                            <div className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>💰 Precio</div>
                            <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Cambiar precio de venta</div>
                        </button>

                        <button
                            onClick={() => setEditType('brand')}
                            className={`p-3 border-2 rounded-lg transition text-left ${isDark ? 'border-slate-600 hover:border-primary-500 hover:bg-slate-700/40' : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'}`}
                        >
                            <div className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>🏷️ Marca</div>
                            <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Cambiar marca</div>
                        </button>

                        <button
                            onClick={() => setEditType('condition')}
                            className={`p-3 border-2 rounded-lg transition text-left ${isDark ? 'border-slate-600 hover:border-primary-500 hover:bg-slate-700/40' : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'}`}
                        >
                            <div className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>✨ Condición</div>
                            <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Cambiar estado</div>
                        </button>

                        <button
                            onClick={() => setEditType('notes')}
                            className={`p-3 border-2 rounded-lg transition text-left ${isDark ? 'border-slate-600 hover:border-primary-500 hover:bg-slate-700/40' : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'}`}
                        >
                            <div className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>📝 Notas</div>
                            <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Agregar notas</div>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                                {editType === 'price' && '💰 Nuevo Precio'}
                                {editType === 'brand' && '🏷️ Nueva Marca'}
                                {editType === 'condition' && '✨ Nueva Condición'}
                                {editType === 'notes' && '📝 Notas'}
                            </h4>
                            <button
                                onClick={() => {
                                    setEditType(null)
                                    setEditValue('')
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {editType === 'price' && (
                            <Input
                                type="number"
                                placeholder="Ingresa el nuevo precio"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                step="0.01"
                                min="0"
                                autoFocus
                            />
                        )}

                        {editType === 'brand' && (
                            <div className="space-y-2">
                                <select
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                                >
                                    <option value="">Selecciona una marca</option>
                                    {PREDEFINED_BRANDS.map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>O escribir una marca personalizada:</p>
                                <Input
                                    type="text"
                                    placeholder="Marca personalizada"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}

                        {editType === 'condition' && (
                            <select
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className={`input w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-gray-300'}`}
                                autoFocus
                            >
                                <option value="">Selecciona condición</option>
                                <option value="mint">Mint (Nueva)</option>
                                <option value="good">Buena</option>
                                <option value="fair">Regular</option>
                                <option value="poor">Mala</option>
                            </select>
                        )}

                        {editType === 'notes' && (
                            <textarea
                                placeholder="Ingresa notas para todas las piezas seleccionadas..."
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input w-full min-h-24 resize-none"
                                autoFocus
                            />
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 pt-4">
                            <Button
                                variant="secondary"
                                className="w-full sm:flex-1 h-10"
                                onClick={() => {
                                    setEditType(null)
                                    setEditValue('')
                                }}
                                disabled={isSaving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                className="w-full sm:flex-1 h-10"
                                onClick={handleSave}
                                disabled={isSaving || !editValue.trim()}
                            >
                                {isSaving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

export default BulkEditModal
