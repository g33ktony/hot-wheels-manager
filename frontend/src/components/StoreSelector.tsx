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

    const isDark = mode === 'dark'
    const currentStore = availableStores.find(s => s.storeId === selectedStore)
    const userStoreInfo = availableStores.find(s => s.storeId === userStore)

    const triggerClass = isDark
        ? 'bg-slate-900/40 text-slate-200 shadow-[9px_9px_16px_rgba(2,6,23,0.5),-6px_-6px_10px_rgba(148,163,184,0.14)] hover:bg-slate-900/52'
        : 'bg-white/86 text-slate-600 shadow-[9px_9px_16px_rgba(148,163,184,0.24),-6px_-6px_10px_rgba(255,255,255,0.98)] hover:bg-white/92'

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
            {/* Trigger — same height/padding as UserDropdown trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`hidden sm:flex items-center gap-2 select-none px-3 py-1.5 rounded-lg backdrop-blur-xl transition-colors cursor-pointer ${triggerClass}`}
                title="Seleccionar tienda para ver datos (SYS ADMIN)"
                aria-label="Seleccionar tienda para ver datos"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                <Building2 size={18} />
                <span className="text-sm font-medium">
                    {currentStore?.storeName || 'Selecciona tienda'}
                </span>
                <ChevronDown
                    size={14}
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Mobile trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`sm:hidden p-2 rounded-lg backdrop-blur-xl transition-colors cursor-pointer ${triggerClass}`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Seleccionar tienda"
            >
                <Building2 size={20} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={`absolute top-full right-0 mt-2 w-72 rounded-xl z-50 overflow-hidden border ${isDark
                        ? 'bg-slate-800/95 backdrop-blur-2xl border-slate-700/60 shadow-[16px_16px_30px_rgba(2,6,23,0.6),-10px_-10px_20px_rgba(148,163,184,0.12)]'
                        : 'bg-white border-slate-200 shadow-[16px_16px_30px_rgba(148,163,184,0.3),-10px_-10px_20px_rgba(255,255,255,0.98)]'
                        }`}
                    role="listbox"
                >
                    {/* Header: user's own store */}
                    <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/80'}`}>
                        <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            👑 Mi Tienda (Lectura/Escritura):
                        </div>
                        <div className={`px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700/60' : 'bg-blue-50'}`}>
                            <div className={`text-sm font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                {userStoreInfo?.storeName || userStore}
                            </div>
                            <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {userStore}
                            </div>
                            <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                ✓ Tienda personal (creación y edición)
                            </div>
                        </div>
                    </div>

                    {/* Available stores */}
                    <div className="px-4 py-3">
                        <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            👀 Ver datos de tiendas:
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {availableStores.filter(s => s.storeId !== userStore).length === 0 ? (
                                <div className={`px-3 py-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    No hay otras tiendas disponibles
                                </div>
                            ) : (
                                availableStores
                                    .filter(s => s.storeId !== userStore)
                                    .map((store) => (
                                        <button
                                            key={store.storeId}
                                            onClick={() => {
                                                if (selectedStore === store.storeId) {
                                                    setSelectedStore(userStore!)
                                                } else {
                                                    setSelectedStore(store.storeId)
                                                }
                                                setIsOpen(false)
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedStore === store.storeId
                                                ? isDark
                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                : isDark
                                                    ? 'text-slate-200 hover:bg-slate-700/60'
                                                    : 'text-slate-700 hover:bg-slate-100'
                                                }`}
                                            role="option"
                                            aria-selected={selectedStore === store.storeId}
                                        >
                                            <Building2 size={16} className="flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="truncate">{store.storeName}</div>
                                                <div className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {store.storeId}
                                                </div>
                                            </div>
                                            {selectedStore === store.storeId && (
                                                <span className="text-emerald-500 font-bold">✓</span>
                                            )}
                                        </button>
                                    ))
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`px-4 py-3 text-xs border-t ${isDark
                        ? 'bg-slate-900/50 border-slate-700/50 text-slate-400'
                        : 'bg-slate-50 border-slate-200/80 text-slate-500'
                        }`}>
                        📖 Solo lectura de otras tiendas. Los nuevos datos siempre se crean en tu tienda.
                    </div>
                </div>
            )}
        </div>
    )
}
