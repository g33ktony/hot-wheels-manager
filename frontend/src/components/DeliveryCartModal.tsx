import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { RootState } from '@/store/store'
import { clearDeliveryCart, removeFromDeliveryCart, updateDeliveryCartQuantity, updateDeliveryCartPrice } from '@/store/slices/deliveryCartSlice'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { DEFAULT_PLACEHOLDER } from '@/utils/placeholderLogo'
import { customersService } from '@/services/customers'
import { deliveriesService } from '@/services/deliveries'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '@/contexts/ThemeContext'

interface DeliveryCartModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function DeliveryCartModal({ isOpen, onClose }: DeliveryCartModalProps) {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const queryClient = useQueryClient()
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    const deliveryCartItems = useSelector((state: RootState) => state.deliveryCart.items)

    const [customerId, setCustomerId] = useState('')
    const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
    const [scheduledTime, setScheduledTime] = useState('09:00')
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')

    // Fetch customers
    const { data: customers } = useQuery(
        'customers',
        () => customersService.getAll(),
        { enabled: isOpen }
    )

    // Create delivery mutation
    const createDeliveryMutation = useMutation(
        (deliveryData: any) => deliveriesService.create(deliveryData),
        {
            onSuccess: () => {
                toast.success('Entrega creada exitosamente')
                dispatch(clearDeliveryCart())
                queryClient.invalidateQueries('deliveries')
                queryClient.invalidateQueries('inventory')
                onClose()
                navigate('/deliveries')
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || 'Error al crear la entrega')
            }
        }
    )

    // Calculate total
    const totalAmount = useMemo(() => {
        return deliveryCartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    }, [deliveryCartItems])

    const handleCreateDelivery = async () => {
        if (!customerId) {
            toast.error('Debes seleccionar un cliente')
            return
        }

        if (deliveryCartItems.length === 0) {
            toast.error('Debes agregar al menos un item')
            return
        }

        if (!location.trim()) {
            toast.error('Debes especificar una ubicación')
            return
        }

        const deliveryData = {
            customerId,
            items: deliveryCartItems.map(item => ({
                inventoryItemId: item.inventoryItemId,
                carId: item.carId,
                carName: item.carName,
                quantity: item.quantity,
                unitPrice: item.unitPrice
            })),
            scheduledDate,
            scheduledTime,
            location,
            totalAmount,
            notes
        }

        await createDeliveryMutation.mutateAsync(deliveryData)
    }

    const handleClose = () => {
        if (deliveryCartItems.length > 0) {
            if (confirm('¿Seguro que quieres cerrar? Los items quedarán en el carrito.')) {
                onClose()
            }
        } else {
            onClose()
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Crear Entrega"
            maxWidth="4xl"
            footer={
                <div className="flex space-x-3">
                    <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={handleClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleCreateDelivery}
                        disabled={createDeliveryMutation.isLoading}
                    >
                        {createDeliveryMutation.isLoading ? 'Creando...' : 'Crear Entrega'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Información de la entrega */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Cliente *
                        </label>
                        <select
                            className={`input w-full ${isDark ? 'bg-slate-800 text-white' : ''}`}
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            required
                        >
                            <option value="">Seleccionar cliente</option>
                            {customers?.map((customer: any) => (
                                <option key={customer._id} value={customer._id}>
                                    {customer.name} {customer.email ? `- ${customer.email}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Fecha Programada *
                        </label>
                        <Input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Hora Programada
                        </label>
                        <Input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Ubicación *
                        </label>
                        <Input
                            type="text"
                            placeholder="Ej: Centro, Norte, etc."
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {/* Notas (opcional) */}
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        Notas (opcional)
                    </label>
                    <textarea
                        className={`input w-full ${isDark ? 'bg-slate-800 text-white' : ''}`}
                        rows={2}
                        placeholder="Notas adicionales..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                {/* Items en el carrito */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Items ({deliveryCartItems.length})
                        </h3>
                    </div>

                    {deliveryCartItems.length === 0 ? (
                        <div className={`text-center py-8 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            No hay items en el carrito
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {deliveryCartItems.map((item) => (
                                <div
                                    key={item.inventoryItemId}
                                    className={`
                                        p-3 rounded-lg border
                                        ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Thumbnail */}
                                        {item.photos && item.photos.length > 0 ? (
                                            <img
                                                src={item.photos[item.primaryPhotoIndex || 0]}
                                                alt={item.carName}
                                                className="w-16 h-12 object-cover rounded"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = DEFAULT_PLACEHOLDER
                                                }}
                                            />
                                        ) : (
                                            <div className="w-16 h-12 bg-slate-700 rounded flex items-center justify-center overflow-hidden">
                                                <img src={DEFAULT_PLACEHOLDER} alt="Auto a Escala" className="w-full h-full object-contain p-0.5" />
                                            </div>
                                        )}

                                        {/* Info y controles */}
                                        <div className="flex-1">
                                            <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {item.carName}
                                            </h4>
                                            <p className="text-xs text-gray-500">{item.carId}</p>

                                            <div className="flex items-center gap-3 mt-2">
                                                {/* Cantidad */}
                                                <div className="flex items-center gap-1">
                                                    <label className="text-xs text-gray-500">Cant:</label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max={item.maxAvailable}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const qty = parseInt(e.target.value)
                                                            if (!isNaN(qty)) {
                                                                dispatch(updateDeliveryCartQuantity({
                                                                    inventoryItemId: item.inventoryItemId,
                                                                    quantity: qty
                                                                }))
                                                            }
                                                        }}
                                                        className="w-16 text-center"
                                                    />
                                                </div>

                                                {/* Precio */}
                                                <div className="flex items-center gap-1">
                                                    <label className="text-xs text-gray-500">Precio:</label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unitPrice}
                                                        onChange={(e) => {
                                                            const price = parseFloat(e.target.value)
                                                            if (!isNaN(price)) {
                                                                dispatch(updateDeliveryCartPrice({
                                                                    inventoryItemId: item.inventoryItemId,
                                                                    price
                                                                }))
                                                            }
                                                        }}
                                                        className="w-20"
                                                    />
                                                </div>

                                                {/* Subtotal */}
                                                <div className="flex-1 text-right">
                                                    <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                                        ${(item.quantity * item.unitPrice).toFixed(2)}
                                                    </span>
                                                </div>

                                                {/* Remove */}
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => dispatch(removeFromDeliveryCart(item.inventoryItemId))}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>

                                            {/* Stock warning */}
                                            {item.quantity >= item.maxAvailable && (
                                                <p className="text-xs text-orange-500 mt-1">
                                                    ⚠️ Cantidad máxima disponible: {item.maxAvailable}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Total */}
                    {deliveryCartItems.length > 0 && (
                        <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Total:
                                </span>
                                <span className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                    ${totalAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
