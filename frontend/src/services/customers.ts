import api from './api'
import type {
  Customer,
  CreateCustomerDto,
  ApiResponse
} from '@shared/types'

export const customersService = {
  // Obtener todos los clientes
  getAll: async (storeId?: string): Promise<Customer[]> => {
    const params: any = {}
    if (storeId) params.storeId = storeId
    const response = await api.get<ApiResponse<Customer[]>>('/customers', { params })
    return response.data.data || []
  },

  // Obtener cliente por ID
  getById: async (id: string): Promise<Customer> => {
    const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`)
    if (!response.data.data) {
      throw new Error('Customer not found')
    }
    return response.data.data
  },

  // Crear nuevo cliente
  create: async (data: CreateCustomerDto): Promise<Customer> => {
    const response = await api.post<ApiResponse<Customer>>('/customers', data)
    if (!response.data.data) {
      throw new Error('Failed to create customer')
    }
    return response.data.data
  },

  // Actualizar cliente
  update: async (id: string, data: Partial<CreateCustomerDto>): Promise<Customer> => {
    const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, data)
    if (!response.data.data) {
      throw new Error('Failed to update customer')
    }
    return response.data.data
  },

  // Eliminar cliente
  delete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`)
  }
}
