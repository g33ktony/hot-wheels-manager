import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import InventoryItemSelector from '@/components/InventoryItemSelector'
import { useCreateDelivery } from '@/hooks/useDeliveries'
import { useCustomers } from '@/hooks/useCustomers'
import { useDeliveryLocations } from '@/hooks/useDeliveryLocations'
import { useStore } from '@/contexts/StoreContext'
import { useAppDispatch } from '@/hooks/redux'
import { setSelectionMode, clearSelection } from '@/store/slices/selectionSlice'
import { dateToString } from '@/utils/dateUtils'
import toast from 'react-hot-toast'

interface DeliveryItem {
    inventoryItemId?: string
    carId: string
    carName: string
    quantity: number
    unitPrice: number
}

interface NewDeliveryState {
    customerId: string
    items: DeliveryItem[]
    scheduledDate: string
    scheduledTime: string
    location: string
    totalAmount: number
    notes: string
    isThirdPartyDelivery: boolean
    thirdPartyRecipient: string
    thirdPartyPhone: string
}

const EMPTY_DELIVERY: NewDeliveryState = {
    customerId: '',
    items: [],
    scheduledDate: '',
    scheduledTime: '09:00',
    location: '',
    totalAmount: 0,
    notes: '',
    isThirdPartyDelivery: false,
    thirdPartyRecipient: '',
    thirdPartyPhone: ''
}

interface InventoryCreateDeliveryModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function InventoryCreateDeliveryModal({
    isOpen,
    onClose,
}: InventoryCreateDeliveryModalProps) {
    const { selectedStore } = useStore()
    const dispatch = useAppDispatch()
    const createDeliveryMutation = useCreateDelivery()
    const { data: customers } = useCustomers(selectedStore || undefined)
    const { data: deliveryLocations } = useDeliveryLocations()

    const [newDelivery, setNewDelivery] = useState<NewDeliveryState>({
        ...EMPTY_DELIVERY,
        scheduledDate: dateToString(new Date())
    })

    const isCreating = createDeliveryMutation.isLoading
    const onNewDeliveryChange = setNewDelivery

    const handleCreateDelivery = async () => {
        if (!newDelivery.customerId.trim()) {
            toast.error('Por favor selecciona un cliente')
            return
        }
        if (newDelivery.items.length === 0) {
            toast.error('Por favor agrega al menos un item')
            return
        }
        try {
            await createDeliveryMutation.mutateAsync({
                customerId: newDelivery.customerId,
                items: newDelivery.items,
                scheduledDate: new Date(newDelivery.scheduledDate),
                scheduledTime: newDelivery.scheduledTime,
                location: newDelivery.location,
                totalAmount: newDelivery.totalAmount,
                notes: newDelivery.notes || undefined,
                isThirdPartyDelivery: newDelivery.isThirdPartyDelivery,
                thirdPartyRecipient: newDelivery.thirdPartyRecipient || undefined,
                thirdPartyPhone: newDelivery.thirdPartyPhone || undefined
            })
            toast.success('✅ Entrega creada exitosamente')
            dispatch(setSelectionMode(false))
            dispatch(clearSelection())
            setNewDelivery({ ...EMPTY_DELIVERY, scheduledDate: dateToString(new Date()) })
            onClose()
        } catch (error) {
            console.error('Error creating delivery:', error)
            toast.error('Error al crear la entrega')
        }
    }

    const handleClose = () => {
        setNewDelivery({ ...EMPTY_DELIVERY, scheduledDate: dateToString(new Date()) })
        onClose()
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Nueva Entrega desde Inventario"
            maxWidth="4xl"
            headerActions={
                <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                        onNewDeliveryChange(prev => ({
                            ...prev,
                            items: [
                                ...prev.items,
                                {
                                    inventoryItemId: '',
                                    carId: '',
                                    carName: '',
                                    quantity: 1,
                                    unitPrice: 0,
                                },
                            ],
                        }))
                    }}
                    className="flex items-center gap-2"
                >
                    <Plus size={16} />
                    Agregar Item
                </Button>
            }
            footer={
                <div className="flex space-x-3">
                    <Button variant="secondary" className="flex-1" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button className="flex-1" onClick={handleCreateDelivery} disabled={isCreating}>
                        {isCreating ? 'Creando...' : 'Crear Entrega'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                        <div className="flex gap-2">
                            <select
                                className="input flex-1"
                                value={newDelivery.customerId}
                                onChange={(e) =>
                                    onNewDeliveryChange(prev => ({ ...prev, customerId: e.target.value }))
                                }
                                required
                            >
                                <option value="">Seleccionar cliente</option>
                                {customers?.map((customer) => (
                                    <option key={customer._id} value={customer._id}>
                                        {customer.name} - {customer.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Programada *</label>
                        <Input
                            type="date"
                            value={newDelivery.scheduledDate}
                            onChange={(e) =>
                                onNewDeliveryChange(prev => ({ ...prev, scheduledDate: e.target.value }))
                            }
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hora Programada</label>
                        <Input
                            type="time"
                            value={newDelivery.scheduledTime}
                            onChange={(e) =>
                                onNewDeliveryChange(prev => ({ ...prev, scheduledTime: e.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación *</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            value={newDelivery.location}
                            onChange={(e) =>
                                onNewDeliveryChange(prev => ({ ...prev, location: e.target.value }))
                            }
                            required
                        >
                            <option value="">Seleccionar ubicación</option>
                            {deliveryLocations?.map((loc) => (
                                <option key={loc._id} value={loc.name}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <div className="mb-4">
                        <h3 className="text-lg font-medium text-white">Items de la Entrega</h3>
                    </div>

                    <div className="space-y-4">
                        {newDelivery.items.map((item, index) => (
                            <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 border-2 border-slate-600 rounded-lg">
                                <div className="flex-1">
                                    <InventoryItemSelector
                                        value={item.inventoryItemId || ''}
                                        onChange={(itemId: string) => {
                                            onNewDeliveryChange(prev => {
                                                const updatedItems = [...prev.items]
                                                updatedItems[index].inventoryItemId = itemId
                                                return { ...prev, items: updatedItems }
                                            })
                                        }}
                                        placeholder="Buscar pieza en inventario..."
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 sm:gap-4 sm:w-auto">
                                    <div className="w-20 min-w-[80px]">
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            placeholder="Qty"
                                            value={item.quantity || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const val = e.target.value
                                                onNewDeliveryChange(prev => {
                                                    const updatedItems = [...prev.items]
                                                    if (val === '') {
                                                        updatedItems[index].quantity = 1
                                                    } else {
                                                        const num = parseInt(val)
                                                        updatedItems[index].quantity = isNaN(num) ? 1 : Math.max(1, num)
                                                    }
                                                    return { ...prev, items: updatedItems }
                                                })
                                            }}
                                            min="1"
                                            className="min-h-[44px]"
                                        />
                                    </div>
                                    <div className="flex-1 sm:w-24 sm:flex-none">
                                        <Input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="Precio"
                                            value={item.unitPrice || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const val = e.target.value
                                                onNewDeliveryChange(prev => {
                                                    const updatedItems = [...prev.items]
                                                    if (val === '') {
                                                        updatedItems[index].unitPrice = 0
                                                    } else {
                                                        const num = parseFloat(val)
                                                        updatedItems[index].unitPrice = isNaN(num) ? 0 : num
                                                    }
                                                    return { ...prev, items: updatedItems }
                                                })
                                            }}
                                            step="0.01"
                                            min="0"
                                            className="min-h-[44px]"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="danger"
                                        onClick={() => {
                                            onNewDeliveryChange(prev => ({
                                                ...prev,
                                                items: prev.items.filter((_, i) => i !== index),
                                            }))
                                        }}
                                        className="min-h-[44px] min-w-[44px] px-3"
                                    >
                                        ×
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {newDelivery.items.length > 0 && (
                        <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
                            <p className="text-lg font-semibold">
                                Total: ${newDelivery.items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0).toFixed(2)}
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas (Opcional)</label>
                    <textarea
                        className="input w-full h-20 resize-none"
                        placeholder="Notas adicionales sobre la entrega..."
                        value={newDelivery.notes}
                        onChange={(e) => onNewDeliveryChange(prev => ({ ...prev, notes: e.target.value }))}
                    />
                </div>

                <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="isThirdParty"
                            checked={newDelivery.isThirdPartyDelivery}
                            onChange={(e) =>
                                onNewDeliveryChange(prev => ({
                                    ...prev,
                                    isThirdPartyDelivery: e.target.checked,
                                    thirdPartyRecipient: e.target.checked ? prev.thirdPartyRecipient : '',
                                    thirdPartyPhone: e.target.checked ? prev.thirdPartyPhone : '',
                                }))
                            }
                            className="h-4 w-4 text-purple-600 rounded cursor-pointer"
                        />
                        <label htmlFor="isThirdParty" className="font-medium text-purple-900 cursor-pointer">
                            ¿Entregar a una tercera persona?
                        </label>
                    </div>

                    {newDelivery.isThirdPartyDelivery && (
                        <div className="space-y-3">
                            <Input
                                type="text"
                                label="Nombre del Receptor *"
                                placeholder="Nombre de la persona que recibirá la entrega"
                                value={newDelivery.thirdPartyRecipient}
                                onChange={(e) =>
                                    onNewDeliveryChange(prev => ({
                                        ...prev,
                                        thirdPartyRecipient: e.target.value,
                                    }))
                                }
                            />
                            <Input
                                type="tel"
                                label="Teléfono del Receptor (Opcional)"
                                placeholder="Número de teléfono para contacto"
                                value={newDelivery.thirdPartyPhone}
                                onChange={(e) =>
                                    onNewDeliveryChange(prev => ({
                                        ...prev,
                                        thirdPartyPhone: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
