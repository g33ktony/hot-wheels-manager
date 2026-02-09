import api from './api'

export interface Lead {
  _id: string
  name: string
  email: string
  phone?: string
  estado: string
  municipio: string
  source: string
  registeredAt: string
  interestedInItem?: {
    catalogId: string
    carModel: string
    requestType: 'availability' | 'notify'
  }
  message?: string
  viewedItems: Array<{
    catalogId: string
    carModel: string
    viewedAt: string
  }>
  metadata: {
    ipAddress?: string
    userAgent?: string
    referrer?: string
  }
  contactStatus: 'new' | 'contacted' | 'converted' | 'not_interested'
  notes?: string
  lastContactedAt?: string
  createdAt: string
  updatedAt: string
}

export interface LeadFilters {
  page?: number
  limit?: number
  search?: string
  estado?: string
  contactStatus?: string
  requestType?: string
}

export interface LeadStatistics {
  totalLeads: number
  statusBreakdown: {
    new?: number
    contacted?: number
    converted?: number
    not_interested?: number
  }
  topEstados: Array<{
    _id: string
    count: number
  }>
  withInterestedItem: number
  notifyRequests: number
  recentLeads: number
}

export const leadsApi = {
  // Get all leads with filtering
  getLeads: async (filters: LeadFilters = {}) => {
    const params = new URLSearchParams()

    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.search) params.append('search', filters.search)
    if (filters.estado) params.append('estado', filters.estado)
    if (filters.contactStatus) params.append('contactStatus', filters.contactStatus)
    if (filters.requestType) params.append('requestType', filters.requestType)

    const response = await api.get(`/leads?${params.toString()}`)
    return response.data
  },

  // Get lead statistics
  getStatistics: async () => {
    const response = await api.get<{ success: boolean; data: LeadStatistics }>('/leads/statistics')
    return response.data.data
  },

  // Get single lead
  getLead: async (id: string) => {
    const response = await api.get(`/leads/${id}`)
    return response.data.data
  },

  // Update lead
  updateLead: async (id: string, data: { contactStatus?: string; notes?: string }) => {
    const response = await api.patch(`/leads/${id}`, data)
    return response.data.data
  },

  // Delete lead
  deleteLead: async (id: string) => {
    const response = await api.delete(`/leads/${id}`)
    return response.data
  },

  // Export leads to CSV
  exportLeads: async (filters: { estado?: string; contactStatus?: string } = {}) => {
    const params = new URLSearchParams()
    if (filters.estado) params.append('estado', filters.estado)
    if (filters.contactStatus) params.append('contactStatus', filters.contactStatus)

    const response = await api.get(`/leads/export?${params.toString()}`, {
      responseType: 'blob'
    })

    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `leads-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }
}
