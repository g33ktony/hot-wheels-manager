import { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const sanitizeToken = (rawToken: string | null) => {
    if (!rawToken) return ''

    let normalized = rawToken
        .trim()
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .replace(/^['\"]+|['\"]+$/g, '')

    if (/^bearer\s+/i.test(normalized)) {
        normalized = normalized.replace(/^bearer\s+/i, '').trim()
    }

    normalized = normalized.replace(/^['\"]+|['\"]+$/g, '')

    const jwtMatch = normalized.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
    if (jwtMatch) {
        return jwtMatch[0]
    }

    return normalized.replace(/\s+/g, '')
}

interface Store {
    _id: string
    storeId: string
    storeName: string
    location?: string
}

interface StoreContextType {
    // The store user belongs to (for writing)
    userStore: string | null
    // The store user is currently viewing (for reading) - defaults to userStore
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
    const { user, token } = useAuth()
    const safeToken = sanitizeToken(token)
    const [userStore, setUserStore] = useState<string | null>(null)
    const [selectedStore, setSelectedStoreState] = useState<string | null>(null)
    const [availableStores, setAvailableStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Wrapper para setSelectedStore con logging
    const setSelectedStore = (storeId: string | null) => {
        console.log('🏪 [StoreContext] setSelectedStore called with:', storeId)
        setSelectedStoreState(storeId)
        if (storeId) {
            localStorage.setItem('selectedStore', storeId)
        } else {
            localStorage.removeItem('selectedStore')
        }
    }

    // Initialize from localStorage on first render
    useEffect(() => {
        const saved = localStorage.getItem('selectedStore')
        if (saved) {
            console.log('🏪 [StoreContext] Restored selectedStore from localStorage:', saved)
            setSelectedStoreState(saved)
        }
    }, [])

    // When user changes, set defaults
    useEffect(() => {
        if (!user) {
            console.log('👤 [StoreContext] No user, resetting')
            setUserStore(null)
            setSelectedStoreState(null)
            setAvailableStores([])
            return
        }

        // Set user's own store
        console.log('👤 [StoreContext] Setting userStore to:', user.storeId)
        setUserStore(user.storeId || null)

        // If not sys_admin, can only view own store
        if (user.role !== 'sys_admin') {
            console.log('👤 [StoreContext] Non-admin, using own store:', user.storeId)
            const normalizedStoreId = user.storeId || null
            setSelectedStoreState(normalizedStoreId)
            if (normalizedStoreId) localStorage.setItem('selectedStore', normalizedStoreId)
            setAvailableStores(normalizedStoreId ? [{
                _id: normalizedStoreId,
                storeId: normalizedStoreId,
                storeName: 'Mi Tienda'
            }] : [])
            return
        }
    }, [user])

    // Fetch all stores for sys_admin
    useEffect(() => {
        if (!user || user.role !== 'sys_admin' || !safeToken) {
            return
        }

        const fetchStores = async () => {
            try {
                setLoading(true)
                setError(null)

                const headers: Record<string, string> = {}
                if (safeToken) {
                    try {
                        const authValue = `Bearer ${safeToken}`
                        new Headers({ Authorization: authValue })
                        headers.Authorization = authValue
                    } catch (error) {
                        console.warn('Invalid auth token format detected in StoreContext headers', error)
                    }
                }

                const response = await fetch('/api/stores', {
                    headers
                })

                if (!response.ok) {
                    throw new Error('Failed to fetch stores')
                }

                const data = await response.json()
                const storeList = data.data
                    .filter((store: any) => !store.isArchived) // Only active stores
                    .map((store: any) => ({
                        _id: store._id || '',
                        storeId: store._id,
                        storeName: store.name || `Store ${store._id}`
                    }))

                console.log('🏪 [StoreContext] Fetched', storeList.length, 'stores for sys_admin')
                setAvailableStores(storeList)

                // Update userStore to use storeId if it matches a store by name
                // This fixes issues where userStore might be in a different format
                let normalizedUserStore = userStore
                if (userStore && !storeList.find((s: Store) => s.storeId === userStore)) {
                    // If userStore doesn't match any storeId directly, try to find by name match
                    const matchingStore = storeList.find((s: Store) => s.storeName.toLowerCase().includes(userStore.toLowerCase()))
                    if (matchingStore) {
                        console.log('🏪 [StoreContext] Updated userStore to match store ID:', matchingStore.storeId)
                        normalizedUserStore = matchingStore.storeId
                        setUserStore(matchingStore.storeId)
                    }
                }

                // Auto-assign selectedStore: default to user's own store (not first store in list)
                setSelectedStoreState(prev => {
                    // Only default to user's own store if not already selected
                    if (!prev && normalizedUserStore) {
                        console.log('🏪 [StoreContext] Setting selectedStore to user store (initial):', normalizedUserStore)
                        localStorage.setItem('selectedStore', normalizedUserStore)
                        return normalizedUserStore
                    }
                    return prev
                })
            } catch (err) {
                console.error('Error fetching stores:', err)
                setError(err instanceof Error ? err.message : 'Unknown error')

                // Fallback: add user's own store
                if (user.storeId) {
                    const fallbackStores = [{
                        _id: user.storeId,
                        storeId: user.storeId,
                        storeName: 'Mi Tienda'
                    }]
                    setAvailableStores(fallbackStores)
                    // Update userStore to use the normalized storeId
                    setUserStore(user.storeId)

                    // Auto-assign to own store if no selectedStore
                    setSelectedStoreState(prev => {
                        if (!prev) {
                            console.log('🏪 [StoreContext] Auto-assigning selectedStore to own store (fallback):', user.storeId)
                            localStorage.setItem('selectedStore', user.storeId)
                            return user.storeId
                        }
                        return prev
                    })
                }
            } finally {
                setLoading(false)
            }
        }

        fetchStores()
    }, [user, safeToken])

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
