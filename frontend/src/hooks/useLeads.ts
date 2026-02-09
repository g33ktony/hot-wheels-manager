import { useQuery, useMutation, useQueryClient } from 'react-query'
import { leadsApi, LeadFilters } from '@/services/leads'
import toast from 'react-hot-toast'

// Get all leads
export const useLeads = (filters: LeadFilters = {}) => {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => leadsApi.getLeads(filters),
    staleTime: 30000 // 30 seconds
  })
}

// Get lead statistics
export const useLeadStatistics = () => {
  return useQuery({
    queryKey: ['leadStatistics'],
    queryFn: () => leadsApi.getStatistics(),
    staleTime: 60000 // 1 minute
  })
}

// Get single lead
export const useLead = (id: string) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.getLead(id),
    enabled: !!id
  })
}

// Update lead
export const useUpdateLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { contactStatus?: string; notes?: string } }) =>
      leadsApi.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leadStatistics'] })
      toast.success('Lead actualizado correctamente')
    },
    onError: (error: any) => {
      console.error('Error updating lead:', error)
      toast.error(error.response?.data?.message || 'Error al actualizar lead')
    }
  })
}

// Delete lead
export const useDeleteLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => leadsApi.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leadStatistics'] })
      toast.success('Lead eliminado correctamente')
    },
    onError: (error: any) => {
      console.error('Error deleting lead:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar lead')
    }
  })
}
