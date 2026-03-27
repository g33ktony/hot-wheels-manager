import { useMemo } from 'react'

interface DeliveryLike {
  customer?: {
    name?: string
    email?: string
  }
  location?: string
  scheduledDate: string | Date
  status?: string
}

interface UseDeliveriesPageComputedParams<T extends DeliveryLike> {
  deliveries?: T[]
  allDeliveries?: T[]
  searchTerm: string
  selectedDate: string
}

export function useDeliveriesPageComputed<T extends DeliveryLike>({
  deliveries,
  allDeliveries,
  searchTerm,
  selectedDate,
}: UseDeliveriesPageComputedParams<T>) {
  const deliveriesData = deliveries || []
  const allDeliveriesData = allDeliveries || []

  const filteredDeliveries = useMemo(() => {
    return deliveriesData.filter((delivery) => {
      const customerName = delivery.customer?.name || ''
      const customerEmail = delivery.customer?.email || ''
      const location = delivery.location || ''
      const normalizedSearch = searchTerm.toLowerCase()

      return (
        !searchTerm ||
        customerName.toLowerCase().includes(normalizedSearch) ||
        customerEmail.toLowerCase().includes(normalizedSearch) ||
        location.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [deliveriesData, searchTerm])

  const allDeliveriesFiltered = useMemo(() => {
    return allDeliveriesData.filter((delivery) => {
      const deliveryDate = delivery.scheduledDate.toString().split('T')[0]
      return !selectedDate || deliveryDate >= selectedDate
    })
  }, [allDeliveriesData, selectedDate])

  const scheduledCount = allDeliveriesFiltered.filter((delivery) => delivery.status === 'scheduled').length
  const preparedCount = allDeliveriesFiltered.filter((delivery) => delivery.status === 'prepared').length
  const completedCount = allDeliveriesFiltered.filter((delivery) => delivery.status === 'completed').length

  return {
    filteredDeliveries,
    totalDeliveries: scheduledCount + preparedCount,
    pendingDeliveries: scheduledCount + preparedCount,
    preparedDeliveries: preparedCount,
    completedDeliveries: completedCount,
  }
}
