import { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

interface Store {
    _id: string
    storeId: string
    storeName: string
    location?: string
}

interface StoreContextType {
    // The store user belongs to (for writing)
    userStore: string | null
    // The store user is currently viewing (for reading)
    selectedStore: string | null
    // All available stores for sys_admin
    availableStores: Store[]
    // Set the store to view
    setSelectedStore: (storeId: string) => void
    // Loading state
    loading: boolean
    error: string | null
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [userStore, setUserStore] = useState<string | null>(null)
    const [selectedStore, setSelectedStore] = useState<string | null>(null)
    const [availableStores, setAvailableStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Initialize user's own store
    useEffect(() => {
        if (!user) {
            setUserStore(null)
            setSelectedStore(null)
            setAvailableStores([])
            return
        }

        // User's own store is always their storeId
        setUserStore(user.storeId || null)

        // If not sys_admin, viewing store = own store
        if (user.role !== 'sys_admin') {
            setSelectedStore(user.storeId || null)
            setAvailableStores(user.storeId ? [{
                _id: '',
                storeId: user.storeId,
                storeName: 'Mi Tienda'
            }] : [])
            return
        }

        // For sys_admin, default to their own store
        if (!selectedStore) {
            setSelectedStore(user.storeId || null)
        }
    }, [user, selectedStore])

    // Fetch all stores for sys_admin
    useEffect(() => {
        if (!user || user.role !== 'sys_admin') {
            return
        }

        const fetchStores = async () => {
            try {
                setLoading(true)
                setError(null)

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

                setAvailableStores(storeList)
            } catch (err) {
                console.error('Error fetching stores:', err)
                setError(err instanceof Error ? err.message : 'Unknown error')

                // Fallback: add user's own store
                if (user.storeId) {
                    setAvailableStores([{
                        _id: '',
                        storeId: user.storeId,
                        storeName: 'Mi Tienda'
                    }])
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
        <StoreContext.Provider value={{
            userStore,
            selectedStore,
            availableStores,
            setSelectedStore,
            loading,
            error
        }}>
            {children}
        </StoreContext.Provider>
    )
}

export function useStore() {
    const context = useContext(StoreContext)
    if (context === undefined) {
        throw new Error('useStore must be used within StoreProvider')
    }
    return context
}
