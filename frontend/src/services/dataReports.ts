import api from './api'

export interface DataReport {
  _id: string
  catalogItemId: string
  carModel: string
  series: string
  year: string
  reportType: 'error_info' | 'missing_photo' | 'wrong_photo' | 'other'
  note: string
  status: 'pending' | 'reviewed' | 'resolved'
  adminNotes?: string
  reviewedAt?: string
  metadata: {
    ipAddress?: string
    userAgent?: string
  }
  createdAt: string
  updatedAt: string
}

export interface DataReportsResponse {
  reports: DataReport[]
  total: number
  page: number
  totalPages: number
  summary: {
    pending: number
    reviewed: number
    resolved: number
  }
}

export interface DataReportFilters {
  status?: string
  reportType?: string
  page?: number
  limit?: number
}

export const dataReportsApi = {
  getAll: async (filters: DataReportFilters = {}): Promise<DataReportsResponse> => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.reportType) params.append('reportType', filters.reportType)
    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))

    const response = await api.get(`/data-reports?${params.toString()}`)
    return response.data
  },

  update: async (id: string, data: { status?: string; adminNotes?: string }): Promise<DataReport> => {
    const response = await api.put(`/data-reports/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/data-reports/${id}`)
  }
}
