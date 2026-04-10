import { useQuery, useMutation, useQueryClient } from 'react-query'
import { storeSettingsService, StoreSettings } from '@/services/storeSettings'

export function useStoreSettings() {
    return useQuery<StoreSettings>(
        'storeSettings',
        () => storeSettingsService.get(),
        {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000,
        }
    )
}

export function useUpdateStoreSettings() {
    const queryClient = useQueryClient()
    return useMutation(
        (data: Partial<StoreSettings>) => storeSettingsService.update(data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('storeSettings')
            }
        }
    )
}
