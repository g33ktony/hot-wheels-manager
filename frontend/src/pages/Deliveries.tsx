import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from 'react-query'
import { useDeliveries, useAllDeliveries, useCreateDelivery, useUpdateDelivery, useMarkDeliveryAsCompleted, useMarkDeliveryAsPrepared, useDeleteDelivery, useAddPayment, useDeletePayment } from '@/hooks/useDeliveries'
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers'
import { useInventory } from '@/hooks/useInventory'
import { useDeliveryLocations, useCreateDeliveryLocation } from '@/hooks/useDeliveryLocations'
import { usePreSaleItems } from '@/hooks/usePresale'
import { useCreatePaymentPlan } from '@/hooks/usePaymentPlans'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import DeliveryCard from '@/components/DeliveryCard'
import { DeliveryDetailsModal } from '@/components/DeliveryDetailsModal'
import { Plus, Search, Truck, X, Package, CheckCircle, Clock, UserPlus, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import InventoryItemSelector from '@/components/InventoryItemSelector'
import PreSaleItemAutocomplete from '@/components/PreSaleItemAutocomplete'
import DeliveryReport from '@/components/DeliveryReport'
import { dateToString } from '@/utils/dateUtils'
import type { InventoryItem } from '../../../shared/types'

export default function Deliveries() {
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showImageModal, setShowImageModal] = useState(false)
    const [allImagesForModal, setAllImagesForModal] = useState<string[]>([])
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null)
    const [editingDelivery, setEditingDelivery] = useState<any>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [newPayment, setNewPayment] = useState({
        amount: 0,
        paymentMethod: 'cash' as 'cash' | 'transfer' | 'card' | 'other',
        notes: ''
    })

    // Usar desde el inicio del año por defecto, no hace 30 días
    const [selectedDate, setSelectedDate] = useState(() => {
        // Mostrar sin filtro de fecha inicial (vacío = mostrar todas)
        return ''
    })
    const [newDelivery, setNewDelivery] = useState({
        customerId: '',
        items: [] as {
            inventoryItemId?: string;
            hotWheelsCarId?: string;
            carId: string;
            carName: string;
            quantity: number;
            unitPrice: number;
            basePricePerUnit?: number;  // For presale items
            // Series fields
            seriesId?: string;
            seriesName?: string;
            seriesSize?: number;
            seriesPrice?: number;
            isSoldAsSeries?: boolean;
        }[],
        scheduledDate: dateToString(new Date()),
        scheduledTime: '09:00',
        location: '',
        totalAmount: 0,
        notes: '',
        // Third party delivery fields
        isThirdPartyDelivery: false,
        thirdPartyRecipient: '',
        thirdPartyPhone: ''
    })
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    })
    const [paymentPlanConfig, setPaymentPlanConfig] = useState({
        enabled: false,
        numberOfPayments: 4,
        paymentFrequency: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
        startDate: dateToString(new Date()),
        earlyPaymentBonus: 0
    })
    const [customLocation, setCustomLocation] = useState('')
    const [showCustomLocationInput, setShowCustomLocationInput] = useState(false)

    const { data: deliveries, isLoading, error } = useDeliveries(statusFilter, selectedDate)
    const { data: allDeliveries } = useAllDeliveries(selectedDate) // Always loaded for widget stats
    const { data: customers } = useCustomers()
    // Only load inventory when creating/editing a delivery
    const { data: inventoryData } = useInventory({
        limit: showCreateModal ? 1000 : 10 // Load all only when modal is open
    })
    const inventoryItems = inventoryData?.items || []
    const { data: deliveryLocations } = useDeliveryLocations()
    const { data: preSaleItems } = usePreSaleItems()

    // Use empty array as default to avoid initial zero values, but still show loading state
    const deliveriesData = deliveries || []
    // For widget stats, use allDeliveries to always have counts, filtering by date locally
    const allDeliveriesData = allDeliveries || []
    const createDeliveryMutation = useCreateDelivery()
    const updateDeliveryMutation = useUpdateDelivery()
    const createCustomerMutation = useCreateCustomer()
    const createLocationMutation = useCreateDeliveryLocation()
    const markCompletedMutation = useMarkDeliveryAsCompleted()
    const markPreparedMutation = useMarkDeliveryAsPrepared()
    const deleteDeliveryMutation = useDeleteDelivery()
    const addPaymentMutation = useAddPayment()
    const deletePaymentMutation = useDeletePayment()
    const createPaymentPlanMutation = useCreatePaymentPlan()
    const queryClient = useQueryClient()

    // Show loading only on initial load, not when filter changes or data is being refetched
    if (isLoading && !deliveries) {
        return <Loading text="Cargando entregas..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="mb-4">
                    <Truck size={64} className="mx-auto text-slate-400 mb-4" />
                    <p className="text-danger-600 text-lg font-semibold mb-2">Error al cargar las entregas</p>
                    <p className="text-slate-400 text-sm mb-4">
                        {(error as any)?.message || 'No se pudo conectar con el servidor'}
                    </p>
                </div>
                <Button
                    onClick={() => window.location.reload()}
                    variant="primary"
                    size="sm"
                >
                    Reintentar
                </Button>
            </div>
        )
    }

    const filteredDeliveries = deliveriesData?.filter(delivery => {
        const customerName = delivery.customer?.name || ''
        const customerEmail = delivery.customer?.email || ''
        const location = delivery.location || ''
        const matchesSearch = !searchTerm ||
            customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            location.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesSearch
    }) || []

    const handleCreateDelivery = async () => {
        if (!newDelivery.customerId || newDelivery.items.length === 0 || !newDelivery.location) {
            alert('Cliente, items y ubicación son obligatorios')
            return
        }

        // Validate that non-presale items exist in inventory and have sufficient quantity
        const inventoryItems_toValidate = newDelivery.items.filter(item => {
            // Skip presale items (they start with "presale_")
            if (item.inventoryItemId?.startsWith('presale_')) {
                return false
            }
            return item.inventoryItemId // Include all inventory items, even those sold as series
        })

        if (inventoryItems_toValidate.length > 0) {
            // Check if items still exist in inventory
            const invalidItems = inventoryItems_toValidate.filter(item =>
                !inventoryItems.some(inv => inv._id === item.inventoryItemId)
            )
            if (invalidItems.length > 0) {
                alert('Algunos items del inventario ya no están disponibles. Por favor, selecciona otros items.')
                return
            }

            // Check if items have sufficient available quantity
            // When editing, we need to consider the quantities already reserved by this delivery
            const insufficientItems = inventoryItems_toValidate.filter(item => {
                const inventoryItem = inventoryItems.find((inv: InventoryItem) => inv._id === item.inventoryItemId)
                if (!inventoryItem) return true

                let availableQuantity = inventoryItem.quantity - (inventoryItem.reservedQuantity || 0)

                // If editing, add back the quantity that was reserved by this delivery
                if (isEditMode && editingDelivery) {
                    const originalItem = editingDelivery.items.find((i: any) => i.inventoryItemId === item.inventoryItemId)
                    if (originalItem) {
                        availableQuantity += originalItem.quantity
                    }
                }

                return availableQuantity < item.quantity
            })

            if (insufficientItems.length > 0) {
                const itemDetails = insufficientItems.map(item => {
                    const inventoryItem = inventoryItems.find((inv: InventoryItem) => inv._id === item.inventoryItemId)
                    let availableQuantity = inventoryItem ? inventoryItem.quantity - (inventoryItem.reservedQuantity || 0) : 0

                    // If editing, add back the quantity that was reserved by this delivery
                    if (isEditMode && editingDelivery) {
                        const originalItem = editingDelivery.items.find((i: any) => i.inventoryItemId === item.inventoryItemId)
                        if (originalItem) {
                            availableQuantity += originalItem.quantity
                        }
                    }

                    return `• ${item.carName}: disponible ${availableQuantity}, solicitado ${item.quantity}`
                }).join('\n')
                alert(`❌ Cantidad insuficiente para los siguientes items:\n\n${itemDetails}`)
                return
            }
        }

        try {
            // Check if delivery has presale items
            const hasPresaleItems = newDelivery.items.some(item =>
                item.inventoryItemId?.startsWith('presale_')
            )

            let createdDelivery: any

            if (isEditMode && editingDelivery) {
                // Update existing delivery
                await updateDeliveryMutation.mutateAsync({
                    id: editingDelivery._id,
                    data: {
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
                    }
                })
            } else {
                // Create new delivery
                createdDelivery = await createDeliveryMutation.mutateAsync({
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

                // If payment plan is enabled for presale items, create it
                if (hasPresaleItems && paymentPlanConfig.enabled && createdDelivery._id) {
                    try {
                        await createPaymentPlanMutation.mutateAsync({
                            deliveryId: createdDelivery._id,
                            customerId: newDelivery.customerId,
                            totalAmount: newDelivery.totalAmount,
                            numberOfPayments: paymentPlanConfig.numberOfPayments,
                            paymentFrequency: paymentPlanConfig.paymentFrequency,
                            startDate: new Date(paymentPlanConfig.startDate),
                            earlyPaymentBonus: paymentPlanConfig.earlyPaymentBonus > 0
                                ? paymentPlanConfig.earlyPaymentBonus
                                : undefined
                        })
                    } catch (paymentPlanError) {
                        console.error('Error creating payment plan:', paymentPlanError)
                        // Continue even if payment plan creation fails
                        alert('Entrega creada pero hubo un error al crear el plan de pagos. Puedes crearlo manualmente.')
                    }
                }
            }

            // Reset form and close modal
            handleCloseModal()
        } catch (error) {
            console.error('Error saving delivery:', error)
            // Refresh inventory data in case items became unavailable
            queryClient.invalidateQueries(['inventory'])
            alert(isEditMode ? 'Error al actualizar la entrega' : 'Error al crear la entrega. Los items seleccionados pueden ya no estar disponibles.')
        }
    }

    const handleCreateCustomer = async () => {
        if (!newCustomer.name.trim()) {
            alert('El nombre del cliente es obligatorio')
            return
        }

        try {
            const createdCustomer = await createCustomerMutation.mutateAsync({
                ...newCustomer,
                contactMethod: 'email' // Default contact method
            })

            // Set the newly created customer as selected
            if (createdCustomer._id) {
                setNewDelivery({ ...newDelivery, customerId: createdCustomer._id })
            }

            // Reset form and close modal
            setNewCustomer({
                name: '',
                email: '',
                phone: '',
                address: ''
            })
            setShowCreateCustomerModal(false)
        } catch (error) {
            console.error('Error creating customer:', error)
            alert('Error al crear el cliente')
        }
    }

    const handleMarkAsCompleted = async (deliveryId: string) => {
        await markCompletedMutation.mutateAsync(deliveryId)
    }

    const handleMarkAsPrepared = async (deliveryId: string) => {
        await markPreparedMutation.mutateAsync(deliveryId)
    }

    const handleViewDetails = (delivery: any) => {
        setSelectedDelivery(delivery)
        setShowDetailsModal(true)
    }

    const handleShowReport = (delivery: any) => {
        setSelectedDelivery(delivery)
        setShowReportModal(true)
    }

    const handleCloseReport = () => {
        setShowReportModal(false)
        // Don't clear selectedDelivery if details modal is still open
        if (!showDetailsModal) {
            setSelectedDelivery(null)
        }
    }

    const handleCloseDetails = () => {
        setShowDetailsModal(false)
        setSelectedDelivery(null)
    }

    const handleOpenImageModal = (images: string[]) => {
        setAllImagesForModal(images)
        setCurrentImageIndex(0)
        setShowImageModal(true)
    }

    const handleCloseImageModal = () => {
        setShowImageModal(false)
        setAllImagesForModal([])
        setCurrentImageIndex(0)
    }

    const handlePrevImage = () => {
        setCurrentImageIndex((prev) => (prev === 0 ? allImagesForModal.length - 1 : prev - 1))
    }

    const handleNextImage = () => {
        setCurrentImageIndex((prev) => (prev === allImagesForModal.length - 1 ? 0 : prev + 1))
    }

    const handleOpenPaymentModal = () => {
        if (selectedDelivery) {
            const remainingAmount = selectedDelivery.totalAmount - (selectedDelivery.paidAmount || 0)
            setNewPayment({
                amount: remainingAmount,
                paymentMethod: 'cash',
                notes: ''
            })
            setShowPaymentModal(true)
        }
    }

    const handleAddPayment = async () => {
        if (!selectedDelivery || newPayment.amount <= 0) {
            alert('El monto debe ser mayor a 0')
            return
        }

        try {
            await addPaymentMutation.mutateAsync({
                deliveryId: selectedDelivery._id,
                amount: newPayment.amount,
                paymentMethod: newPayment.paymentMethod,
                notes: newPayment.notes || undefined
            })

            // Refresh the delivery details
            const updatedDelivery = deliveries?.find(d => d._id === selectedDelivery._id)
            if (updatedDelivery) {
                setSelectedDelivery(updatedDelivery)
            }

            // Reset form and close modal
            setShowPaymentModal(false)
            setNewPayment({
                amount: 0,
                paymentMethod: 'cash',
                notes: ''
            })
        } catch (error) {
            console.error('Error adding payment:', error)
        }
    }

    const handleDeletePayment = async (paymentId: string) => {
        if (!selectedDelivery || !confirm('¿Estás seguro de eliminar este pago?')) {
            return
        }

        try {
            await deletePaymentMutation.mutateAsync({
                deliveryId: selectedDelivery._id,
                paymentId
            })

            // Refresh the delivery details
            const updatedDelivery = deliveries?.find(d => d._id === selectedDelivery._id)
            if (updatedDelivery) {
                setSelectedDelivery(updatedDelivery)
            }
        } catch (error) {
            console.error('Error deleting payment:', error)
        }
    }

    const handleDeleteDelivery = async (deliveryId: string) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta entrega?')) {
            await deleteDeliveryMutation.mutateAsync(deliveryId)
        }
    }

    const handleEditDelivery = (delivery: any) => {
        // Format the delivery data for editing

        // Extract customer ID correctly - handle both populated and non-populated cases
        let customerId = ''
        if (delivery.customerId) {
            // If customerId is an object (populated), extract the _id
            if (typeof delivery.customerId === 'object' && delivery.customerId._id) {
                customerId = String(delivery.customerId._id)
            } else {
                // If it's already a string ID
                customerId = String(delivery.customerId)
            }
        } else if (delivery.customer) {
            // Fallback: check customer field
            if (typeof delivery.customer === 'string') {
                customerId = delivery.customer
            } else if (delivery.customer._id) {
                customerId = String(delivery.customer._id)
            }
        }

        const formattedDelivery = {
            customerId: customerId,
            items: delivery.items?.map((item: any) => {
                console.log('🔍 Formatting item for edit:', {
                    inventoryItemId: item.inventoryItemId,
                    hotWheelsCarId: item.hotWheelsCarId,
                    carId: item.carId,
                    carName: item.carName
                })

                let inventoryItemId = ''
                if (item.inventoryItemId) {
                    if (typeof item.inventoryItemId === 'string') {
                        inventoryItemId = item.inventoryItemId
                    } else if (item.inventoryItemId._id) {
                        inventoryItemId = String(item.inventoryItemId._id)
                    } else {
                        inventoryItemId = String(item.inventoryItemId)
                    }
                }

                // If no inventoryItemId, try to use hotWheelsCarId as fallback
                if (!inventoryItemId && item.hotWheelsCarId) {
                    if (typeof item.hotWheelsCarId === 'string') {
                        inventoryItemId = item.hotWheelsCarId
                    } else if (item.hotWheelsCarId._id) {
                        inventoryItemId = String(item.hotWheelsCarId._id)
                    } else {
                        inventoryItemId = String(item.hotWheelsCarId)
                    }
                }

                console.log('✅ Final inventoryItemId:', inventoryItemId)

                return {
                    inventoryItemId: inventoryItemId,
                    hotWheelsCarId: item.hotWheelsCarId,
                    carId: item.carId,
                    carName: item.carName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    // Preserve series information if present
                    seriesId: item.seriesId,
                    seriesName: item.seriesName,
                    seriesSize: item.seriesSize,
                    seriesPrice: item.seriesPrice,
                    isSoldAsSeries: item.isSoldAsSeries
                }
            }) || [],
            scheduledDate: delivery.scheduledDate ?
                new Date(delivery.scheduledDate).toISOString().split('T')[0]
                : dateToString(new Date()),
            scheduledTime: delivery.scheduledTime || '09:00',
            location: delivery.location || '',
            totalAmount: delivery.totalAmount || 0,
            notes: delivery.notes || '',
            isThirdPartyDelivery: delivery.isThirdPartyDelivery || false,
            thirdPartyRecipient: delivery.thirdPartyRecipient || '',
            thirdPartyPhone: delivery.thirdPartyPhone || ''
        }

        setNewDelivery(formattedDelivery)
        setEditingDelivery(delivery)
        setIsEditMode(true)
        setShowCreateModal(true)
    }

    const handleCloseModal = () => {
        setShowCreateModal(false)
        setIsEditMode(false)
        setEditingDelivery(null)
        setShowCustomLocationInput(false)
        setCustomLocation('')
        // Reset form
        setNewDelivery({
            customerId: '',
            items: [],
            scheduledDate: dateToString(new Date()),
            scheduledTime: '09:00',
            location: '',
            totalAmount: 0,
            notes: '',
            isThirdPartyDelivery: false,
            thirdPartyRecipient: '',
            thirdPartyPhone: ''
        })
        // Reset payment plan config
        setPaymentPlanConfig({
            enabled: false,
            numberOfPayments: 4,
            paymentFrequency: 'weekly',
            startDate: dateToString(new Date()),
            earlyPaymentBonus: 0
        })
    }

    const handleLocationChange = async (value: string) => {
        if (value === 'other') {
            setShowCustomLocationInput(true)
            setNewDelivery({ ...newDelivery, location: '' })
        } else {
            setShowCustomLocationInput(false)
            setCustomLocation('')
            setNewDelivery({ ...newDelivery, location: value })
        }
    }

    const handleCustomLocationBlur = async () => {
        if (customLocation.trim() && !deliveryLocations?.find(loc => loc.name.toLowerCase() === customLocation.trim().toLowerCase())) {
            try {
                await createLocationMutation.mutateAsync(customLocation.trim())
                setNewDelivery({ ...newDelivery, location: customLocation.trim() })
            } catch (error) {
                console.error('Error creating location:', error)
            }
        } else if (customLocation.trim()) {
            setNewDelivery({ ...newDelivery, location: customLocation.trim() })
        }
    }

    const addDeliveryItem = () => {
        setNewDelivery({
            ...newDelivery,
            items: [...newDelivery.items, {
                inventoryItemId: undefined,
                hotWheelsCarId: undefined,
                carId: '',
                carName: '',
                quantity: 1,
                unitPrice: 0
            }]
        })
    }

    const updateDeliveryItem = (index: number, field: string, value: any) => {
        const updatedItems = [...newDelivery.items]
        updatedItems[index] = { ...updatedItems[index], [field]: value }

        // Auto-fill car details when inventory item is selected
        if (field === 'inventoryItemId' && value) {
            const inventoryItem = inventoryItems?.find((item: InventoryItem) => item._id === value)
            if (inventoryItem) {
                // Check if this is a catalog item (quantity = 0) or real inventory item
                if (inventoryItem.quantity === 0) {
                    // Catalog item - use hotWheelsCarId
                    updatedItems[index].hotWheelsCarId = value
                    updatedItems[index].inventoryItemId = undefined
                } else {
                    // Real inventory item
                    updatedItems[index].inventoryItemId = value
                    updatedItems[index].hotWheelsCarId = undefined
                }
                updatedItems[index].carId = inventoryItem.carId
                updatedItems[index].carName = inventoryItem.hotWheelsCar?.model || inventoryItem.carId
                updatedItems[index].unitPrice = inventoryItem.suggestedPrice

                // Store series information if this item is part of a series
                if (inventoryItem.seriesId) {
                    updatedItems[index].seriesId = inventoryItem.seriesId
                    updatedItems[index].seriesName = inventoryItem.seriesName
                    updatedItems[index].seriesSize = inventoryItem.seriesSize
                    updatedItems[index].seriesPrice = inventoryItem.seriesPrice
                }
            }
        }

        setNewDelivery({ ...newDelivery, items: updatedItems })
    }

    // Complete series: add all missing pieces from a series
    const completeSeries = async (seriesId: string, seriesPrice: number, seriesSize: number) => {
        try {
            console.log('🎁 Completing series:', { seriesId, seriesPrice, seriesSize })

            // Find all items from this series in inventory
            const seriesItems = inventoryItems?.filter((item: InventoryItem) => item.seriesId === seriesId) || []

            console.log('📦 Series items found:', seriesItems.length, seriesItems.map((i: InventoryItem) => ({
                carId: i.carId,
                suggestedPrice: i.suggestedPrice,
                seriesPrice: i.seriesPrice
            })))

            // Check if we have all pieces available
            const unavailableItems = seriesItems.filter((item: InventoryItem) => {
                const availableQuantity = item.quantity - (item.reservedQuantity || 0)
                return availableQuantity < 1
            })

            if (unavailableItems.length > 0) {
                const itemDetails = unavailableItems.map((i: InventoryItem) => {
                    const availableQuantity = i.quantity - (i.reservedQuantity || 0)
                    return `• ${i.hotWheelsCar?.model || i.carId}: disponible ${availableQuantity}, necesario 1`
                }).join('\n')
                alert(`❌ No hay suficiente inventario para completar la serie.\n\nPiezas con inventario insuficiente:\n${itemDetails}`)
                return
            }

            if (seriesItems.length !== seriesSize) {
                alert(`❌ Serie incompleta en inventario (${seriesItems.length}/${seriesSize} piezas)`)
                return
            }

            // Calculate adjusted price per piece
            const pricePerPiece = seriesPrice / seriesSize
            console.log('💰 Price calculation:', { seriesPrice, seriesSize, pricePerPiece })

            // Add or update all pieces from the series
            const updatedItems = [...newDelivery.items]

            seriesItems.forEach((seriesItem: InventoryItem) => {
                const existingIndex = updatedItems.findIndex(item => item.inventoryItemId === seriesItem._id)

                if (existingIndex >= 0) {
                    // Update existing item with series price
                    updatedItems[existingIndex].unitPrice = pricePerPiece
                    updatedItems[existingIndex].isSoldAsSeries = true
                    console.log('✏️ Updated existing item:', updatedItems[existingIndex].carName, 'to', pricePerPiece)
                } else {
                    // Add new item with series price
                    updatedItems.push({
                        inventoryItemId: seriesItem._id,
                        hotWheelsCarId: undefined,
                        carId: seriesItem.carId,
                        carName: seriesItem.hotWheelsCar?.model || seriesItem.carId,
                        quantity: 1,
                        unitPrice: pricePerPiece,
                        seriesId: seriesItem.seriesId,
                        seriesName: seriesItem.seriesName,
                        seriesSize: seriesItem.seriesSize,
                        seriesPrice: seriesItem.seriesPrice,
                        isSoldAsSeries: true
                    })
                    console.log('➕ Added new item:', seriesItem.carId, 'with price', pricePerPiece)
                }
            })

            setNewDelivery({ ...newDelivery, items: updatedItems })
        } catch (error) {
            console.error('Error completing series:', error)
            alert('Error al completar la serie')
        }
    }

    const removeDeliveryItem = (index: number) => {
        const itemToRemove = newDelivery.items[index]

        // Check if this item is part of a series sold as complete
        if (itemToRemove.isSoldAsSeries && itemToRemove.seriesId) {
            const confirmRemove = window.confirm(
                `⚠️ Esta pieza es parte de "${itemToRemove.seriesName}" vendida como serie completa.\n\n` +
                `¿Deseas eliminar TODA la serie o solo esta pieza?\n\n` +
                `OK = Eliminar toda la serie\n` +
                `Cancelar = Eliminar solo esta pieza (precio se ajustará a precio individual)`
            )

            if (confirmRemove) {
                // Remove all items from this series
                const updatedItems = newDelivery.items.filter(item => item.seriesId !== itemToRemove.seriesId)
                setNewDelivery({ ...newDelivery, items: updatedItems })
                return
            } else {
                // Remove only this item and reset isSoldAsSeries for remaining items
                const updatedItems = newDelivery.items
                    .filter((_, i) => i !== index)
                    .map(item => {
                        if (item.seriesId === itemToRemove.seriesId) {
                            // Reset to individual price
                            const inventoryItem = inventoryItems?.find((inv: InventoryItem) => inv._id === item.inventoryItemId)
                            return {
                                ...item,
                                unitPrice: inventoryItem?.suggestedPrice || item.unitPrice,
                                isSoldAsSeries: false
                            }
                        }
                        return item
                    })
                setNewDelivery({ ...newDelivery, items: updatedItems })
                return
            }
        }

        // Normal removal
        setNewDelivery({
            ...newDelivery,
            items: newDelivery.items.filter((_, i) => i !== index)
        })
    }

    const calculateTotal = () => {
        return newDelivery.items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0)
    }

    // Calculate stats from allDeliveries (all deliveries regardless of status filter)
    // but respecting the date filter
    const allDeliveriesFiltered = allDeliveriesData?.filter(delivery => {
        const deliveryDate = delivery.scheduledDate.toString().split('T')[0]
        const matchesDate = !selectedDate || deliveryDate >= selectedDate
        return matchesDate
    }) || []

    const scheduledCount = allDeliveriesFiltered.filter(d => d.status === 'scheduled').length
    const preparedCount = allDeliveriesFiltered.filter(d => d.status === 'prepared').length
    const completedCount = allDeliveriesFiltered.filter(d => d.status === 'completed').length

    // Total active deliveries = scheduled + prepared (not completed)
    const totalDeliveries = scheduledCount + preparedCount
    const pendingDeliveries = scheduledCount + preparedCount
    const preparedDeliveries = preparedCount
    const completedDeliveries = completedCount

    const handleStatusFilterClick = (status?: string) => {
        // Special handling for 'pending' - it should show both scheduled and prepared
        if (status === 'pending') {
            setStatusFilter(statusFilter === 'pending' ? undefined : 'pending')
        } else {
            setStatusFilter(statusFilter === status ? undefined : status)
        }
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-white">Entregas</h1>
                    <p className="text-sm lg:text-base text-slate-400">Calendario y gestión de entregas</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        onClick={() => navigate('/delivery-analytics')}
                        className="flex items-center justify-center gap-2 flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                        <TrendingUp size={20} />
                        <span className="hidden sm:inline">Analíticas</span>
                    </Button>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center justify-center gap-2 flex-1 sm:flex-none"
                    >
                        <Plus size={20} />
                        <span className="sm:inline">Nueva</span>
                    </Button>
                </div>
            </div>

            {/* Stats Cards - 2 columns on mobile, 4 on desktop - Clickable to filter */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <Card className={`p-4 lg:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${!statusFilter ? 'ring-2 ring-blue-500' : ''}`}>
                    <div
                        className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0"
                        onClick={() => handleStatusFilterClick(undefined)}
                    >
                        <div className="p-2 rounded-lg bg-blue-100 self-start">
                            <Truck size={20} className="text-blue-600" />
                        </div>
                        <div className="lg:ml-4">
                            <p className="text-xs lg:text-sm font-medium text-slate-400 dark:text-slate-400">Total Activas</p>
                            <p className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">{totalDeliveries}</p>
                        </div>
                    </div>
                </Card>

                <Card className={`p-4 lg:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}>
                    <div
                        className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0"
                        onClick={() => handleStatusFilterClick('pending')}
                    >
                        <div className="p-2 rounded-lg bg-yellow-100 self-start">
                            <Clock size={20} className="text-yellow-600" />
                        </div>
                        <div className="lg:ml-4">
                            <p className="text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-400">Pendientes</p>
                            <p className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">{pendingDeliveries}</p>
                        </div>
                    </div>
                </Card>

                <Card className={`p-4 lg:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${statusFilter === 'prepared' ? 'ring-2 ring-orange-500' : ''}`}>
                    <div
                        className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0"
                        onClick={() => handleStatusFilterClick('prepared')}
                    >
                        <div className="p-2 rounded-lg bg-orange-100 self-start">
                            <Package size={20} className="text-orange-600" />
                        </div>
                        <div className="lg:ml-4">
                            <p className="text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-400">Preparadas</p>
                            <p className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">{preparedDeliveries}</p>
                        </div>
                    </div>
                </Card>

                <Card className={`p-4 lg:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${statusFilter === 'completed' ? 'ring-2 ring-green-500' : ''}`}>
                    <div
                        className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0"
                        onClick={() => handleStatusFilterClick('completed')}
                    >
                        <div className="p-2 rounded-lg bg-green-100 self-start">
                            <CheckCircle size={20} className="text-green-600" />
                        </div>
                        <div className="lg:ml-4">
                            <p className="text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-400">Completadas</p>
                            <p className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">{completedDeliveries}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4 lg:p-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <Input
                                type="text"
                                placeholder="Buscar por cliente o ubicación..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1 lg:flex-none lg:w-48">
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Active Filter Indicator */}
            {statusFilter && (
                <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                        Mostrando entregas: <span className="font-semibold">
                            {statusFilter === 'pending' ? 'Pendientes (Programadas y Preparadas)' :
                                statusFilter === 'scheduled' ? 'Programadas' :
                                    statusFilter === 'prepared' ? 'Preparadas' :
                                        statusFilter === 'completed' ? 'Completadas' :
                                            statusFilter === 'cancelled' ? 'Canceladas' :
                                                statusFilter === 'rescheduled' ? 'Reprogramadas' : ''}
                        </span>
                    </p>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setStatusFilter(undefined)}
                        className="text-blue-700 hover:text-blue-900"
                    >
                        Limpiar filtro
                    </Button>
                </div>
            )}

            {/* Deliveries Grid */}
            <Card className="p-4 lg:p-6">
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                    <h2 className="text-base lg:text-lg font-semibold text-white">Lista de Entregas</h2>
                </div>

                {filteredDeliveries && filteredDeliveries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                        {filteredDeliveries.map((delivery) => (
                            <DeliveryCard
                                key={delivery._id}
                                delivery={delivery}
                                inventoryItems={inventoryItems}
                                onViewDetails={handleViewDetails}
                                onEdit={handleEditDelivery}
                                onMarkAsPrepared={handleMarkAsPrepared}
                                onMarkAsCompleted={handleMarkAsCompleted}
                                onDelete={handleDeleteDelivery}
                                onShare={handleShowReport}
                                isLoadingPrepared={markPreparedMutation.isLoading}
                                isLoadingCompleted={markCompletedMutation.isLoading}
                                isLoadingDelete={deleteDeliveryMutation.isLoading}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Truck size={48} className="mx-auto text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No hay entregas</h3>
                        <p className="text-slate-400">No se encontraron entregas para los filtros seleccionados</p>
                    </div>
                )}
            </Card>

            {/* Create Delivery Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={handleCloseModal}
                title={isEditMode ? 'Editar Entrega' : 'Nueva Entrega'}
                maxWidth="4xl"
                headerActions={
                    <Button
                        type="button"
                        size="sm"
                        onClick={addDeliveryItem}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Agregar Item
                    </Button>
                }
                footer={
                    <div className="flex space-x-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={handleCloseModal}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleCreateDelivery}
                            disabled={createDeliveryMutation.isLoading || updateDeliveryMutation.isLoading}
                        >
                            {isEditMode
                                ? (updateDeliveryMutation.isLoading ? 'Actualizando...' : 'Actualizar Entrega')
                                : (createDeliveryMutation.isLoading ? 'Creando...' : 'Crear Entrega')
                            }
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cliente *
                            </label>
                            <div className="flex gap-2">
                                <select
                                    className="input flex-1"
                                    value={newDelivery.customerId}
                                    onChange={(e) => setNewDelivery({ ...newDelivery, customerId: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccionar cliente</option>
                                    {customers?.map((customer) => (
                                        <option key={customer._id} value={customer._id}>
                                            {customer.name} - {customer.email}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setShowCreateCustomerModal(true)}
                                    className="flex items-center gap-1"
                                >
                                    <UserPlus size={16} />
                                    Crear
                                </Button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha Programada *
                            </label>
                            <Input
                                type="date"
                                value={newDelivery.scheduledDate}
                                onChange={(e) => setNewDelivery({ ...newDelivery, scheduledDate: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hora Programada
                            </label>
                            <Input
                                type="time"
                                value={newDelivery.scheduledTime}
                                onChange={(e) => setNewDelivery({ ...newDelivery, scheduledTime: e.target.value })}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ubicación *
                            </label>
                            {!showCustomLocationInput ? (
                                <select
                                    className="w-full px-3 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    value={newDelivery.location}
                                    onChange={(e) => handleLocationChange(e.target.value)}
                                    required
                                >
                                    <option value="">Seleccionar ubicación</option>
                                    {deliveryLocations?.map((loc) => (
                                        <option key={loc._id} value={loc.name}>
                                            {loc.name}
                                        </option>
                                    ))}
                                    <option value="other">Otro...</option>
                                </select>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Nueva ubicación"
                                        value={customLocation}
                                        onChange={(e) => setCustomLocation(e.target.value)}
                                        onBlur={handleCustomLocationBlur}
                                        required
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setShowCustomLocationInput(false)
                                            setCustomLocation('')
                                        }}
                                    >
                                        <X size={16} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Delivery Items */}
                    <div>
                        <div className="mb-4">
                            <h3 className="text-lg font-medium text-white">Items de la Entrega</h3>
                        </div>

                        {/* Pre-Sale Item Selector */}
                        <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded">
                                    PRE-SALE
                                </span>
                                Add Pre-Sale Item
                            </h4>
                            <PreSaleItemAutocomplete
                                value=""
                                onChange={(preSaleItem) => {
                                    // Add presale item to delivery
                                    setNewDelivery({
                                        ...newDelivery,
                                        items: [
                                            ...newDelivery.items,
                                            {
                                                carId: preSaleItem.carId,
                                                carName: preSaleItem.carModel || preSaleItem.carId,
                                                quantity: 1,
                                                unitPrice: preSaleItem.finalPricePerUnit,
                                                basePricePerUnit: (preSaleItem as any).basePricePerUnit || 0,  // Add base price for presale items
                                                // Mark as presale item
                                                inventoryItemId: `presale_${preSaleItem._id}`,
                                                hotWheelsCarId: preSaleItem._id,
                                                seriesId: preSaleItem._id,
                                                seriesName: preSaleItem.carModel || 'Pre-Sale Item',
                                                isSoldAsSeries: true
                                            }
                                        ]
                                    })
                                }}
                                placeholder="Search presale items..."
                                onlyActive
                            />
                        </div>

                        <div className="space-y-4">
                            {newDelivery.items.map((item, index) => (
                                <div key={index} className="space-y-2">
                                    <div className={`flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 border-2 rounded-lg ${item.isSoldAsSeries ? 'bg-purple-50 border-purple-300' : 'border-slate-600'
                                        }`}>
                                        {/* Pre-Sale Badge */}
                                        {item.isSoldAsSeries && (
                                            <div className="absolute top-2 right-2">
                                                <span className="inline-block px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded">
                                                    PRE-SALE
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex-1">
                                            {item.isSoldAsSeries ? (
                                                <div className="p-2 bg-slate-800 rounded border border-purple-200">
                                                    <p className="font-semibold text-white">{item.carName}</p>
                                                    <p className="text-sm text-slate-400">{item.carId}</p>
                                                </div>
                                            ) : (
                                                <InventoryItemSelector
                                                    key={item.inventoryItemId || `empty-${index}`}
                                                    value={item.inventoryItemId || ''}
                                                    onChange={(itemId) => updateDeliveryItem(index, 'inventoryItemId', itemId)}
                                                    excludeIds={newDelivery.items
                                                        .filter((_, i) => i !== index)
                                                        .map(item => item.inventoryItemId)
                                                        .filter(Boolean) as string[]
                                                    }
                                                    placeholder="Buscar pieza en inventario..."
                                                    required
                                                    fallbackName={item.carName || undefined}
                                                />
                                            )}
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
                                                        if (val === '') {
                                                            updateDeliveryItem(index, 'quantity', '')
                                                        } else {
                                                            const num = parseInt(val)
                                                            updateDeliveryItem(index, 'quantity', isNaN(num) ? 1 : Math.max(1, num))
                                                        }
                                                    }}
                                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                                        if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                                            updateDeliveryItem(index, 'quantity', 1)
                                                        }
                                                    }}
                                                    min="1"
                                                    disabled={item.isSoldAsSeries}
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
                                                        if (val === '') {
                                                            updateDeliveryItem(index, 'unitPrice', '')
                                                        } else {
                                                            const num = parseFloat(val)
                                                            updateDeliveryItem(index, 'unitPrice', isNaN(num) ? 0 : num)
                                                        }
                                                    }}
                                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                                        if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                                                            updateDeliveryItem(index, 'unitPrice', 0)
                                                        }
                                                    }}
                                                    step="0.01"
                                                    min="0"
                                                    disabled={item.isSoldAsSeries}
                                                    className="min-h-[44px]"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="danger"
                                                onClick={() => removeDeliveryItem(index)}
                                                className="min-h-[44px] min-w-[44px] px-3"
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Complete Series Button */}
                                    {(() => {
                                        console.log('🔍 Item debug:', {
                                            carName: item.carName,
                                            seriesId: item.seriesId,
                                            seriesName: item.seriesName,
                                            seriesSize: item.seriesSize,
                                            seriesPrice: item.seriesPrice,
                                            isSoldAsSeries: item.isSoldAsSeries,
                                            shouldShowButton: !!item.seriesId && !item.isSoldAsSeries
                                        })

                                        if (!item.seriesId || item.isSoldAsSeries) {
                                            return null
                                        }

                                        // Count how many pieces from this series are already in the delivery
                                        const seriesItemsInDelivery = newDelivery.items.filter(i => i.seriesId === item.seriesId).length
                                        const missingPieces = (item.seriesSize || 0) - seriesItemsInDelivery

                                        console.log('🔍 Series calculation:', {
                                            seriesId: item.seriesId,
                                            seriesItemsInDelivery,
                                            seriesSize: item.seriesSize,
                                            missingPieces
                                        })

                                        if (missingPieces > 0) {
                                            return (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => completeSeries(item.seriesId!, item.seriesPrice || 0, item.seriesSize || 0)}
                                                    className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                                                >
                                                    🎁 Completar Serie: {item.seriesName} ({missingPieces} {missingPieces === 1 ? 'pieza faltante' : 'piezas faltantes'}) - ${item.seriesPrice?.toFixed(2)}
                                                </Button>
                                            )
                                        }
                                        return null
                                    })()}

                                    {/* Series Badge */}
                                    {item.isSoldAsSeries && (
                                        <div className="px-3 py-2 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                                            ✨ Vendido como parte de serie: {item.seriesName} (${item.unitPrice?.toFixed(2)}/pieza)
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {newDelivery.items.length > 0 && (
                            <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
                                <p className="text-lg font-semibold">Total: ${calculateTotal().toFixed(2)}</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notas (Opcional)
                        </label>
                        <textarea
                            className="input w-full h-20 resize-none"
                            placeholder="Notas adicionales sobre la entrega..."
                            value={newDelivery.notes}
                            onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
                        />
                    </div>

                    {/* Third Party Delivery Section */}
                    <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="isThirdParty"
                                checked={newDelivery.isThirdPartyDelivery}
                                onChange={(e) => setNewDelivery({
                                    ...newDelivery,
                                    isThirdPartyDelivery: e.target.checked,
                                    thirdPartyRecipient: e.target.checked ? newDelivery.thirdPartyRecipient : '',
                                    thirdPartyPhone: e.target.checked ? newDelivery.thirdPartyPhone : ''
                                })}
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
                                    onChange={(e) => setNewDelivery({
                                        ...newDelivery,
                                        thirdPartyRecipient: e.target.value
                                    })}
                                    required={newDelivery.isThirdPartyDelivery}
                                />
                                <Input
                                    type="tel"
                                    label="Teléfono del Receptor (Opcional)"
                                    placeholder="Número de teléfono para contacto"
                                    value={newDelivery.thirdPartyPhone}
                                    onChange={(e) => setNewDelivery({
                                        ...newDelivery,
                                        thirdPartyPhone: e.target.value
                                    })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Payment Plan Configuration - Only show if delivery has presale items and not in edit mode */}
                    {!isEditMode && newDelivery.items.some(item => item.inventoryItemId?.startsWith('presale_')) && (
                        <div className="border-t pt-4 mt-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-medium text-white">Plan de Pagos (Preventa)</h3>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={paymentPlanConfig.enabled}
                                        onChange={(e) => setPaymentPlanConfig({
                                            ...paymentPlanConfig,
                                            enabled: e.target.checked
                                        })}
                                        className="mr-2 h-4 w-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm">Habilitar pagos parciales</span>
                                </label>
                            </div>

                            {paymentPlanConfig.enabled && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Número de Pagos
                                            </label>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                min="2"
                                                max="12"
                                                value={paymentPlanConfig.numberOfPayments || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    if (val === '') {
                                                        setPaymentPlanConfig({ ...paymentPlanConfig, numberOfPayments: '' as any })
                                                    } else {
                                                        const num = parseInt(val)
                                                        setPaymentPlanConfig({ ...paymentPlanConfig, numberOfPayments: isNaN(num) ? 2 : Math.max(2, Math.min(12, num)) })
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    if (e.target.value === '' || parseInt(e.target.value) < 2) {
                                                        setPaymentPlanConfig({ ...paymentPlanConfig, numberOfPayments: 2 })
                                                    }
                                                }}
                                                className="input w-full"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Frecuencia
                                            </label>
                                            <select
                                                value={paymentPlanConfig.paymentFrequency}
                                                onChange={(e) => setPaymentPlanConfig({
                                                    ...paymentPlanConfig,
                                                    paymentFrequency: e.target.value as 'weekly' | 'biweekly' | 'monthly'
                                                })}
                                                className="input w-full"
                                            >
                                                <option value="weekly">Semanal</option>
                                                <option value="biweekly">Quincenal</option>
                                                <option value="monthly">Mensual</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Fecha Primer Pago
                                            </label>
                                            <input
                                                type="date"
                                                value={paymentPlanConfig.startDate}
                                                onChange={(e) => setPaymentPlanConfig({
                                                    ...paymentPlanConfig,
                                                    startDate: e.target.value
                                                })}
                                                className="input w-full"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Bono Pago Anticipado (%)
                                            </label>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                max="20"
                                                step="0.5"
                                                value={paymentPlanConfig.earlyPaymentBonus || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    if (val === '') {
                                                        setPaymentPlanConfig({ ...paymentPlanConfig, earlyPaymentBonus: '' as any })
                                                    } else {
                                                        const num = parseFloat(val)
                                                        setPaymentPlanConfig({ ...paymentPlanConfig, earlyPaymentBonus: isNaN(num) ? 0 : Math.max(0, Math.min(20, num)) })
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                                                        setPaymentPlanConfig({ ...paymentPlanConfig, earlyPaymentBonus: 0 })
                                                    }
                                                }}
                                                className="input w-full"
                                            />
                                        </div>
                                    </div>

                                    {/* Payment Summary */}
                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <h4 className="font-medium text-sm mb-2">Resumen del Plan</h4>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-400">Total:</span>
                                                <div className="font-medium">${newDelivery.totalAmount.toFixed(2)}</div>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Por Pago:</span>
                                                <div className="font-medium">
                                                    ${(newDelivery.totalAmount / paymentPlanConfig.numberOfPayments).toFixed(2)}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Fecha Final:</span>
                                                <div className="font-medium text-xs">
                                                    {(() => {
                                                        const start = new Date(paymentPlanConfig.startDate)
                                                        const freq = paymentPlanConfig.paymentFrequency
                                                        const days = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30
                                                        const end = new Date(start)
                                                        end.setDate(end.getDate() + (days * (paymentPlanConfig.numberOfPayments - 1)))
                                                        return end.toLocaleDateString()
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        {paymentPlanConfig.earlyPaymentBonus > 0 && (
                                            <div className="mt-2 text-xs text-green-700">
                                                💰 Con {paymentPlanConfig.earlyPaymentBonus}% de descuento si paga todo anticipado
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Create Customer Modal */}
            <Modal
                isOpen={showCreateCustomerModal}
                onClose={() => setShowCreateCustomerModal(false)}
                title="Crear Nuevo Cliente"
                maxWidth="md"
                footer={
                    <div className="flex space-x-3">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowCreateCustomerModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="flex-1"
                            onClick={handleCreateCustomer}
                            disabled={createCustomerMutation.isLoading}
                        >
                            {createCustomerMutation.isLoading ? 'Creando...' : 'Crear Cliente'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre *
                        </label>
                        <Input
                            type="text"
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            placeholder="Nombre del cliente"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <Input
                            type="email"
                            value={newCustomer.email}
                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            placeholder="email@cliente.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono
                        </label>
                        <Input
                            type="tel"
                            value={newCustomer.phone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            placeholder="+1234567890"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dirección
                        </label>
                        <Input
                            type="text"
                            value={newCustomer.address}
                            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                            placeholder="Dirección del cliente"
                        />
                    </div>
                </div>
            </Modal>

            {/* Delivery Details Modal */}
            <DeliveryDetailsModal
                delivery={selectedDelivery}
                isOpen={showDetailsModal}
                onClose={handleCloseDetails}
                onMarkAsPrepared={handleMarkAsPrepared}
                onMarkAsCompleted={handleMarkAsCompleted}
                onEdit={handleEditDelivery}
                onViewCustomer={(customerId) => navigate(`/customers/${customerId}`)}
                onShareReport={() => setShowReportModal(true)}
                onRegisterPayment={handleOpenPaymentModal}
                onDeletePayment={handleDeletePayment}
                inventoryItems={inventoryItems}
                preSaleItems={preSaleItems}
                markPreparedLoading={markPreparedMutation.isLoading}
                markCompletedLoading={markCompletedMutation.isLoading}
                onOpenImageModal={handleOpenImageModal}
            />

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal && selectedDelivery !== null}
                onClose={() => setShowPaymentModal(false)}
                title="Registrar Pago"
                maxWidth="md"
                footer={
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowPaymentModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="flex-1"
                            onClick={handleAddPayment}
                            disabled={addPaymentMutation.isLoading || newPayment.amount <= 0}
                        >
                            {addPaymentMutation.isLoading ? 'Registrando...' : 'Registrar Pago'}
                        </Button>
                    </div>
                }
            >
                {selectedDelivery && (
                    <div className="space-y-4">
                        {/* Amount Info */}
                        <div className="bg-slate-700/30 p-4 rounded-lg space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Total:</span>
                                <span className="font-medium">${selectedDelivery.totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Pagado:</span>
                                <span className="text-green-600 font-medium">${(selectedDelivery.paidAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-white font-medium">Pendiente:</span>
                                <span className="text-orange-600 font-bold">${(selectedDelivery.totalAmount - (selectedDelivery.paidAmount || 0)).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monto a Pagar *
                            </label>
                            <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={newPayment.amount || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const val = e.target.value
                                    if (val === '') {
                                        setNewPayment({ ...newPayment, amount: 0 })
                                    } else {
                                        const num = parseFloat(val)
                                        setNewPayment({ ...newPayment, amount: isNaN(num) ? 0 : num })
                                    }
                                }}
                                onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                    if (e.target.value === '') {
                                        setNewPayment({ ...newPayment, amount: 0 })
                                    }
                                }}
                                step="0.01"
                                min="0"
                                max={selectedDelivery.totalAmount - (selectedDelivery.paidAmount || 0)}
                                className="min-h-[44px]"
                            />
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Método de Pago *
                            </label>
                            <select
                                className="w-full px-4 py-3 text-base border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px] touch-manipulation"
                                value={newPayment.paymentMethod}
                                onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value as any })}
                            >
                                <option value="cash">Efectivo</option>
                                <option value="transfer">Transferencia</option>
                                <option value="card">Tarjeta</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notas (opcional)
                            </label>
                            <textarea
                                className="w-full px-4 py-3 text-base border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px] touch-manipulation"
                                placeholder="Detalles adicionales del pago..."
                                value={newPayment.notes}
                                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delivery Report Modal */}
            {showReportModal && selectedDelivery && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                    <div className="bg-slate-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto overflow-x-hidden">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-white">Reporte de Entrega</h2>
                            <button
                                onClick={handleCloseReport}
                                className="text-gray-400 hover:text-slate-400"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <DeliveryReport delivery={selectedDelivery} onClose={handleCloseReport} inline />
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Image Modal */}
            {showImageModal && allImagesForModal.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[70]">
                    <button
                        onClick={handleCloseImageModal}
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                    >
                        <X size={24} />
                    </button>

                    <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                    >
                        <ChevronLeft size={32} />
                    </button>

                    <div className="flex flex-col items-center justify-center max-w-4xl max-h-[90vh]">
                        <img
                            src={allImagesForModal[currentImageIndex]}
                            alt={`Imagen ${currentImageIndex + 1}`}
                            className="max-w-full max-h-[80vh] object-contain"
                        />
                        <div className="mt-4 text-white text-center">
                            <p className="text-sm">
                                Imagen {currentImageIndex + 1} de {allImagesForModal.length}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                    >
                        <ChevronRight size={32} />
                    </button>
                </div>
            )}
        </div>
    )
}
