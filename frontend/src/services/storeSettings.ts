import api from './api'

export interface StoreSettings {
  _id?: string
  storeName: string
  logo?: string
  description?: string
  customMessages: {
    welcome?: string
    closing?: string
    invoice?: string
    delivery?: string
    custom: string[]
  }
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  contact?: {
    phone?: string
    email?: string
    address?: string
  }
  publicCatalog?: {
    showCustomInventory?: boolean
  }
  createdAt?: string
  updatedAt?: string
}

export const storeSettingsService = {
  // Obtener settings
  get: async (): Promise<StoreSettings> => {
    const response = await api.get<any>('/store-settings')
    return response.data.data || {}
  },

  // Actualizar settings
  update: async (data: Partial<StoreSettings>): Promise<StoreSettings> => {
    const response = await api.put<any>('/store-settings', data)
    return response.data.data || {}
  },

  // Actualizar logo
  updateLogo: async (logoUrl: string): Promise<StoreSettings> => {
    const response = await api.put<any>('/store-settings/logo', {
      logoUrl
    })
    return response.data.data || {}
  },

  // Agregar mensaje personalizado
  addCustomMessage: async (message: string): Promise<StoreSettings> => {
    const response = await api.post<any>('/store-settings/messages', {
      message
    })
    return response.data.data || {}
  },

  // Eliminar mensaje personalizado
  deleteCustomMessage: async (index: number): Promise<StoreSettings> => {
    const response = await api.delete<any>(`/store-settings/messages/${index}`)
    return response.data.data || {}
  }
}
