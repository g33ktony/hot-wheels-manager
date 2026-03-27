import { useQueryClient } from 'react-query'
import {
  useAddPayment,
  useAllDeliveries,
  useCreateDelivery,
  useDeleteDelivery,
  useDeletePayment,
  useDeliveries,
  useMarkDeliveryAsCompleted,
  useMarkDeliveryAsPrepared,
  useUpdateDelivery,
} from '@/hooks/useDeliveries'
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers'
import { useInventory } from '@/hooks/useInventory'
import { useDeliveryLocations, useCreateDeliveryLocation } from '@/hooks/useDeliveryLocations'
import { usePreSaleItems } from '@/hooks/usePresale'
import { useCreatePaymentPlan } from '@/hooks/usePaymentPlans'

interface UseDeliveriesPageDataParams {
  selectedStore?: string
  statusFilter?: string
  selectedDate: string
  showCreateModal: boolean
}

export function useDeliveriesPageData({
  selectedStore,
  statusFilter,
  selectedDate,
  showCreateModal,
}: UseDeliveriesPageDataParams) {
  const { data: deliveries, isLoading, error } = useDeliveries(statusFilter, selectedDate, selectedStore)
  const { data: allDeliveries } = useAllDeliveries(selectedDate, selectedStore)
  const { data: customers } = useCustomers(selectedStore)
  const { data: inventoryData } = useInventory({
    limit: showCreateModal ? 1000 : 10,
    selectedStore,
  })
  const { data: deliveryLocations } = useDeliveryLocations()
  const { data: preSaleItems } = usePreSaleItems({ storeId: selectedStore })

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

  return {
    deliveries,
    allDeliveries,
    customers,
    inventoryItems: inventoryData?.items || [],
    deliveryLocations,
    preSaleItems,
    isLoading,
    error,
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
  }
}
