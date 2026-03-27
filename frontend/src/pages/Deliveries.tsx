import { useNavigate } from 'react-router-dom'
import { useStore } from '@/contexts/StoreContext'
import Button from '@/components/common/Button'
import PageHeader from '@/components/common/PageHeader'
import { Loading } from '@/components/common/Loading'
import { Plus, Truck, TrendingUp } from 'lucide-react'
import DeliveriesModals from '@/components/deliveries/DeliveriesModals'
import DeliveriesList from '@/components/deliveries/DeliveriesList'
import DeliveriesStatsAndFilters from '@/components/deliveries/DeliveriesStatsAndFilters'
import { useDeliveryDetailsActions } from '@/hooks/useDeliveryDetailsActions'
import { useDeliveryFormActions } from '@/hooks/useDeliveryFormActions'
import { useDeliveriesPageState } from '@/hooks/useDeliveriesPageState'
import { useDeliveriesPageComputed } from '@/hooks/useDeliveriesPageComputed'
import { useDeliveryCustomerActions } from '@/hooks/useDeliveryCustomerActions'
import { useDeliveriesPageData } from '@/hooks/useDeliveriesPageData'
import { useDeliveryDeleteAction } from '@/hooks/useDeliveryDeleteAction'

export default function Deliveries() {
    const navigate = useNavigate()
    const { selectedStore } = useStore()
    const {
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        showCreateModal,
        setShowCreateModal,
        showCreateCustomerModal,
        setShowCreateCustomerModal,
        selectedDate,
        setSelectedDate,
        newCustomer,
        setNewCustomer,
    } = useDeliveriesPageState()

    const {
        deliveries,
        allDeliveries,
        customers,
        inventoryItems,
        deliveryLocations,
        preSaleItems,
        isLoading,
        error,
        errorMessage,
        createDeliveryMutation,
        updateDeliveryMutation,
        createCustomerMutation,
        createLocationMutation,
        markCompletedMutation,
        markPreparedMutation,
        deleteDeliveryMutation,
        addPaymentMutation,
        deletePaymentMutation,
        createPaymentPlanMutation,
        queryClient,
    } = useDeliveriesPageData({
        selectedStore: selectedStore || undefined,
        statusFilter,
        selectedDate,
        showCreateModal,
    })

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

    const { handleCreateCustomer } = useDeliveryCustomerActions({
        newCustomer,
        setNewCustomer,
        setNewDelivery,
        setShowCreateCustomerModal,
        createCustomer: createCustomerMutation.mutateAsync,
    })

    const {
        filteredDeliveries,
        totalDeliveries,
        pendingDeliveries,
        preparedDeliveries,
        completedDeliveries,
    } = useDeliveriesPageComputed({
        deliveries,
        allDeliveries,
        searchTerm,
        selectedDate,
    })

    const { handleDeleteDelivery } = useDeliveryDeleteAction({
        deleteDelivery: deleteDeliveryMutation.mutateAsync,
    })

    // Show loading only on initial load, not when filter changes or data is being refetched
    if (isLoading && deliveries.length === 0) {
        return <Loading text="Cargando entregas..." />
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="mb-4">
                    <Truck size={64} className="mx-auto text-slate-400 mb-4" />
                    <p className="text-danger-600 text-lg font-semibold mb-2">Error al cargar las entregas</p>
                    <p className="text-slate-400 text-sm mb-4">
                        {errorMessage || 'No se pudo conectar con el servidor'}
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

            <DeliveriesList
                filteredDeliveries={filteredDeliveries}
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

            <DeliveriesModals
                showCreateModal={showCreateModal}
                handleCloseModal={handleCloseModal}
                isEditMode={isEditMode}
                addDeliveryItem={addDeliveryItem}
                handleCreateDelivery={handleCreateDelivery}
                createLoading={createDeliveryMutation.isLoading}
                updateLoading={updateDeliveryMutation.isLoading}
                newDelivery={newDelivery}
                setNewDelivery={setNewDelivery}
                customers={customers}
                openCreateCustomer={() => setShowCreateCustomerModal(true)}
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
                showCreateCustomerModal={showCreateCustomerModal}
                closeCreateCustomer={() => setShowCreateCustomerModal(false)}
                newCustomer={newCustomer}
                createCustomerLoading={createCustomerMutation.isLoading}
                handleCreateCustomer={handleCreateCustomer}
                setNewCustomer={setNewCustomer}
                selectedDelivery={selectedDelivery}
                showDetailsModal={showDetailsModal}
                handleCloseDetails={handleCloseDetails}
                handleMarkAsPrepared={handleMarkAsPrepared}
                handleMarkAsCompleted={handleMarkAsCompleted}
                handleEditDelivery={handleEditDelivery}
                handleOpenReportFromDetails={handleOpenReportFromDetails}
                handleOpenPaymentModal={handleOpenPaymentModal}
                handleDeletePayment={handleDeletePayment}
                deleteDelivery={deleteDeliveryMutation.mutateAsync}
                inventoryItems={inventoryItems}
                preSaleItems={preSaleItems}
                markPreparedLoading={markPreparedMutation.isLoading}
                markCompletedLoading={markCompletedMutation.isLoading}
                handleOpenImageModal={handleOpenImageModal}
                showPaymentModal={showPaymentModal}
                newPayment={newPayment}
                addPaymentLoading={addPaymentMutation.isLoading}
                handleClosePaymentModal={handleClosePaymentModal}
                handleAddPayment={handleAddPayment}
                setNewPayment={setNewPayment}
                showReportModal={showReportModal}
                handleCloseReport={handleCloseReport}
                showImageModal={showImageModal}
                allImagesForModal={allImagesForModal}
                currentImageIndex={currentImageIndex}
                handleCloseImageModal={handleCloseImageModal}
                handlePrevImage={handlePrevImage}
                handleNextImage={handleNextImage}
                showPaymentStatusDialog={showPaymentStatusDialog}
                handleClosePaymentStatusDialog={handleClosePaymentStatusDialog}
                handleConfirmPaymentStatus={handleConfirmPaymentStatus}
                navigateToCustomer={(customerId) => navigate(`/customers/${customerId}`)}
            />
        </div>
    )
}
