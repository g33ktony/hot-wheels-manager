import type React from 'react'
import { DeliveryDetailsModal } from '@/components/DeliveryDetailsModal'
import CreateCustomerModal from '@/components/deliveries/CreateCustomerModal'
import DeliveryFormModal from '@/components/deliveries/DeliveryFormModal'
import DeliveryImageViewerModal from '@/components/deliveries/DeliveryImageViewerModal'
import DeliveryPaymentModal from '@/components/deliveries/DeliveryPaymentModal'
import DeliveryPaymentStatusDialog from '@/components/deliveries/DeliveryPaymentStatusDialog'
import DeliveryReportModal from '@/components/deliveries/DeliveryReportModal'

type DeliveryFormModalProps = React.ComponentProps<typeof DeliveryFormModal>
type CreateCustomerModalProps = React.ComponentProps<typeof CreateCustomerModal>
type DeliveryDetailsModalProps = React.ComponentProps<typeof DeliveryDetailsModal>
type DeliveryPaymentModalProps = React.ComponentProps<typeof DeliveryPaymentModal>
type DeliveryReportModalProps = React.ComponentProps<typeof DeliveryReportModal>
type DeliveryImageViewerModalProps = React.ComponentProps<typeof DeliveryImageViewerModal>
type DeliveryPaymentStatusDialogProps = React.ComponentProps<typeof DeliveryPaymentStatusDialog>

interface DeliveriesModalsProps {
  showCreateModal: DeliveryFormModalProps['isOpen']
  handleCloseModal: DeliveryFormModalProps['onClose']
  isEditMode: DeliveryFormModalProps['isEditMode']
  addDeliveryItem: DeliveryFormModalProps['addDeliveryItem']
  handleCreateDelivery: DeliveryFormModalProps['handleCreateDelivery']
  createLoading: DeliveryFormModalProps['createLoading']
  updateLoading: DeliveryFormModalProps['updateLoading']
  newDelivery: DeliveryFormModalProps['newDelivery']
  setNewDelivery: DeliveryFormModalProps['setNewDelivery']
  customers: DeliveryFormModalProps['customers']
  openCreateCustomer: DeliveryFormModalProps['onOpenCreateCustomer']
  deliveryLocations: DeliveryFormModalProps['deliveryLocations']
  showCustomLocationInput: DeliveryFormModalProps['showCustomLocationInput']
  customLocation: string
  setCustomLocation: DeliveryFormModalProps['setCustomLocation']
  handleCustomLocationBlur: DeliveryFormModalProps['handleCustomLocationBlur']
  handleLocationChange: DeliveryFormModalProps['handleLocationChange']
  setShowCustomLocationInput: DeliveryFormModalProps['setShowCustomLocationInput']
  updateDeliveryItem: DeliveryFormModalProps['updateDeliveryItem']
  removeDeliveryItem: DeliveryFormModalProps['removeDeliveryItem']
  completeSeries: DeliveryFormModalProps['completeSeries']
  calculateTotal: DeliveryFormModalProps['calculateTotal']
  paymentPlanConfig: DeliveryFormModalProps['paymentPlanConfig']
  setPaymentPlanConfig: DeliveryFormModalProps['setPaymentPlanConfig']
  showCreateCustomerModal: CreateCustomerModalProps['isOpen']
  closeCreateCustomer: CreateCustomerModalProps['onClose']
  newCustomer: CreateCustomerModalProps['newCustomer']
  createCustomerLoading: CreateCustomerModalProps['isCreating']
  handleCreateCustomer: CreateCustomerModalProps['onCreate']
  setNewCustomer: CreateCustomerModalProps['onChange']
  selectedDelivery: DeliveryDetailsModalProps['delivery']
  showDetailsModal: DeliveryDetailsModalProps['isOpen']
  handleCloseDetails: DeliveryDetailsModalProps['onClose']
  handleMarkAsPrepared: DeliveryDetailsModalProps['onMarkAsPrepared']
  handleMarkAsCompleted: DeliveryDetailsModalProps['onMarkAsCompleted']
  handleEditDelivery: DeliveryDetailsModalProps['onEdit']
  handleOpenReportFromDetails: DeliveryDetailsModalProps['onShareReport']
  handleOpenPaymentModal: DeliveryDetailsModalProps['onRegisterPayment']
  handleDeletePayment: DeliveryDetailsModalProps['onDeletePayment']
  deleteDelivery: DeliveryDetailsModalProps['onDelete']
  inventoryItems: DeliveryDetailsModalProps['inventoryItems']
  preSaleItems: DeliveryDetailsModalProps['preSaleItems']
  markPreparedLoading: DeliveryDetailsModalProps['markPreparedLoading']
  markCompletedLoading: DeliveryDetailsModalProps['markCompletedLoading']
  handleOpenImageModal: DeliveryDetailsModalProps['onOpenImageModal']
  showPaymentModal: DeliveryPaymentModalProps['isOpen']
  newPayment: DeliveryPaymentModalProps['newPayment']
  addPaymentLoading: DeliveryPaymentModalProps['isLoading']
  handleClosePaymentModal: DeliveryPaymentModalProps['onClose']
  handleAddPayment: DeliveryPaymentModalProps['onSubmit']
  setNewPayment: DeliveryPaymentModalProps['onPaymentChange']
  showReportModal: DeliveryReportModalProps['isOpen']
  handleCloseReport: DeliveryReportModalProps['onClose']
  showImageModal: DeliveryImageViewerModalProps['isOpen']
  allImagesForModal: DeliveryImageViewerModalProps['images']
  currentImageIndex: DeliveryImageViewerModalProps['currentIndex']
  handleCloseImageModal: DeliveryImageViewerModalProps['onClose']
  handlePrevImage: DeliveryImageViewerModalProps['onPrev']
  handleNextImage: DeliveryImageViewerModalProps['onNext']
  showPaymentStatusDialog: DeliveryPaymentStatusDialogProps['isOpen']
  handleClosePaymentStatusDialog: DeliveryPaymentStatusDialogProps['onClose']
  handleConfirmPaymentStatus: DeliveryPaymentStatusDialogProps['onConfirm']
  navigateToCustomer: DeliveryDetailsModalProps['onViewCustomer']
}

export default function DeliveriesModals({
  showCreateModal,
  handleCloseModal,
  isEditMode,
  addDeliveryItem,
  handleCreateDelivery,
  createLoading,
  updateLoading,
  newDelivery,
  setNewDelivery,
  customers,
  openCreateCustomer,
  deliveryLocations,
  showCustomLocationInput,
  customLocation,
  setCustomLocation,
  handleCustomLocationBlur,
  handleLocationChange,
  setShowCustomLocationInput,
  updateDeliveryItem,
  removeDeliveryItem,
  completeSeries,
  calculateTotal,
  paymentPlanConfig,
  setPaymentPlanConfig,
  showCreateCustomerModal,
  closeCreateCustomer,
  newCustomer,
  createCustomerLoading,
  handleCreateCustomer,
  setNewCustomer,
  selectedDelivery,
  showDetailsModal,
  handleCloseDetails,
  handleMarkAsPrepared,
  handleMarkAsCompleted,
  handleEditDelivery,
  handleOpenReportFromDetails,
  handleOpenPaymentModal,
  handleDeletePayment,
  deleteDelivery,
  inventoryItems,
  preSaleItems,
  markPreparedLoading,
  markCompletedLoading,
  handleOpenImageModal,
  showPaymentModal,
  newPayment,
  addPaymentLoading,
  handleClosePaymentModal,
  handleAddPayment,
  setNewPayment,
  showReportModal,
  handleCloseReport,
  showImageModal,
  allImagesForModal,
  currentImageIndex,
  handleCloseImageModal,
  handlePrevImage,
  handleNextImage,
  showPaymentStatusDialog,
  handleClosePaymentStatusDialog,
  handleConfirmPaymentStatus,
  navigateToCustomer,
}: DeliveriesModalsProps) {
  return (
    <>
      <DeliveryFormModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        isEditMode={isEditMode}
        addDeliveryItem={addDeliveryItem}
        handleCreateDelivery={handleCreateDelivery}
        createLoading={createLoading}
        updateLoading={updateLoading}
        newDelivery={newDelivery}
        setNewDelivery={setNewDelivery}
        customers={customers}
        onOpenCreateCustomer={openCreateCustomer}
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

      <CreateCustomerModal
        isOpen={showCreateCustomerModal}
        onClose={closeCreateCustomer}
        newCustomer={newCustomer}
        isCreating={createCustomerLoading}
        onCreate={handleCreateCustomer}
        onChange={setNewCustomer}
      />

      <DeliveryDetailsModal
        delivery={selectedDelivery}
        isOpen={showDetailsModal}
        onClose={handleCloseDetails}
        onMarkAsPrepared={handleMarkAsPrepared}
        onMarkAsCompleted={handleMarkAsCompleted}
        onEdit={handleEditDelivery}
        onViewCustomer={navigateToCustomer}
        onShareReport={handleOpenReportFromDetails}
        onRegisterPayment={handleOpenPaymentModal}
        onDeletePayment={handleDeletePayment}
        onDelete={deleteDelivery}
        inventoryItems={inventoryItems}
        preSaleItems={preSaleItems}
        markPreparedLoading={markPreparedLoading}
        markCompletedLoading={markCompletedLoading}
        onOpenImageModal={handleOpenImageModal}
      />

      <DeliveryPaymentModal
        isOpen={showPaymentModal}
        selectedDelivery={selectedDelivery}
        newPayment={newPayment}
        isLoading={addPaymentLoading}
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
        isLoading={markCompletedLoading ?? false}
        onClose={handleClosePaymentStatusDialog}
        onConfirm={handleConfirmPaymentStatus}
      />
    </>
  )
}
