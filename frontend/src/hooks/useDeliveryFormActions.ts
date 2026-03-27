import { useState } from 'react'
import { dateToString } from '@/utils/dateUtils'
import type { CreateDeliveryDto, Delivery, InventoryItem } from '../../../shared/types'
import type { PaymentPlanCreate } from '@/hooks/usePaymentPlans'

interface DeliveryFormItem {
  inventoryItemId?: string
  hotWheelsCarId?: string
  carId: string
  carName: string
  quantity: number
  unitPrice: number
  basePricePerUnit?: number
  seriesId?: string
  seriesName?: string
  seriesSize?: number
  seriesPrice?: number
  isSoldAsSeries?: boolean
}

interface NewDeliveryForm {
  customerId: string
  items: DeliveryFormItem[]
  scheduledDate: string
  scheduledTime: string
  location: string
  totalAmount: number
  notes: string
  isThirdPartyDelivery: boolean
  thirdPartyRecipient: string
  thirdPartyPhone: string
}

interface PaymentPlanConfig {
  enabled: boolean
  numberOfPayments: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: string
  earlyPaymentBonus: number
}

interface EditableDeliveryItemRaw {
  inventoryItemId?: string | { _id?: string }
  hotWheelsCarId?: string | { _id?: string }
  carId: string
  carName: string
  quantity: number
  unitPrice: number
  seriesId?: string
  seriesName?: string
  seriesSize?: number
  seriesPrice?: number
  isSoldAsSeries?: boolean
}

interface EditableDelivery {
  _id?: string
  customerId?: string | { _id?: string }
  customer?: string | { _id?: string }
  items?: EditableDeliveryItemRaw[]
  scheduledDate?: string | Date
  scheduledTime?: string
  location?: string
  totalAmount?: number
  notes?: string
  isThirdPartyDelivery?: boolean
  thirdPartyRecipient?: string
  thirdPartyPhone?: string
}

interface UseDeliveryFormActionsParams {
  setShowCreateModal: (v: boolean) => void
  inventoryItems: InventoryItem[]
  deliveryLocations?: Array<{ _id?: string; name: string }>
  createDelivery: (data: CreateDeliveryDto) => Promise<{ _id?: string }>
  updateDelivery: (params: { id: string; data: Partial<CreateDeliveryDto> }) => Promise<unknown>
  createPaymentPlan: (data: PaymentPlanCreate) => Promise<unknown>
  createLocation: (name: string) => Promise<unknown>
  invalidateInventory: () => void
}

const getInitialDelivery = (): NewDeliveryForm => ({
  customerId: '',
  items: [],
  scheduledDate: dateToString(new Date()),
  scheduledTime: '09:00',
  location: '',
  totalAmount: 0,
  notes: '',
  isThirdPartyDelivery: false,
  thirdPartyRecipient: '',
  thirdPartyPhone: '',
})

const getInitialPaymentPlanConfig = (): PaymentPlanConfig => ({
  enabled: false,
  numberOfPayments: 4,
  paymentFrequency: 'weekly',
  startDate: dateToString(new Date()),
  earlyPaymentBonus: 0,
})

export function useDeliveryFormActions({
  setShowCreateModal,
  inventoryItems,
  deliveryLocations,
  createDelivery,
  updateDelivery,
  createPaymentPlan,
  createLocation,
  invalidateInventory,
}: UseDeliveryFormActionsParams) {
  const [editingDelivery, setEditingDelivery] = useState<EditableDelivery | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [newDelivery, setNewDelivery] = useState(getInitialDelivery)
  const [paymentPlanConfig, setPaymentPlanConfig] = useState(getInitialPaymentPlanConfig)
  const [customLocation, setCustomLocation] = useState('')
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false)

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setIsEditMode(false)
    setEditingDelivery(null)
    setShowCustomLocationInput(false)
    setCustomLocation('')
    setNewDelivery(getInitialDelivery())
    setPaymentPlanConfig(getInitialPaymentPlanConfig())
  }

  const handleCreateDelivery = async () => {
    if (!newDelivery.customerId || newDelivery.items.length === 0 || !newDelivery.location) {
      alert('Cliente, items y ubicación son obligatorios')
      return
    }

    const inventoryItemsToValidate = newDelivery.items.filter((item) => {
      if (item.inventoryItemId?.startsWith('presale_')) {
        return false
      }
      return item.inventoryItemId
    })

    if (inventoryItemsToValidate.length > 0) {
      const invalidItems = inventoryItemsToValidate.filter((item) =>
        !inventoryItems.some((inv) => inv._id === item.inventoryItemId),
      )
      if (invalidItems.length > 0) {
        alert('Algunos items del inventario ya no están disponibles. Por favor, selecciona otros items.')
        return
      }

      const insufficientItems = inventoryItemsToValidate.filter((item) => {
        const inventoryItem = inventoryItems.find((inv: InventoryItem) => inv._id === item.inventoryItemId)
        if (!inventoryItem) return true

        let availableQuantity = inventoryItem.quantity - (inventoryItem.reservedQuantity || 0)

        if (isEditMode && editingDelivery) {
          let originalItem = editingDelivery.items?.find((i) => i.inventoryItemId === item.inventoryItemId)
          if (!originalItem && item.carId) {
            originalItem = editingDelivery.items?.find((i) => i.carId === item.carId)
          }
          if (originalItem) {
            availableQuantity += originalItem.quantity
          }
        }

        return availableQuantity < item.quantity
      })

      if (insufficientItems.length > 0) {
        const itemDetails = insufficientItems
          .map((item) => {
            const inventoryItem = inventoryItems.find((inv: InventoryItem) => inv._id === item.inventoryItemId)
            let availableQuantity = inventoryItem ? inventoryItem.quantity - (inventoryItem.reservedQuantity || 0) : 0

            if (isEditMode && editingDelivery) {
              let originalItem = editingDelivery.items?.find((i) => i.inventoryItemId === item.inventoryItemId)
              if (!originalItem && item.carId) {
                originalItem = editingDelivery.items?.find((i) => i.carId === item.carId)
              }
              if (originalItem) {
                availableQuantity += originalItem.quantity
              }
            }

            return `• ${item.carName}: disponible ${availableQuantity}, solicitado ${item.quantity}`
          })
          .join('\n')
        alert(`❌ Cantidad insuficiente para los siguientes items:\n\n${itemDetails}`)
        return
      }
    }

    try {
      const hasPresaleItems = newDelivery.items.some((item) => item.inventoryItemId?.startsWith('presale_'))
      let createdDelivery: { _id?: string } | undefined

      if (isEditMode && editingDelivery) {
        if (!editingDelivery._id) {
          throw new Error('Delivery ID is required for update')
        }

        await updateDelivery({
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
            thirdPartyPhone: newDelivery.thirdPartyPhone || undefined,
          },
        })
      } else {
        createdDelivery = await createDelivery({
          customerId: newDelivery.customerId,
          items: newDelivery.items,
          scheduledDate: new Date(newDelivery.scheduledDate),
          scheduledTime: newDelivery.scheduledTime,
          location: newDelivery.location,
          totalAmount: newDelivery.totalAmount,
          notes: newDelivery.notes || undefined,
          isThirdPartyDelivery: newDelivery.isThirdPartyDelivery,
          thirdPartyRecipient: newDelivery.thirdPartyRecipient || undefined,
          thirdPartyPhone: newDelivery.thirdPartyPhone || undefined,
        })

        if (hasPresaleItems && paymentPlanConfig.enabled && createdDelivery._id) {
          try {
            await createPaymentPlan({
              deliveryId: createdDelivery._id,
              customerId: newDelivery.customerId,
              totalAmount: newDelivery.totalAmount,
              numberOfPayments: paymentPlanConfig.numberOfPayments,
              paymentFrequency: paymentPlanConfig.paymentFrequency,
              startDate: new Date(paymentPlanConfig.startDate),
              earlyPaymentBonus:
                paymentPlanConfig.earlyPaymentBonus > 0 ? paymentPlanConfig.earlyPaymentBonus : undefined,
            })
          } catch (paymentPlanError) {
            console.error('Error creating payment plan:', paymentPlanError)
            alert('Entrega creada pero hubo un error al crear el plan de pagos. Puedes crearlo manualmente.')
          }
        }
      }

      handleCloseModal()
    } catch (error) {
      console.error('Error saving delivery:', error)
      invalidateInventory()
      alert(isEditMode ? 'Error al actualizar la entrega' : 'Error al crear la entrega. Los items seleccionados pueden ya no estar disponibles.')
    }
  }

  const handleEditDelivery = (delivery: Delivery | EditableDelivery) => {
    let customerId = ''
    if (delivery.customerId) {
      if (typeof delivery.customerId === 'object' && delivery.customerId._id) {
        customerId = String(delivery.customerId._id)
      } else {
        customerId = String(delivery.customerId)
      }
    } else if (delivery.customer) {
      if (typeof delivery.customer === 'string') {
        customerId = delivery.customer
      } else if (delivery.customer._id) {
        customerId = String(delivery.customer._id)
      }
    }

    const formattedDelivery = {
      customerId,
      items:
        delivery.items?.map((item) => {
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

          if (!inventoryItemId && item.hotWheelsCarId) {
            if (typeof item.hotWheelsCarId === 'string') {
              inventoryItemId = item.hotWheelsCarId
            } else if (item.hotWheelsCarId._id) {
              inventoryItemId = String(item.hotWheelsCarId._id)
            } else {
              inventoryItemId = String(item.hotWheelsCarId)
            }
          }

          const normalizedHotWheelsCarId =
            typeof item.hotWheelsCarId === 'string'
              ? item.hotWheelsCarId
              : item.hotWheelsCarId?._id

          const seriesId = 'seriesId' in item ? item.seriesId : undefined
          const seriesName = 'seriesName' in item ? item.seriesName : undefined
          const seriesSize = 'seriesSize' in item ? item.seriesSize : undefined
          const seriesPrice = 'seriesPrice' in item ? item.seriesPrice : undefined
          const isSoldAsSeries = 'isSoldAsSeries' in item ? item.isSoldAsSeries : undefined

          return {
            inventoryItemId,
            hotWheelsCarId: normalizedHotWheelsCarId,
            carId: item.carId,
            carName: item.carName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            seriesId,
            seriesName,
            seriesSize,
            seriesPrice,
            isSoldAsSeries,
          }
        }) || [],
      scheduledDate: delivery.scheduledDate ? new Date(delivery.scheduledDate).toISOString().split('T')[0] : dateToString(new Date()),
      scheduledTime: delivery.scheduledTime || '09:00',
      location: delivery.location || '',
      totalAmount: delivery.totalAmount || 0,
      notes: delivery.notes || '',
      isThirdPartyDelivery: delivery.isThirdPartyDelivery || false,
      thirdPartyRecipient: delivery.thirdPartyRecipient || '',
      thirdPartyPhone: delivery.thirdPartyPhone || '',
    }

    setNewDelivery(formattedDelivery)
    setEditingDelivery(delivery)
    setIsEditMode(true)
    setShowCreateModal(true)
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
    if (customLocation.trim() && !deliveryLocations?.find((loc) => loc.name.toLowerCase() === customLocation.trim().toLowerCase())) {
      try {
        await createLocation(customLocation.trim())
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
      items: [
        ...newDelivery.items,
        {
          inventoryItemId: undefined,
          hotWheelsCarId: undefined,
          carId: '',
          carName: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
    })
  }

  const updateDeliveryItem = (index: number, field: string, value: unknown) => {
    const updatedItems = [...newDelivery.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value as DeliveryFormItem[keyof DeliveryFormItem] }

    if (field === 'inventoryItemId' && value) {
      const inventoryItem = inventoryItems?.find((item: InventoryItem) => item._id === value)
      if (inventoryItem) {
        if (inventoryItem.quantity === 0) {
          updatedItems[index].hotWheelsCarId = String(value)
          updatedItems[index].inventoryItemId = undefined
        } else {
          updatedItems[index].inventoryItemId = String(value)
          updatedItems[index].hotWheelsCarId = undefined
        }
        updatedItems[index].carId = inventoryItem.carId
        updatedItems[index].carName = inventoryItem.hotWheelsCar?.model || inventoryItem.carId
        updatedItems[index].unitPrice = inventoryItem.suggestedPrice

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

  const completeSeries = async (seriesId: string, seriesPrice: number, seriesSize: number) => {
    try {
      const seriesItems = inventoryItems?.filter((item: InventoryItem) => item.seriesId === seriesId) || []

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

      const pricePerPiece = seriesPrice / seriesSize

      const updatedItems = [...newDelivery.items]

      seriesItems.forEach((seriesItem: InventoryItem) => {
        const existingIndex = updatedItems.findIndex((item) => item.inventoryItemId === seriesItem._id)

        if (existingIndex >= 0) {
          updatedItems[existingIndex].unitPrice = pricePerPiece
          updatedItems[existingIndex].isSoldAsSeries = true
        } else {
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
            isSoldAsSeries: true,
          })
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

    if (itemToRemove.isSoldAsSeries && itemToRemove.seriesId) {
      const confirmRemove = window.confirm(
        `⚠️ Esta pieza es parte de "${itemToRemove.seriesName}" vendida como serie completa.\n\n` +
          `¿Deseas eliminar TODA la serie o solo esta pieza?\n\n` +
          `OK = Eliminar toda la serie\n` +
          `Cancelar = Eliminar solo esta pieza (precio se ajustará a precio individual)`,
      )

      if (confirmRemove) {
        const updatedItems = newDelivery.items.filter((item) => item.seriesId !== itemToRemove.seriesId)
        setNewDelivery({ ...newDelivery, items: updatedItems })
        return
      }

      const updatedItems = newDelivery.items
        .filter((_, i) => i !== index)
        .map((item) => {
          if (item.seriesId === itemToRemove.seriesId) {
            const inventoryItem = inventoryItems?.find((inv: InventoryItem) => inv._id === item.inventoryItemId)
            return {
              ...item,
              unitPrice: inventoryItem?.suggestedPrice || item.unitPrice,
              isSoldAsSeries: false,
            }
          }
          return item
        })
      setNewDelivery({ ...newDelivery, items: updatedItems })
      return
    }

    setNewDelivery({
      ...newDelivery,
      items: newDelivery.items.filter((_, i) => i !== index),
    })
  }

  const calculateTotal = () => {
    return newDelivery.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  }

  return {
    editingDelivery,
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
  }
}
