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
import { useMemo } from 'react'
import type { Customer, Delivery, DeliveryLocation, InventoryItem } from '@shared/types'
import type { PreSaleItem } from '@/services/presale'

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

  const deliveriesData = useMemo<Delivery[]>(() => deliveries || [], [deliveries])
  const allDeliveriesData = useMemo<Delivery[]>(() => allDeliveries || [], [allDeliveries])
  const customersData = useMemo<Customer[]>(() => customers || [], [customers])
  const inventoryItems = useMemo<InventoryItem[]>(() => inventoryData?.items || [], [inventoryData?.items])
  const deliveryLocationsData = useMemo<DeliveryLocation[]>(() => deliveryLocations || [], [deliveryLocations])
  const preSaleItemsData = useMemo<PreSaleItem[]>(() => preSaleItems || [], [preSaleItems])
  const errorMessage = error instanceof Error ? error.message : null

  return {
    deliveries: deliveriesData,
    allDeliveries: allDeliveriesData,
    customers: customersData,
    inventoryItems,
    deliveryLocations: deliveryLocationsData,
    preSaleItems: preSaleItemsData,
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
  }
}
