import api from './api'
import type { 
  Delivery, 
  CreateDeliveryDto,
  ApiResponse 
} from '@shared/types'

export const deliveriesService = {
  // Obtener todas las entregas
  getAll: async (status?: string): Promise<Delivery[]> => {
    const params = status ? { status } : {};
    const response = await api.get<ApiResponse<Delivery[]>>('/deliveries', { params })
    return response.data.data || []
  },

  // Obtener estadísticas de entregas
  getStats: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/deliveries/stats')
    return response.data.data || {}
  },

  // Obtener entrega por ID
  getById: async (id: string): Promise<Delivery> => {
    const response = await api.get<ApiResponse<Delivery>>(`/deliveries/${id}`)
    if (!response.data.data) {
      throw new Error('Delivery not found')
    }
    return response.data.data
  },

  // Crear nueva entrega
  create: async (data: CreateDeliveryDto): Promise<Delivery> => {
    const response = await api.post<ApiResponse<Delivery>>('/deliveries', data)
    if (!response.data.data) {
      throw new Error('Failed to create delivery')
    }
    return response.data.data
  },

  // Actualizar entrega
  update: async (id: string, data: Partial<CreateDeliveryDto>): Promise<Delivery> => {
    const response = await api.put<ApiResponse<Delivery>>(`/deliveries/${id}`, data)
    if (!response.data.data) {
      throw new Error('Failed to update delivery')
    }
    return response.data.data
  },

  // Eliminar entrega
  delete: async (id: string): Promise<void> => {
    await api.delete(`/deliveries/${id}`)
  },

  // Marcar entrega como completada
  markAsCompleted: async (id: string): Promise<Delivery> => {
    const response = await api.patch<ApiResponse<Delivery>>(`/deliveries/${id}/completed`)
    if (!response.data.data) {
      throw new Error('Failed to mark delivery as completed')
    }
    return response.data.data
  },

  // Marcar entrega como preparada
  markAsPrepared: async (id: string): Promise<Delivery> => {
    const response = await api.patch<ApiResponse<Delivery>>(`/deliveries/${id}/prepared`)
    if (!response.data.data) {
      throw new Error('Failed to mark delivery as prepared')
    }
    return response.data.data
  },

  // Marcar entrega como pendiente
  markAsPending: async (id: string): Promise<Delivery> => {
    const response = await api.patch<ApiResponse<Delivery>>(`/deliveries/${id}/pending`)
    if (!response.data.data) {
      throw new Error('Failed to mark delivery as pending')
    }
    return response.data.data
  },

  // Reprogramar entrega
  reschedule: async (id: string, newDate: Date, notes?: string): Promise<Delivery> => {
    const response = await api.patch<ApiResponse<Delivery>>(`/deliveries/${id}/reschedule`, {
      scheduledDate: newDate,
      notes
    })
    if (!response.data.data) {
      throw new Error('Failed to reschedule delivery')
    }
    return response.data.data
  },

  // Obtener entregas por fecha
  getByDate: async (date: string): Promise<Delivery[]> => {
    const response = await api.get<ApiResponse<Delivery[]>>(`/deliveries/date/${date}`)
    return response.data.data || []
  },

  // Obtener entregas por rango de fechas
  getByDateRange: async (startDate: string, endDate: string): Promise<Delivery[]> => {
    const response = await api.get<ApiResponse<Delivery[]>>(`/deliveries/range?start=${startDate}&end=${endDate}`)
    return response.data.data || []
  },

  // Obtener entregas pendientes
  getPending: async (): Promise<Delivery[]> => {
    const response = await api.get<ApiResponse<Delivery[]>>('/deliveries/pending')
    return response.data.data || []
  },

  // Obtener entregas del día
  getToday: async (): Promise<Delivery[]> => {
    const today = new Date().toISOString().split('T')[0]
    const response = await api.get<ApiResponse<Delivery[]>>(`/deliveries/date/${today}`)
    return response.data.data || []
  },

  // Obtener próximas entregas
  getUpcoming: async (days: number = 7): Promise<Delivery[]> => {
    const response = await api.get<ApiResponse<Delivery[]>>(`/deliveries/upcoming?days=${days}`)
    return response.data.data || []
  },

  // Buscar entregas
  search: async (term: string): Promise<Delivery[]> => {
    const response = await api.get<ApiResponse<Delivery[]>>(`/deliveries/search?q=${encodeURIComponent(term)}`)
    return response.data.data || []
  },

  // Agregar pago a una entrega
  addPayment: async (
    deliveryId: string, 
    amount: number, 
    paymentMethod?: string, 
    notes?: string
  ): Promise<Delivery> => {
    const response = await api.post<ApiResponse<Delivery>>(
      `/deliveries/${deliveryId}/payments`, 
      { amount, paymentMethod, notes }
    )
    if (!response.data.data) {
      throw new Error('Failed to add payment')
    }
    return response.data.data
  },

  // Eliminar pago de una entrega
  deletePayment: async (deliveryId: string, paymentId: string): Promise<Delivery> => {
    const response = await api.delete<ApiResponse<Delivery>>(
      `/deliveries/${deliveryId}/payments/${paymentId}`
    )
    if (!response.data.data) {
      throw new Error('Failed to delete payment')
    }
    return response.data.data
  },

  // Obtener historial de pagos de una entrega
  getPaymentHistory: async (deliveryId: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(
      `/deliveries/${deliveryId}/payments`
    )
    return response.data.data
  }
}
