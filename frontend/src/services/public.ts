import axios from 'axios'

// Create a separate Axios instance for public API calls (no auth token)
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export interface CatalogSearchFilters {
  q?: string
  year?: string
  series?: string
  page?: number
  limit?: number
}

export interface CatalogItem {
  _id: string
  toy_num: string
  col_num: string
  carModel: string
  series: string
  series_num: string
  photo_url?: string
  year: string
  color?: string
  tampo?: string
  wheel_type?: string
  car_make?: string
  segment?: string
  availability: {
    available: boolean
    price?: number
    quantity?: number
    ebayPrice?: number
  }
  pack_contents?: Array<{
    casting_name: string
    body_color?: string
    tampo?: string
    wheel_type?: string
    notes?: string
    photo_url?: string
  }>
}

export interface LeadData {
  name: string
  email: string
  phone?: string
  estado: string
  municipio: string
  interestedInItem?: {
    catalogId: string
    carModel: string
    requestType: 'availability' | 'notify'
  }
  message?: string
  recaptchaToken: string
}

export const publicService = {
  /**
   * Search Hot Wheels catalog with inventory availability
   */
  searchCatalog: async (filters: CatalogSearchFilters) => {
    const response = await publicApi.get('/public/catalog/search', {
      params: filters
    })
    return response.data
  },

  /**
   * Get single catalog item with availability
   */
  getCatalogItem: async (id: string) => {
    const response = await publicApi.get(`/public/catalog/${id}`)
    return response.data
  },

  /**
   * Submit lead with reCAPTCHA verification
   */
  submitLead: async (leadData: LeadData) => {
    const response = await publicApi.post('/public/leads', leadData)
    return response.data
  },

  /**
   * Track item view for analytics (optional)
   */
  trackItemView: async (email: string, catalogId: string, carModel: string) => {
    const response = await publicApi.post(
      `/public/track-view?email=${encodeURIComponent(email)}`,
      { catalogId, carModel }
    )
    return response.data
  }
}
