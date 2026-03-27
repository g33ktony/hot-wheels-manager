import { useState } from 'react'

type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other'

type PaymentStatus = 'paid' | 'unpaid' | 'partial'

interface PaymentData {
  amount: number
  paymentMethod: PaymentMethod
  notes: string
}

interface UseDeliveryDetailsActionsParams {
  deliveries?: any[]
  markCompleted: (params: { id: string; paymentStatus?: PaymentStatus }) => Promise<any>
  markPrepared: (deliveryId: string) => Promise<any>
  addPayment: (params: {
    deliveryId: string
    amount: number
    paymentMethod: PaymentMethod
    notes?: string
  }) => Promise<any>
  deletePayment: (params: { deliveryId: string; paymentId: string }) => Promise<any>
}

export function useDeliveryDetailsActions({
  deliveries,
  markCompleted,
  markPrepared,
  addPayment,
  deletePayment,
}: UseDeliveryDetailsActionsParams) {
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showPaymentStatusDialog, setShowPaymentStatusDialog] = useState(false)
  const [deliveryToCompleteId, setDeliveryToCompleteId] = useState<string | null>(null)
  const [allImagesForModal, setAllImagesForModal] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null)
  const [newPayment, setNewPayment] = useState<PaymentData>({
    amount: 0,
    paymentMethod: 'cash',
    notes: '',
  })

  const handleMarkAsCompleted = async (deliveryId: string, paymentStatus?: PaymentStatus) => {
    await markCompleted({ id: deliveryId, paymentStatus })
    setShowPaymentStatusDialog(false)
    setDeliveryToCompleteId(null)
  }

  const handleOpenPaymentStatusDialog = (deliveryId: string) => {
    if (confirm('¿Marcar esta entrega como completada?')) {
      setDeliveryToCompleteId(deliveryId)
      setShowPaymentStatusDialog(true)
    }
  }

  const handleConfirmPaymentStatus = (paymentStatus: PaymentStatus) => {
    if (deliveryToCompleteId) {
      handleMarkAsCompleted(deliveryToCompleteId, paymentStatus)
    }
  }

  const handleClosePaymentStatusDialog = () => {
    setShowPaymentStatusDialog(false)
    setDeliveryToCompleteId(null)
  }

  const handleMarkAsPrepared = async (deliveryId: string) => {
    await markPrepared(deliveryId)
  }

  const handleViewDetails = (delivery: any) => {
    setSelectedDelivery(delivery)
    setShowDetailsModal(true)
  }

  const handleShowReport = (delivery: any) => {
    setSelectedDelivery(delivery)
    setShowReportModal(true)
  }

  const handleOpenReportFromDetails = () => {
    setShowReportModal(true)
  }

  const handleCloseReport = () => {
    setShowReportModal(false)
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
        notes: '',
      })
      setShowPaymentModal(true)
    }
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false)
  }

  const handleAddPayment = async () => {
    if (!selectedDelivery || newPayment.amount <= 0) {
      alert('El monto debe ser mayor a 0')
      return
    }

    try {
      await addPayment({
        deliveryId: selectedDelivery._id,
        amount: newPayment.amount,
        paymentMethod: newPayment.paymentMethod,
        notes: newPayment.notes || undefined,
      })

      const updatedDelivery = deliveries?.find((d) => d._id === selectedDelivery._id)
      if (updatedDelivery) {
        setSelectedDelivery(updatedDelivery)
      }

      setShowPaymentModal(false)
      setNewPayment({
        amount: 0,
        paymentMethod: 'cash',
        notes: '',
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
      await deletePayment({
        deliveryId: selectedDelivery._id,
        paymentId,
      })

      const updatedDelivery = deliveries?.find((d) => d._id === selectedDelivery._id)
      if (updatedDelivery) {
        setSelectedDelivery(updatedDelivery)
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
    }
  }

  return {
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
  }
}
