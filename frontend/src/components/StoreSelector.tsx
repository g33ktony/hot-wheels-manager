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
    const topButtonClass = mode === 'dark'
        ? 'bg-slate-900/44 text-slate-200 hover:bg-slate-900/58 !shadow-[10px_10px_18px_rgba(2,6,23,0.55),-7px_-7px_12px_rgba(148,163,184,0.16)]'
        : 'bg-white/90 text-slate-600 hover:bg-white !shadow-[10px_10px_18px_rgba(148,163,184,0.28),-7px_-7px_12px_rgba(255,255,255,0.98)]'

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
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 min-h-[44px] backdrop-blur-xl touch-manipulation
          ${topButtonClass}
        `}
                title="Seleccionar tienda para ver datos (SYS ADMIN)"
                aria-label="Seleccionar tienda para ver datos"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                style={{
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                }}
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
            absolute top-full right-0 mt-2 w-72 rounded-lg z-50 backdrop-blur-xl
            ${mode === 'dark'
                            ? 'bg-slate-900/70 !shadow-[14px_14px_28px_rgba(2,6,23,0.4),6,23,0.58),163,184,0.1)]'
                            : 'bg-white/88 !shadow-[14px_14px_28px_rgba(148,163,184,0.2),163,184,0.2),255,255,0.98)]'
                        }
          `}
                    role="listbox"
                >
                    {/* Header with info */}
                    <div className={`px-4 py-3 border-b ${mode === 'dark' ? 'border-slate-600/50' : 'border-slate-300/70'}`}>
                        <div className="text-xs font-semibold mb-2">
                            👑 Mi Tienda (Lectura/Escritura):
                        </div>
                        <div className={`px-3 py-2 rounded backdrop-blur-xl ${mode === 'dark' ? 'bg-slate-800/55 !shadow-[6,23,0.58),163,184,0.1)]' : 'bg-blue-50/85 !shadow-[197,253,0.28),255,255,0.98)]'}`}>
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
                            {availableStores.filter(s => s.storeId !== userStore).length === 0 ? (
                                <div className={`px-3 py-2 text-sm ${mode === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                    No hay otras tiendas disponibles
                                </div>
                            ) : (
                                availableStores
                                    .filter(s => s.storeId !== userStore) // Exclude user's own store
                                    .map((store) => (
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
                      w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      flex items-center gap-2 backdrop-blur-xl
                      ${selectedStore === store.storeId
                                                    ? mode === 'dark'
                                                        ? 'bg-emerald-500/24 text-emerald-200 shadow-[9px_9px_16px_rgba(6,78,59,0.4),-6px_-6px_10px_rgba(16,185,129,0.16)]'
                                                        : 'bg-emerald-100/92 text-emerald-700 shadow-[9px_9px_16px_rgba(16,185,129,0.18),-6px_-6px_10px_rgba(255,255,255,0.98)]'
                                                    : mode === 'dark'
                                                        ? 'text-slate-200 bg-slate-900/36 hover:bg-slate-800/56 shadow-[8px_8px_14px_rgba(2,6,23,0.45),-5px_-5px_9px_rgba(148,163,184,0.12)]'
                                                        : 'text-slate-700 bg-white/82 hover:bg-white shadow-[8px_8px_14px_rgba(148,163,184,0.2),-5px_-5px_9px_rgba(255,255,255,0.98)]'
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
                            ? 'bg-slate-900/50 border-slate-600/50 text-slate-400'
                            : 'bg-slate-100/70 border-slate-300/70 text-slate-600'
                        }
          `}>
                        <p>📖 Solo lectura de otras tiendas. Los nuevos datos siempre se crean en tu tienda.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
