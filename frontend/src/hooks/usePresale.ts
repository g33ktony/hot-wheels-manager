import { useQuery, useMutation, useQueryClient } from 'react-query'
import { presaleService, CreatePreSaleItemDto } from '@/services/presale'
import toast from 'react-hot-toast'

/**
 * Pre-Sale Items Hooks
 */

export const usePreSaleItems = (filters?: { status?: string; carId?: string; onlyActive?: boolean }) => {
  return useQuery(
    ['presaleItems', filters],
    () => presaleService.items.getAll(filters),
    {
      staleTime: 2 * 60 * 1000,
    }
  )
}

export const usePreSaleItem = (id: string) => {
  return useQuery(
    ['presaleItem', id],
    () => presaleService.items.getById(id),
    {
      enabled: !!id,
    }
  )
}

export const usePreSaleItemByCarId = (carId: string) => {
  return useQuery(
    ['presaleItemByCarId', carId],
    () => presaleService.items.getByCarId(carId),
    {
      enabled: !!carId,
    }
  )
}

export const useCreatePreSaleItem = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (data: CreatePreSaleItemDto) => presaleService.items.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('presaleItems')
        queryClient.invalidateQueries('presaleActiveSummary')
        toast.success('Pre-sale registrada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al registrar pre-sale')
      },
    }
  )
}

export const useUpdatePreSaleMarkup = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, markupPercentage }: { id: string; markupPercentage: number }) =>
      presaleService.items.updateMarkup(id, markupPercentage),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('presaleItems')
        queryClient.invalidateQueries(['presaleItem', variables.id])
        toast.success('Markup actualizado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar markup')
      },
    }
  )
}

export const useUpdatePreSaleFinalPrice = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, finalPrice }: { id: string; finalPrice: number }) =>
      presaleService.items.updateFinalPrice(id, finalPrice),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('presaleItems')
        queryClient.invalidateQueries(['presaleItem', variables.id])
        toast.success('Precio final actualizado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar precio final')
      },
    }
  )
}

export const useUpdatePreSaleStatus = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, status }: { id: string; status: 'active' | 'completed' | 'cancelled' | 'paused' }) =>
      presaleService.items.updateStatus(id, status),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('presaleItems')
        queryClient.invalidateQueries(['presaleItem', variables.id])
        toast.success('Estado actualizado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar estado')
      },
    }
  )
}

export const useAssignPreSaleUnits = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, deliveryId, quantity, purchaseId }: { id: string; deliveryId: string; quantity: number; purchaseId: string }) =>
      presaleService.items.assignUnits(id, deliveryId, quantity, purchaseId),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['presaleItem', variables.id])
        queryClient.invalidateQueries('presaleItems')
        toast.success(`${variables.quantity} unidades asignadas exitosamente`)
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al asignar unidades')
      },
    }
  )
}

export const useUnassignPreSaleUnits = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, unitIds }: { id: string; unitIds: string[] }) =>
      presaleService.items.unassignUnits(id, unitIds),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['presaleItem', variables.id])
        queryClient.invalidateQueries('presaleItems')
        toast.success(`${variables.unitIds.length} unidades desasignadas exitosamente`)
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al desasignar unidades')
      },
    }
  )
}

export const usePreSaleActiveSummary = () => {
  return useQuery(
    'presaleActiveSummary',
    () => presaleService.items.getActiveSummary(),
    {
      staleTime: 5 * 60 * 1000,
    }
  )
}

export const useCancelPreSaleItem = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => presaleService.items.cancel(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('presaleItems')
        queryClient.invalidateQueries('presaleActiveSummary')
        toast.success('Pre-sale cancelada exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al cancelar pre-sale')
      },
    }
  )
}

/**
 * Pre-Sale Payments Hooks
 */

export const usePreSalePayment = (id: string) => {
  return useQuery(
    ['presalePayment', id],
    () => presaleService.payments.getById(id),
    {
      enabled: !!id,
    }
  )
}

export const usePreSalePaymentByDelivery = (deliveryId: string) => {
  return useQuery(
    ['presalePaymentByDelivery', deliveryId],
    () => presaleService.payments.getByDelivery(deliveryId),
    {
      enabled: !!deliveryId,
    }
  )
}

export const useCreatePreSalePayment = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (data: {
      deliveryId: string
      totalAmount: number
      numberOfPayments: number
      paymentFrequency?: 'weekly' | 'biweekly' | 'monthly'
      startDate?: Date
      customerId?: string
      preIntegrationCustomer?: string
      earlyPaymentBonus?: number
    }) => presaleService.payments.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('presalePayments')
        toast.success('Plan de pago creado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al crear plan de pago')
      },
    }
  )
}

export const useRecordPreSalePayment = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({
      id,
      amount,
      paymentDate,
      notes
    }: {
      id: string
      amount: number
      paymentDate?: Date
      notes?: string
    }) => presaleService.payments.recordPayment(id, amount, paymentDate, notes),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['presalePayment', variables.id])
        queryClient.invalidateQueries('presalePayments')
        toast.success('Pago registrado exitosamente')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al registrar pago')
      },
    }
  )
}

export const usePreSalePaymentAnalytics = (id: string) => {
  return useQuery(
    ['presalePaymentAnalytics', id],
    () => presaleService.payments.getAnalytics(id),
    {
      enabled: !!id,
    }
  )
}

export const useCheckPreSaleOverdue = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => presaleService.payments.checkOverdue(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('presalePayments')
        toast.success('Pagos vencidos verificados')
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al verificar pagos vencidos')
      },
    }
  )
}

export const useOverduePreSalePayments = () => {
  return useQuery(
    'presaleOverduePayments',
    () => presaleService.payments.getOverdue(),
    {
      staleTime: 5 * 60 * 1000,
    }
  )
}
