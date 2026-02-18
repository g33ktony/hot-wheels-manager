import { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

interface Store {
    _id: string
    storeId: string
    storeName: string
    location?: string
}

interface StoreContextType {
    selectedStore: string | null
    stores: Store[]
    setSelectedStore: (storeId: string) => void
    loading: boolean
    error: string | null
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [selectedStore, setSelectedStore] = useState<string | null>(null)
    const [stores, setStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch available stores for sys_admin
    useEffect(() => {
        if (!user) {
            setStores([])
            setSelectedStore(null)
            return
        }

        // If not sys_admin, just use their own store
        if (user.role !== 'sys_admin') {
            if (user.storeId) {
                setSelectedStore(user.storeId)
                setStores([{
                    _id: '',
                    storeId: user.storeId,
                    storeName: 'Mi Tienda'
                }])
            }
            return
        }

        // For sys_admin, fetch all stores
        const fetchStores = async () => {
            try {
                setLoading(true)
                setError(null)

                // Get all stores from the database by fetching store settings
                const response = await fetch('/api/store-settings/all', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })

                if (!response.ok) {
                    throw new Error('Failed to fetch stores')
                }

                const data = await response.json()
                const storeList = data.map((store: any) => ({
                    _id: store._id || '',
                    storeId: store.storeId,
                    storeName: store.storeName || `Store ${store.storeId}`
                }))

                setStores(storeList)

                // Set initial selected store to user's own store
                if (user.storeId && !selectedStore) {
                    setSelectedStore(user.storeId)
                } else if (storeList.length > 0 && !selectedStore) {
                    setSelectedStore(storeList[0].storeId)
                }
            } catch (err) {
                console.error('Error fetching stores:', err)
                setError(err instanceof Error ? err.message : 'Unknown error')

                // Fallback: add user's own store
                if (user.storeId) {
                    setStores([{
                        _id: '',
                        storeId: user.storeId,
                        storeName: 'Mi Tienda'
                    }])
                    setSelectedStore(user.storeId)
                }
            } finally {
                setLoading(false)
            }
        }

        fetchStores()
    }, [user])

    // Persist selected store in localStorage
    useEffect(() => {
        if (selectedStore) {
            localStorage.setItem('selectedStore', selectedStore)
        }
    }, [selectedStore])

    return (
        <StoreContext.Provider value={{ selectedStore, stores, setSelectedStore, loading, error }}>
            {children}
        </StoreContext.Provider>
    )
}

export function useStore() {
    const context = useContext(StoreContext)
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider')
    }
    return context
}
