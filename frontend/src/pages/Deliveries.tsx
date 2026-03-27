import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from 'react-query'
import { useStore } from '@/contexts/StoreContext'
import { useDeliveries, useAllDeliveries, useCreateDelivery, useUpdateDelivery, useMarkDeliveryAsCompleted, useMarkDeliveryAsPrepared, useDeleteDelivery, useAddPayment, useDeletePayment } from '@/hooks/useDeliveries'
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers'
import { useInventory } from '@/hooks/useInventory'
import { useDeliveryLocations, useCreateDeliveryLocation } from '@/hooks/useDeliveryLocations'
import { usePreSaleItems } from '@/hooks/usePresale'
import { useCreatePaymentPlan } from '@/hooks/usePaymentPlans'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import PageHeader from '@/components/common/PageHeader'
import { Loading } from '@/components/common/Loading'
import DeliveryCard from '@/components/DeliveryCard'
import { DeliveryDetailsModal } from '@/components/DeliveryDetailsModal'
import { Plus, Truck, TrendingUp } from 'lucide-react'
import DeliveryPaymentModal from '@/components/deliveries/DeliveryPaymentModal'
import DeliveryReportModal from '@/components/deliveries/DeliveryReportModal'
import DeliveryImageViewerModal from '@/components/deliveries/DeliveryImageViewerModal'
import DeliveryPaymentStatusDialog from '@/components/deliveries/DeliveryPaymentStatusDialog'
import CreateCustomerModal from '@/components/deliveries/CreateCustomerModal'
import DeliveryFormModal from '@/components/deliveries/DeliveryFormModal'
import DeliveriesStatsAndFilters from '@/components/deliveries/DeliveriesStatsAndFilters'
import { useDeliveryDetailsActions } from '@/hooks/useDeliveryDetailsActions'
import { useDeliveryFormActions } from '@/hooks/useDeliveryFormActions'

export default function Deliveries() {
    const navigate = useNavigate()
    const { selectedStore } = useStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)

    // Usar desde el inicio del año por defecto, no hace 30 días
    const [selectedDate, setSelectedDate] = useState(() => {
        // Mostrar sin filtro de fecha inicial (vacío = mostrar todas)
        return ''
    })
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    })

    const { data: deliveries, isLoading, error } = useDeliveries(statusFilter, selectedDate, selectedStore || undefined)
    const { data: allDeliveries } = useAllDeliveries(selectedDate, selectedStore || undefined) // Always loaded for widget stats
    const { data: customers } = useCustomers(selectedStore || undefined)
    // Only load inventory when creating/editing a delivery
    const { data: inventoryData } = useInventory({
        limit: showCreateModal ? 1000 : 10, // Load all only when modal is open
        selectedStore: selectedStore || undefined
    })
    const inventoryItems = inventoryData?.items || []
    const { data: deliveryLocations } = useDeliveryLocations()
    const { data: preSaleItems } = usePreSaleItems({ storeId: selectedStore || undefined })

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

    const {
        isEditMode,
        newDelivery,
        setNewDelivery,
        paymentPlanConfig,
        setPaymentPlanConfig,
        customLocation,
        setCustomLocation,
        showCustomLocationInput,
        setShowCustomLocationInput,
        handleCloseModal,
        handleCreateDelivery,
        handleEditDelivery,
        handleLocationChange,
        handleCustomLocationBlur,
        addDeliveryItem,
        updateDeliveryItem,
        completeSeries,
        removeDeliveryItem,
        calculateTotal,
    } = useDeliveryFormActions({
        setShowCreateModal,
        inventoryItems,
        deliveryLocations,
        createDelivery: createDeliveryMutation.mutateAsync,
        updateDelivery: updateDeliveryMutation.mutateAsync,
        createPaymentPlan: createPaymentPlanMutation.mutateAsync,
        createLocation: createLocationMutation.mutateAsync,
        invalidateInventory: () => queryClient.invalidateQueries(['inventory']),
    })

    const {
        showDetailsModal,
        showPaymentModal,
        showReportModal,
        showImageModal,
        showPaymentStatusDialog,
        allImagesForModal,
        currentImageIndex,
        selectedDelivery,
        newPayment,
        setNewPayment,
        handleMarkAsCompleted,
        handleOpenPaymentStatusDialog,
        handleConfirmPaymentStatus,
        handleClosePaymentStatusDialog,
        handleMarkAsPrepared,
        handleViewDetails,
        handleShowReport,
        handleOpenReportFromDetails,
        handleCloseReport,
        handleCloseDetails,
        handleOpenImageModal,
        handleCloseImageModal,
        handlePrevImage,
        handleNextImage,
        handleOpenPaymentModal,
        handleClosePaymentModal,
        handleAddPayment,
        handleDeletePayment,
    } = useDeliveryDetailsActions({
        deliveries,
        markCompleted: markCompletedMutation.mutateAsync,
        markPrepared: markPreparedMutation.mutateAsync,
        addPayment: addPaymentMutation.mutateAsync,
        deletePayment: deletePaymentMutation.mutateAsync,
    })

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

    const handleDeleteDelivery = async (deliveryId: string) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta entrega?')) {
            await deleteDeliveryMutation.mutateAsync(deliveryId)
        }
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

    return (
        <div className="space-y-4 lg:space-y-6">
            <PageHeader
                title="Entregas"
                subtitle="Calendario y gestión de entregas"
                actions={
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
                }
            />

            <DeliveriesStatsAndFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                totalDeliveries={totalDeliveries}
                pendingDeliveries={pendingDeliveries}
                preparedDeliveries={preparedDeliveries}
                completedDeliveries={completedDeliveries}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
            />

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
                                onMarkAsCompleted={handleOpenPaymentStatusDialog}
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
            <DeliveryFormModal
                isOpen={showCreateModal}
                onClose={handleCloseModal}
                isEditMode={isEditMode}
                addDeliveryItem={addDeliveryItem}
                handleCreateDelivery={handleCreateDelivery}
                createLoading={createDeliveryMutation.isLoading}
                updateLoading={updateDeliveryMutation.isLoading}
                newDelivery={newDelivery}
                setNewDelivery={setNewDelivery}
                customers={customers}
                onOpenCreateCustomer={() => setShowCreateCustomerModal(true)}
                deliveryLocations={deliveryLocations}
                showCustomLocationInput={showCustomLocationInput}
                customLocation={customLocation}
                setCustomLocation={setCustomLocation}
                handleCustomLocationBlur={handleCustomLocationBlur}
                handleLocationChange={handleLocationChange}
                setShowCustomLocationInput={setShowCustomLocationInput}
                updateDeliveryItem={updateDeliveryItem}
                removeDeliveryItem={removeDeliveryItem}
                completeSeries={completeSeries}
                calculateTotal={calculateTotal}
                paymentPlanConfig={paymentPlanConfig}
                setPaymentPlanConfig={setPaymentPlanConfig}
            />

            {/* Create Customer Modal */}
            <CreateCustomerModal
                isOpen={showCreateCustomerModal}
                onClose={() => setShowCreateCustomerModal(false)}
                newCustomer={newCustomer}
                isCreating={createCustomerMutation.isLoading}
                onCreate={handleCreateCustomer}
                onChange={setNewCustomer}
            />

            {/* Delivery Details Modal */}
            <DeliveryDetailsModal
                delivery={selectedDelivery}
                isOpen={showDetailsModal}
                onClose={handleCloseDetails}
                onMarkAsPrepared={handleMarkAsPrepared}
                onMarkAsCompleted={handleMarkAsCompleted}
                onEdit={handleEditDelivery}
                onViewCustomer={(customerId) => navigate(`/customers/${customerId}`)}
                onShareReport={handleOpenReportFromDetails}
                onRegisterPayment={handleOpenPaymentModal}
                onDeletePayment={handleDeletePayment}
                onDelete={(id) => deleteDeliveryMutation.mutateAsync(id)}
                inventoryItems={inventoryItems}
                preSaleItems={preSaleItems}
                markPreparedLoading={markPreparedMutation.isLoading}
                markCompletedLoading={markCompletedMutation.isLoading}
                onOpenImageModal={handleOpenImageModal}
            />

            <DeliveryPaymentModal
                isOpen={showPaymentModal}
                selectedDelivery={selectedDelivery}
                newPayment={newPayment}
                isLoading={addPaymentMutation.isLoading}
                onClose={handleClosePaymentModal}
                onSubmit={handleAddPayment}
                onPaymentChange={setNewPayment}
            />

            <DeliveryReportModal
                isOpen={showReportModal}
                selectedDelivery={selectedDelivery}
                onClose={handleCloseReport}
            />

            <DeliveryImageViewerModal
                isOpen={showImageModal}
                images={allImagesForModal}
                currentIndex={currentImageIndex}
                onClose={handleCloseImageModal}
                onPrev={handlePrevImage}
                onNext={handleNextImage}
            />

            <DeliveryPaymentStatusDialog
                isOpen={showPaymentStatusDialog}
                isLoading={markCompletedMutation.isLoading}
                onClose={handleClosePaymentStatusDialog}
                onConfirm={handleConfirmPaymentStatus}
            />
        </div>
    )
}
