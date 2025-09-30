import api from './api'
import type {
  Supplier,
  CreateSupplierDto,
  ApiResponse
} from '@shared/types'

export const suppliersService = {
  // Obtener todos los proveedores
  getAll: async (): Promise<Supplier[]> => {
    const response = await api.get<ApiResponse<Supplier[]>>('/suppliers')
    return response.data.data || []
  },

  // Obtener proveedor por ID
  getById: async (id: string): Promise<Supplier> => {
    const response = await api.get<ApiResponse<Supplier>>(`/suppliers/${id}`)
    if (!response.data.data) {
      throw new Error('Supplier not found')
    }
    return response.data.data
  },

  // Crear nuevo proveedor
  create: async (data: CreateSupplierDto): Promise<Supplier> => {
    const response = await api.post<ApiResponse<Supplier>>('/suppliers', data)
    if (!response.data.data) {
      throw new Error('Failed to create supplier')
    }
    return response.data.data
  },

  // Actualizar proveedor
  update: async (id: string, data: Partial<CreateSupplierDto>): Promise<Supplier> => {
    const response = await api.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data)
    if (!response.data.data) {
      throw new Error('Failed to update supplier')
    }
    return response.data.data
  },

  // Eliminar proveedor
  delete: async (id: string): Promise<void> => {
    await api.delete(`/suppliers/${id}`)
  }
}
