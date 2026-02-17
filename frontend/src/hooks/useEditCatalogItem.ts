import { useMutation } from 'react-query'
import api from '@/services/api'

interface EditCatalogItemData {
  carModel?: string
  photo_url?: string
  year?: string
  series?: string
  series_num?: string
  color?: string
  tampo?: string
  wheel_type?: string
  car_make?: string
  segment?: string
  country?: string
  brand?: string
}

export const useEditCatalogItem = () => {
  return useMutation(
    async ({ toyNum, data }: { toyNum: string; data: EditCatalogItemData }) => {
      const response = await api.patch(`/hotwheels/edit/${toyNum}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        console.log('✅ Catálogo actualizado exitosamente')
      },
      onError: (error: any) => {
        console.error('❌ Error actualizando catálogo:', error.message)
      }
    }
  )
}
