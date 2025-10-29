import { useQuery, useMutation, useQueryClient } from 'react-query'
import { presaleService } from '@/services/presale'

export const usePaymentPlans = () => {
  return useQuery(
    ['paymentPlans'],
    async () => {
      try {
        const overduePayments = await presaleService.payments.getOverdue()
        return overduePayments || []
      } catch (error) {
        console.error('Error fetching payment plans:', error)
        return []
      }
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

export const usePaymentPlanById = (id: string) => {
  return useQuery(
    ['paymentPlan', id],
    async () => {
      if (!id) return null
      const plan = await presaleService.payments.getById(id)
      return plan
    },
    {
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

export const usePaymentSchedule = (paymentPlanId: string) => {
  return useQuery(
    ['paymentSchedule', paymentPlanId],
    async () => {
      if (!paymentPlanId) return []
      const schedule = await presaleService.payments.getSchedule(paymentPlanId)
      return schedule || []
    },
    {
      enabled: !!paymentPlanId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

export const usePaymentAnalytics = (paymentPlanId: string) => {
  return useQuery(
    ['paymentAnalytics', paymentPlanId],
    async () => {
      if (!paymentPlanId) return null
      const analytics = await presaleService.payments.getAnalytics(paymentPlanId)
      return analytics
    },
    {
      enabled: !!paymentPlanId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

export const useRecordPayment = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (data: { paymentPlanId: string; amount: number; paymentDate: Date; notes?: string }) => {
      const response = await presaleService.payments.recordPayment(
        data.paymentPlanId,
        data.amount,
        data.paymentDate,
        data.notes
      )
      return response
    },
    {
      onSuccess: (_data, variables) => {
        // Invalidate related queries
        queryClient.invalidateQueries(['paymentPlans'])
        queryClient.invalidateQueries(['paymentPlan', variables.paymentPlanId])
        queryClient.invalidateQueries(['paymentSchedule', variables.paymentPlanId])
        queryClient.invalidateQueries(['paymentAnalytics', variables.paymentPlanId])
      },
    }
  )
}

export const useOverduePayments = () => {
  return useQuery(
    ['overduePayments'],
    async () => {
      try {
        const overduePayments = await presaleService.payments.getOverdue()
        return overduePayments || []
      } catch (error) {
        console.error('Error fetching overdue payments:', error)
        return []
      }
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    }
  )
}

export const useCheckOverdue = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (paymentPlanId: string) => {
      const response = await presaleService.payments.checkOverdue(paymentPlanId)
      return response
    },
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries(['paymentPlans'])
        queryClient.invalidateQueries(['paymentPlan', variables])
        queryClient.invalidateQueries(['overduePayments'])
      },
    }
  )
}
