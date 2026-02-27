import api from './api'
import type { DashboardMetrics, ApiResponse } from '@shared/types'

export const dashboardService = {
  // Obtener métricas del dashboard
  getMetrics: async (selectedStore?: string): Promise<DashboardMetrics> => {
    const params = selectedStore ? `?storeId=${selectedStore}` : ''
    const fullUrl = `/dashboard/metrics${params}`
    console.log('📊 [dashboardService.getMetrics] Fetching:', fullUrl, 'selectedStore:', selectedStore)
    const response = await api.get<ApiResponse<DashboardMetrics>>(fullUrl)
    console.log('📊 [dashboardService.getMetrics] Response received, data keys:', Object.keys(response.data.data || {}))
    if (!response.data.data) {
      throw new Error('Failed to fetch dashboard metrics')
    }
    return response.data.data
  },

  // Obtener actividad reciente
  getRecentActivity: async (limit: number = 10, selectedStore?: string) => {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (selectedStore) params.append('storeId', selectedStore)
    const response = await api.get<ApiResponse<DashboardMetrics['recentActivity']>>(
      `/dashboard/activity?${params}`
    )
    return response.data.data || []
  },

  // Obtener estadísticas de ventas por período
  getSalesStats: async (period: 'week' | 'month' | 'year' = 'month') => {
    const response = await api.get<ApiResponse<{
      labels: string[]
      sales: number[]
      revenue: number[]
      profit: number[]
    }>>(`/dashboard/sales-stats?period=${period}`)
    return response.data.data
  },

  // Obtener top productos más vendidos
  getTopSellingProducts: async (limit: number = 5) => {
    const response = await api.get<ApiResponse<{
      carId: string
      carName: string
      series: string
      totalSold: number
      totalRevenue: number
    }[]>>(`/dashboard/top-products?limit=${limit}`)
    return response.data.data || []
  },

  // Obtener productos con stock bajo
  getLowStockProducts: async (threshold: number = 5) => {
    const response = await api.get<ApiResponse<{
      carId: string
      carName: string
      currentStock: number
      suggestedPrice: number
    }[]>>(`/dashboard/low-stock?threshold=${threshold}`)
    return response.data.data || []
  },

  // Obtener entregas próximas
  getUpcomingDeliveries: async (days: number = 7) => {
    const response = await api.get<ApiResponse<{
      deliveryId: string
      buyerName: string
      scheduledDate: Date
      itemCount: number
      totalValue: number
    }[]>>(`/dashboard/upcoming-deliveries?days=${days}`)
    return response.data.data || []
  },

  // Obtener compras pendientes
  getPendingPurchases: async () => {
    const response = await api.get<ApiResponse<{
      purchaseId: string
      supplier: string
      totalCost: number
      estimatedDelivery?: Date
      status: string
    }[]>>('/dashboard/pending-purchases')
    return response.data.data || []
  },

  // Obtener entregas completadas pero sin pagar
  getUnpaidDeliveries: async (selectedStore?: string) => {
    const params = selectedStore ? `?storeId=${selectedStore}` : ''
    const response = await api.get<ApiResponse<any[]>>(`/deliveries?status=completed&paymentStatus=unpaid,partial${params ? '&' + params.substring(1) : ''}`)
    return response.data.data || []
  }
}
