import { useMutation, useQuery } from 'react-query'
import api from '@/services/api'

export const useUpdateHotWheelsCatalog = () => {
  return useMutation(
    async () => {
      const response = await api.post('/hotwheels/update-catalog', {}, {
        timeout: 300000 // 5 minutos para el catálogo completo
      })
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
      staleTime: 0,
      refetchInterval: (data: any) => {
        // Si hay una actualización en curso, poll cada 2 segundos
        if (data?.progress?.isUpdating) return 2000;
        return 60000; // Si no, cada minuto
      },
      refetchOnWindowFocus: false,
    }
  );
};
