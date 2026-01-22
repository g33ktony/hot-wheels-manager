import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
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
            <div className="space-y-6">
                {/* Selection Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-sm text-blue-900 mb-2">Piezas seleccionadas:</h3>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {selectedItems.map(item => (
                            <div key={item._id} className="text-xs text-blue-700 flex justify-between">
                                <span>{item.carId || item._id}</span>
                                <span className="text-blue-600">
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
                            className="p-3 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition text-left"
                        >
                            <div className="font-semibold text-gray-900">💰 Precio</div>
                            <div className="text-xs text-gray-600">Cambiar precio de venta</div>
                        </button>

                        <button
                            onClick={() => setEditType('brand')}
                            className="p-3 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition text-left"
                        >
                            <div className="font-semibold text-gray-900">🏷️ Marca</div>
                            <div className="text-xs text-gray-600">Cambiar marca</div>
                        </button>

                        <button
                            onClick={() => setEditType('condition')}
                            className="p-3 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition text-left"
                        >
                            <div className="font-semibold text-gray-900">✨ Condición</div>
                            <div className="text-xs text-gray-600">Cambiar estado</div>
                        </button>

                        <button
                            onClick={() => setEditType('notes')}
                            className="p-3 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition text-left"
                        >
                            <div className="font-semibold text-gray-900">📝 Notas</div>
                            <div className="text-xs text-gray-600">Agregar notas</div>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900">
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
                                    className="input w-full"
                                >
                                    <option value="">Selecciona una marca</option>
                                    {PREDEFINED_BRANDS.map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500">O escribir una marca personalizada:</p>
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
                                className="input w-full"
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

                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="secondary"
                                className="flex-1"
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
                                className="flex-1"
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
