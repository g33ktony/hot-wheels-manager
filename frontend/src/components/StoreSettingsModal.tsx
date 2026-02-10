import React, { useState, useEffect } from 'react'
import { X, Upload, Plus, Trash2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { storeSettingsService, StoreSettings } from '../services/storeSettings'
import { uploadImageToCloudinary } from '../services/cloudinary'
import toast from 'react-hot-toast'

interface StoreSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    onSave?: () => void
}

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({
    isOpen,
    onClose,
    onSave
}) => {
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    const [settings, setSettings] = useState<StoreSettings>({
        storeName: '',
        customMessages: {
            welcome: '',
            closing: '',
            invoice: '',
            delivery: '',
            custom: []
        }
    })

    const [newCustomMessage, setNewCustomMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [logoUploadLoading, setLogoUploadLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadSettings()
        }
    }, [isOpen])

    const loadSettings = async () => {
        setIsLoading(true)
        try {
            const data = await storeSettingsService.get()
            setSettings(data)
        } catch (error) {
            console.error('Error loading settings:', error)
            toast.error('Error al cargar configuración')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await storeSettingsService.update(settings)
            toast.success('⚙️ Configuración guardada correctamente')
            onSave?.()
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error('Error al guardar configuración')
        } finally {
            setIsSaving(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return

        setLogoUploadLoading(true)
        try {
            const file = e.target.files[0]
            const url = await uploadImageToCloudinary(file, 'hot-wheels-manager/store')

            const updated = await storeSettingsService.updateLogo(url)
            setSettings(updated)
            toast.success('✓ Logo actualizado')
        } catch (error) {
            console.error('Error uploading logo:', error)
            toast.error('Error al subir logo')
        } finally {
            setLogoUploadLoading(false)
        }
    }

    const handleAddCustomMessage = async () => {
        if (!newCustomMessage.trim()) {
            toast.error('El mensaje no puede estar vacío')
            return
        }

        try {
            const updated = await storeSettingsService.addCustomMessage(newCustomMessage)
            setSettings(updated)
            setNewCustomMessage('')
            toast.success('✓ Mensaje agregado')
        } catch (error) {
            console.error('Error adding message:', error)
            toast.error('Error al agregar mensaje')
        }
    }

    const handleDeleteCustomMessage = async (index: number) => {
        try {
            const updated = await storeSettingsService.deleteCustomMessage(index)
            setSettings(updated)
            toast.success('✓ Mensaje eliminado')
        } catch (error) {
            console.error('Error deleting message:', error)
            toast.error('Error al eliminar mensaje')
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className={`w-full md:w-2/3 lg:w-1/2 max-h-[90vh] overflow-y-auto rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
                        }`}
                >
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        ⚙️ Configuración de Tienda
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isDark
                                ? 'hover:bg-slate-700 text-slate-400'
                                : 'hover:bg-gray-200 text-gray-600'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center gap-2">
                                <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                                    Cargando...
                                </span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Store Name */}
                            <div>
                                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'
                                    }`}>
                                    📌 Nombre de la Tienda
                                </label>
                                <input
                                    type="text"
                                    value={settings.storeName || ''}
                                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                                    placeholder="Mi Tienda de Hot Wheels"
                                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDark
                                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500'
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500'
                                        } focus:outline-none`}
                                />
                            </div>

                            {/* Logo */}
                            <div>
                                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'
                                    }`}>
                                    🖼️ Logo de la Tienda
                                </label>
                                <div className="flex gap-4">
                                    {settings.logo && (
                                        <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-emerald-500">
                                            <img
                                                src={settings.logo}
                                                alt="Logo"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <label
                                            className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDark
                                                    ? 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                                                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex flex-col items-center justify-center pt-4 pb-4">
                                                <Upload className={`w-6 h-6 ${isDark ? 'text-slate-400' : 'text-gray-600'
                                                    }`} />
                                                <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-gray-600'
                                                    }`}>
                                                    {logoUploadLoading ? 'Subiendo...' : 'Haz clic o arrastra'}
                                                </p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                disabled={logoUploadLoading}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'
                                    }`}>
                                    📝 Descripción
                                </label>
                                <textarea
                                    value={settings.description || ''}
                                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                                    placeholder="Describe brevemente tu tienda..."
                                    rows={3}
                                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDark
                                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500'
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500'
                                        } focus:outline-none`}
                                />
                            </div>

                            {/* Standard Messages */}
                            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'
                                }`}>
                                <h3 className={`font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-700'
                                    }`}>
                                    💬 Mensajes Estándar
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { key: 'welcome', label: '👋 Bienvenida' },
                                        { key: 'closing', label: '🙏 Cierre' },
                                        { key: 'invoice', label: '📄 Factura' },
                                        { key: 'delivery', label: '📦 Entrega' }
                                    ].map(({ key, label }) => (
                                        <div key={key}>
                                            <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-slate-300' : 'text-gray-600'
                                                }`}>
                                                {label}
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.customMessages?.[key as keyof typeof settings.customMessages] || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    customMessages: {
                                                        ...settings.customMessages,
                                                        [key]: e.target.value
                                                    }
                                                })}
                                                className={`w-full px-3 py-1 rounded text-sm border transition-colors ${isDark
                                                        ? 'bg-slate-600 border-slate-500 text-white focus:border-emerald-500'
                                                        : 'bg-white border-gray-300 text-gray-900 focus:border-emerald-500'
                                                    } focus:outline-none`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Messages */}
                            <div>
                                <h3 className={`font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-gray-700'
                                    }`}>
                                    ⭐ Frases Personalizadas
                                </h3>
                                <div className="space-y-2 mb-4">
                                    {settings.customMessages?.custom?.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center justify-between p-3 rounded-lg border ${isDark
                                                    ? 'bg-slate-700 border-slate-600'
                                                    : 'bg-gray-50 border-gray-200'
                                                }`}
                                        >
                                            <p className={isDark ? 'text-slate-200' : 'text-gray-700'}>
                                                {msg}
                                            </p>
                                            <button
                                                onClick={() => handleDeleteCustomMessage(idx)}
                                                className={`p-1 rounded transition-colors ${isDark
                                                        ? 'hover:bg-red-600/20 text-red-400'
                                                        : 'hover:bg-red-50 text-red-600'
                                                    }`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Custom Message */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCustomMessage}
                                        onChange={(e) => setNewCustomMessage(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddCustomMessage()
                                            }
                                        }}
                                        placeholder="Nueva frase personalizada..."
                                        className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${isDark
                                                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500'
                                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500'
                                            } focus:outline-none`}
                                    />
                                    <button
                                        onClick={handleAddCustomMessage}
                                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${isDark
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                            }`}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar
                                    </button>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'
                                }`}>
                                <h3 className={`font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-700'
                                    }`}>
                                    📞 Información de Contacto
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { key: 'phone', label: '📱 Teléfono' },
                                        { key: 'email', label: '✉️ Email' },
                                        { key: 'address', label: '🏪 Dirección' }
                                    ].map(({ key, label }) => (
                                        <div key={key}>
                                            <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-slate-300' : 'text-gray-600'
                                                }`}>
                                                {label}
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.contact?.[key as keyof typeof settings.contact] || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    contact: {
                                                        ...settings.contact,
                                                        [key]: e.target.value
                                                    }
                                                })}
                                                placeholder={label}
                                                className={`w-full px-3 py-1 rounded text-sm border transition-colors ${isDark
                                                        ? 'bg-slate-600 border-slate-500 text-white focus:border-emerald-500'
                                                        : 'bg-white border-gray-300 text-gray-900 focus:border-emerald-500'
                                                    } focus:outline-none`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Public Catalog Settings */}
                            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                                <h3 className={`font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                    🌍 Configuración del Catálogo Público
                                </h3>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.publicCatalog?.showCustomInventory ?? false}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            publicCatalog: {
                                                ...settings.publicCatalog,
                                                showCustomInventory: e.target.checked
                                            }
                                        })}
                                        className={`mt-1 w-5 h-5 rounded border transition-colors ${
                                            isDark
                                                ? 'bg-slate-600 border-slate-500 checked:bg-emerald-600'
                                                : 'border-gray-300 checked:bg-emerald-500'
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                            Mostrar inventario personalizado en búsqueda pública
                                        </span>
                                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                            Si está desactivado, solo se mostrará el catálogo oficial de Hot Wheels en la búsqueda pública. Actívalo cuando quieras que tus clientes vean tus autos personalizados.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={`flex gap-3 p-6 border-t ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <button
                        onClick={onClose}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark
                                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                            }`}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isSaving
                                ? 'opacity-50 cursor-not-allowed'
                                : isDark
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            }`}
                    >
                        {isSaving ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Guardando...
                            </>
                        ) : (
                            <>✓ Guardar</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
