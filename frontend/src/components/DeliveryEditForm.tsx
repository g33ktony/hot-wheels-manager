import { useState } from 'react'
import { Save, X } from 'lucide-react'
import type { Delivery } from '@shared/types'

interface EditableDeliveryFormData {
    scheduledDate?: string | Date
    scheduledTime?: string
    location?: string
    notes?: string
    status?: Delivery['status']
}

interface DeliveryEditFormProps {
    delivery: EditableDeliveryFormData
    onCancel: () => void
    onSave: (updatedDelivery: EditableDeliveryFormData) => Promise<void>
    onChange?: (field: keyof EditableDeliveryFormData, value: unknown) => void
}

const DeliveryEditForm = ({
    delivery,
    onCancel,
    onSave,
    onChange,
}: DeliveryEditFormProps) => {
    const [editingDelivery, setEditingDelivery] = useState<EditableDeliveryFormData>(delivery)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFieldChange = (field: keyof EditableDeliveryFormData, value: unknown) => {
        const updated = { ...editingDelivery, [field]: value }
        setEditingDelivery(updated)
        onChange?.(field, value)
    }

    const getDateInputValue = (dateValue?: string | Date) => {
        if (!dateValue) return ''
        if (dateValue instanceof Date) {
            return Number.isNaN(dateValue.getTime()) ? '' : dateValue.toISOString().split('T')[0]
        }
        return dateValue.split('T')[0] || ''
    }

    const handleSave = async () => {
        try {
            setIsLoading(true)
            setError(null)
            await onSave(editingDelivery)
            onCancel() // Close form on success
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error saving delivery')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Editar Entrega</h3>
                <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fecha Programada */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Programada
                    </label>
                    <input
                        type="date"
                        value={getDateInputValue(editingDelivery.scheduledDate)}
                        onChange={(e) => handleFieldChange('scheduledDate', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Hora Programada */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora Programada
                    </label>
                    <input
                        type="time"
                        value={editingDelivery.scheduledTime || ''}
                        onChange={(e) => handleFieldChange('scheduledTime', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Ubicación */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación
                </label>
                <input
                    type="text"
                    value={editingDelivery.location || ''}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    placeholder="Ej: Calle Principal 123, Apartamento 4B"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Notas */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas
                </label>
                <textarea
                    value={editingDelivery.notes || ''}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    placeholder="Notas sobre la entrega (ej: perro en la casa, tocar timbre dos veces, etc.)"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
            </div>

            {/* Estado */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                </label>
                <select
                    value={editingDelivery.status || 'scheduled'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="scheduled">Programada</option>
                    <option value="prepared">Preparada</option>
                    <option value="completed">Completada</option>
                    <option value="rescheduled">Reprogramada</option>
                    <option value="cancelled">Cancelada</option>
                </select>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    <Save size={18} />
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    )
}

export default DeliveryEditForm
