import { useQuery } from 'react-query'
import api from '@/services/api'

interface PendingUsersData {
  users: any[]
  stats: {
    totalPending: number
    byStore: Record<string, number>
  }
}

/**
 * Fetch pending users waiting for approval (sys_admin only)
 */
export const usePendingUsers = () => {
  return useQuery({
    queryKey: ['pendingUsers'],
    queryFn: async () => {
      const { data } = await api.get('/users/pending')
      return data.data as PendingUsersData
    },
    staleTime: 60000, // 1 minute
    onError: (error: any) => {
      // Only log errors, don't throw since this is optional data
      console.warn('Failed to fetch pending users:', error)
    }
  })
}

/**
 * Get total count of pending users
 */
export const usePendingUsersCount = () => {
  const { data } = usePendingUsers()
  return data?.stats?.totalPending || 0
}
