import { ChevronDown, Building2 } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useStore } from '@/contexts/StoreContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useState, useRef, useEffect } from 'react'

export default function StoreSelector() {
    const { isSysAdmin } = usePermissions()
    const { userStore, selectedStore, availableStores, setSelectedStore } = useStore()
    const { mode } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Only show for sys_admin
    if (!isSysAdmin()) {
        return null
    }

    const currentStore = availableStores.find(s => s.storeId === selectedStore)
    const userStoreInfo = availableStores.find(s => s.storeId === userStore)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors min-h-[44px]
          ${mode === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 active:bg-slate-500'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                    }
        `}
                title="Seleccionar tienda para ver datos (SYS ADMIN)"
                aria-label="Seleccionar tienda para ver datos"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <Building2 size={18} />
                <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
                    {currentStore?.storeName || 'Selecciona tienda'}
                </span>
                <ChevronDown
                    size={16}
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div
                    className={`
            absolute top-full right-0 mt-2 w-72 rounded-lg shadow-lg z-50 border
            ${mode === 'dark'
                            ? 'bg-slate-800 border-slate-700'
                            : 'bg-white border-gray-200'
                        }
          `}
                    role="listbox"
                >
                    {/* Header with info */}
                    <div className={`px-4 py-3 border-b ${mode === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                        <div className="text-xs font-semibold mb-2">
                            👑 Mi Tienda (Lectura/Escritura):
                        </div>
                        <div className={`px-3 py-2 rounded ${mode === 'dark' ? 'bg-slate-700' : 'bg-blue-50'}`}>
                            <div className={`text-sm font-bold ${mode === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                                {userStoreInfo?.storeName || userStore}
                            </div>
                            <div className={`text-xs ${mode === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                {userStore}
                            </div>
                            <div className="text-xs mt-1">✓ Tienda personal (creación y edición)</div>
                        </div>
                    </div>

                    {/* Available stores to view */}
                    <div className="px-4 py-3">
                        <div className="text-xs font-semibold mb-2">
                            👀 Ver datos de tiendas:
                        </div>
                        <div className="p-2 max-h-48 overflow-y-auto space-y-1">
                            {availableStores.length === 0 ? (
                                <div className={`px-3 py-2 text-sm ${mode === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                    No hay tiendas disponibles
                                </div>
                            ) : (
                                availableStores.map((store) => (
                                    <button
                                        key={store.storeId}
                                        onClick={() => {
                                            // Toggle: if already selected, go back to user's store
                                            if (selectedStore === store.storeId) {
                                                setSelectedStore(userStore!)
                                            } else {
                                                setSelectedStore(store.storeId)
                                            }
                                            setIsOpen(false)
                                        }}
                                        className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      flex items-center gap-2
                      ${selectedStore === store.storeId
                                                ? mode === 'dark'
                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                : mode === 'dark'
                                                    ? 'text-slate-300 hover:bg-slate-700 active:bg-slate-600'
                                                    : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                                            }
                    `}
                                        role="option"
                                        aria-selected={selectedStore === store.storeId}
                                    >
                                        <Building2 size={16} />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate">{store.storeName}</div>
                                            <div className={`text-xs ${mode === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                                {store.storeId === userStore && '(Tu tienda) '}
                                                {store.storeId}
                                            </div>
                                        </div>
                                        {selectedStore === store.storeId && (
                                            <span className="text-lg">✓</span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer with info */}
                    <div className={`
            px-4 py-3 text-xs border-t
            ${mode === 'dark'
                            ? 'bg-slate-900/50 border-slate-700 text-slate-500'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }
          `}>
                        <p>📖 Solo lectura de otras tiendas. Los nuevos datos siempre se crean en tu tienda.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
