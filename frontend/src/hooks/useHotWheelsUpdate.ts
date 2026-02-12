import { useMutation, useQuery } from 'react-query'
import api from '@/services/api'

export const useUpdateHotWheelsCatalog = () => {
  return useMutation(
    async () => {
      const response = await api.post('/hotwheels/update-catalog', {})
      return response.data
    },
    {
      onSuccess: () => {
        console.log('✅ Catálogo de autos a escala actualizado exitosamente');
      },
      onError: (error: any) => {
        console.error('❌ Error actualizando catálogo:', error.message);
      }
    }
  );
};

export const useGetUpdateStatus = () => {
  return useQuery(
    'hotwheels-update-status',
    async () => {
      const response = await api.get('/hotwheels/update-status')
      return response.data
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    }
  );
};
