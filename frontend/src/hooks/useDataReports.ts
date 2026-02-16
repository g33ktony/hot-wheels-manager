import { useQuery } from 'react-query'
import { dataReportsApi } from '@/services/dataReports'

/**
 * Hook to get pending data reports count for sidebar badge
 */
export const useDataReportsSummary = () => {
  return useQuery({
    queryKey: ['data-reports-summary'],
    queryFn: () => dataReportsApi.getAll({ page: 1, limit: 1 }),
    staleTime: 60000, // 1 minute
    select: (data) => data.summary
  })
}
