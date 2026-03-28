import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import { useUserManagement } from '@/hooks/useUserManagement'
import { useStores } from '@/hooks/useStores'
import {
    Settings,
    Lock,
    Copy,
    CheckCircle,
    Globe
} from 'lucide-react'
import toast from 'react-hot-toast'
import { storeSettingsService } from '@/services/storeSettings'

const StoreSettingsPage: React.FC = () => {
    const { mode } = useTheme()
    const { user } = useAuth()
    const { isSysAdmin } = usePermissions()
    const { createUserInStore, updateUserRole, deleteUser } = useUserManagement()
    const { stores, refetch } = useStores()
    const isDark = mode === 'dark'

    const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'create-user' | 'public-catalog'>('profile')
    const [showPasswordModal, setShowPasswordModal] = useState(false)

    // Public catalog state
    const [showCustomInventory, setShowCustomInventory] = useState(false)
    const [catalogSettingsLoading, setCatalogSettingsLoading] = useState(false)

    // Profile state
    const [profileName, setProfileName] = useState(user?.name || '')
    const [profileEmail, setProfileEmail] = useState(user?.email || '')
    const [profilePhone, setProfilePhone] = useState(user?.phone || '')
    const [storeDescription, setStoreDescription] = useState('')

    // Create user state
    const [newUserName, setNewUserName] = useState('')
    const [newUserEmail, setNewUserEmail] = useState('')
    const [newUserRole, setNewUserRole] = useState<'editor' | 'analyst'>('editor')
    const [createdUserData, setCreatedUserData] = useState<any>(null)

    // Password state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // Team data
    const [teamUsers, setTeamUsers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const currentStore = stores.find(s => s._id === user?.storeId)

    useEffect(() => {
        if (currentStore) {
            setStoreDescription(currentStore.description || '')
            setTeamUsers(currentStore.users.userDetails || [])
        }
    }, [currentStore])

    // Load public catalog settings
    useEffect(() => {
        const loadCatalogSettings = async () => {
            try {
                const settings = await storeSettingsService.get()
                setShowCustomInventory(settings.publicCatalog?.showCustomInventory ?? false)
            } catch (error) {
                console.error('Error loading catalog settings:', error)
            }
        }
        loadCatalogSettings()
    }, [])

    const handleToggleShowInventory = async (checked: boolean) => {
        try {
            setCatalogSettingsLoading(true)
            await storeSettingsService.update({
                publicCatalog: { showCustomInventory: checked }
            })
            setShowCustomInventory(checked)
            toast.success(checked
                ? 'Tu inventario ahora es visible en el catálogo público'
                : 'Tu inventario ya no es visible en el catálogo público'
            )
        } catch (error) {
            console.error('Error updating catalog settings:', error)
            toast.error('Error al actualizar la configuración')
        } finally {
            setCatalogSettingsLoading(false)
        }
    }

    const handleCreateUser = async () => {
        if (!newUserName.trim() || !newUserEmail.trim()) {
            toast.error('Nombre y email son requeridos')
            return
        }

        const normalizedEmail = newUserEmail.trim().toLowerCase()
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)

        if (!isValidEmail) {
            toast.error('Ingresa un email válido')
            return
        }

        if (!user?.storeId) {
            toast.error('No se detectó tu tienda. Por favor cierra sesión y vuelve a entrar.')
            return
        }

        try {
            setIsLoading(true)
            const result = await createUserInStore({
                name: newUserName.trim(),
                email: normalizedEmail,
                role: newUserRole,
                storeId: user.storeId
            })

            setCreatedUserData({
                name: result.user.name,
                email: result.user.email,
                password: result.temporaryPassword
            })
            setNewUserName('')
            setNewUserEmail('')
            setNewUserRole('editor')

            try {
                await refetch()
            } catch (refetchError) {
                console.warn('User created but stores refresh failed:', refetchError)
            }

            toast.success('Usuario creado exitosamente')
        } catch (error) {
            console.error('Error creating user:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Todos los campos son requeridos')
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            })

            if (!response.ok) throw new Error('Error al cambiar contraseña')

            toast.success('Contraseña cambiada exitosamente')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setShowPasswordModal(false)
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Copiado al portapapeles')
    }

    const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'editor' | 'analyst') => {
        if (userId === user?.id) {
            toast.error('No puedes cambiar tu propio rol')
            return
        }

        try {
            setIsLoading(true)
            await updateUserRole(userId, newRole)
            // Actualizar la lista local
            setTeamUsers(teamUsers.map(u => 
                u._id === userId ? { ...u, role: newRole } : u
            ))
        } catch (error) {
            console.error('Error updating user role:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteTeamUser = async (userId: string, userName: string) => {
        if (userId === user?.id) {
            toast.error('No puedes eliminarte a ti mismo')
            return
        }

        if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${userName}?`)) {
            return
        }

        try {
            setIsLoading(true)
            await deleteUser(userId)
            // Actualizar la lista local
            setTeamUsers(teamUsers.filter(u => u._id !== userId))
        } catch (error) {
            console.error('Error deleting user:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Settings className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`} size={32} />
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : ''}`}>
                            Configuración
                        </h1>
                    </div>
                    <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                        Gestiona tu perfil, tienda y usuarios
                    </p>
                </div>

                {/* sys_admin notice */}
                {user?.role === 'sys_admin' && (
                    <div className={`mb-6 p-4 rounded-lg border-l-4 ${isDark ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-blue-50 border-blue-500'}`}>
                        <p className="font-semibold">ℹ️ Administrador del Sistema</p>
                        <p className={`text-sm mt-2 ${isDark ? 'text-blue-800' : ''}`}>
                            Como administrador del sistema, te recomendamos usar la página <strong>"Administración de Tiendas"</strong> para gestionar tiendas y usuarios de forma centralizada.
                        </p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b" style={{ borderColor: isDark ? '#3f4651' : '#e5e7eb' }}>
                    {[
                        { id: 'profile', label: 'Perfil y Tienda' },
                        { id: 'team', label: 'Mi Equipo' },
                        ...((user?.role === 'admin' || user?.role === 'sys_admin') ? [{ id: 'create-user', label: 'Crear Usuario' }] : []),
                        ...(isSysAdmin() ? [{ id: 'public-catalog', label: '🌍 Catálogo Público' }] : [])
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-3 font-medium transition ${activeTab === tab.id
                                ? `${isDark ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'}`
                                : `${isDark ? 'text-slate-400' : 'text-gray-600'}`
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        {/* Perfil de Usuario */}
                        <Card>
                            <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : ''}`}>
                                Mi Perfil
                            </h2>
                            <div className="space-y-4">
                                <Input
                                    label="Nombre"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    disabled
                                />
                                <Input
                                    label="Email"
                                    value={profileEmail}
                                    onChange={(e) => setProfileEmail(e.target.value)}
                                    disabled
                                />
                                <Input
                                    label="Teléfono"
                                    value={profilePhone}
                                    onChange={(e) => setProfilePhone(e.target.value)}
                                />
                                <Button
                                    onClick={() => setShowPasswordModal(true)}
                                    variant="secondary"
                                    className="flex items-center gap-2"
                                >
                                    <Lock size={18} />
                                    Cambiar Contraseña
                                </Button>
                            </div>
                        </Card>

                        {/* Configuración de Tienda */}
                        {currentStore && (
                            <Card>
                                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : ''}`}>
                                    Configuración de Tienda
                                </h2>
                                <div className="space-y-4">
                                    <Input
                                        label="Nombre de Tienda"
                                        value={currentStore.name}
                                        disabled
                                    />
                                    <Input
                                        label="Descripción"
                                        value={storeDescription}
                                        onChange={(e) => setStoreDescription(e.target.value)}
                                        placeholder="Descripción de tu tienda..."
                                    />
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                        <strong>ID de Tienda:</strong> {currentStore._id}
                                    </p>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {activeTab === 'team' && (
                    <Card>
                        <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : ''}`}>
                            Mi Equipo ({teamUsers.length} usuarios)
                        </h2>
                        {teamUsers.length === 0 ? (
                            <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                                No hay usuarios en tu tienda. Crea uno desde la pestaña "Crear Usuario"
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {teamUsers.map(teamUser => (
                                    <div
                                        key={teamUser._id}
                                        className={`p-4 rounded-lg flex items-center justify-between ${isDark ? 'bg-slate-700' : 'bg-gray-100'
                                            }`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                                                    {teamUser.name}
                                                </p>
                                                {teamUser.email === user?.email && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-blue-600 text-blue-100' : 'bg-blue-100 text-blue-700'}`}>
                                                        Mi cuenta
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                                {teamUser.email}
                                            </p>
                                            <div className="flex gap-3 mt-2 text-xs">
                                                {user?.role === 'admin' && teamUser.email !== user?.email ? (
                                                    <select
                                                        value={teamUser.role}
                                                        onChange={(e) => handleUpdateUserRole(teamUser._id, e.target.value as 'admin' | 'editor' | 'analyst')}
                                                        disabled={isLoading}
                                                        className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${isDark
                                                            ? 'bg-slate-600 border border-slate-500 text-white'
                                                            : 'bg-white border border-gray-300 text-gray-900'
                                                            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <option value="admin">Admin</option>
                                                        <option value="editor">Editor</option>
                                                        <option value="analyst">Analista</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded ${teamUser.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                                        teamUser.role === 'editor' ? 'bg-green-100 text-green-800' :
                                                            'bg-purple-100 text-purple-800'
                                                        }`}>
                                                        {teamUser.role}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {user?.role === 'admin' && teamUser.email !== user?.email && (
                                            <button
                                                onClick={() => handleDeleteTeamUser(teamUser._id, teamUser.name)}
                                                disabled={isLoading}
                                                className={`px-3 py-2 rounded text-sm font-medium transition ${isDark
                                                    ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {activeTab === 'create-user' && (
                    <Card>
                        <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : ''}`}>
                            Crear Nuevo Usuario
                        </h2>
                        <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                            {user?.role === 'sys_admin'
                                ? `Como sys admin, este usuario se creará en la tienda actual: ${currentStore?.name || user?.storeId || 'sin tienda'}`
                                : `Este usuario se creará en tu tienda actual: ${currentStore?.name || user?.storeId || 'sin tienda'}`}
                        </p>
                        <div className="space-y-4">
                            <Input
                                label="Nombre del Usuario"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                placeholder="Ej: Juan García"
                            />
                            <Input
                                label="Email"
                                type="text"
                                inputMode="email"
                                autoCapitalize="none"
                                autoCorrect="off"
                                autoComplete="email"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                placeholder="usuario@example.com"
                            />
                            <div>
                                <label className="block text-sm font-medium mb-2">Rol</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value as any)}
                                    className={`w-full px-3 py-2 rounded-lg border ${isDark
                                        ? 'bg-slate-700 border-slate-600 text-white'
                                        : 'bg-white border-gray-300'
                                        }`}
                                >
                                    <option value="editor">Editor</option>
                                    <option value="analyst">Analyst</option>
                                </select>
                            </div>
                            <Button
                                onClick={handleCreateUser}
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? 'Creando...' : 'Crear Usuario'}
                            </Button>

                            {createdUserData && (
                                <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-green-900' : 'bg-green-100'} border ${isDark ? 'border-green-700' : 'border-green-300'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle className={isDark ? 'text-green-400' : 'text-green-600'} size={20} />
                                        <h3 className={`font-bold ${isDark ? 'text-green-100' : 'text-green-900'}`}>
                                            Usuario Creado Exitosamente
                                        </h3>
                                    </div>
                                    <div className={`space-y-2 ${isDark ? 'text-green-100' : 'text-green-900'}`}>
                                        <p><strong>Nombre:</strong> {createdUserData.name}</p>
                                        <p><strong>Email:</strong> {createdUserData.email}</p>
                                        <div className="flex items-center justify-between bg-white/20 p-2 rounded">
                                            <code className="font-mono text-sm">{createdUserData.password}</code>
                                            <button
                                                onClick={() => copyToClipboard(createdUserData.password)}
                                                className="text-xs px-2 py-1 rounded bg-white/30 hover:bg-white/50"
                                            >
                                                <Copy size={14} className="inline mr-1" />
                                                Copiar
                                            </button>
                                        </div>
                                        <p className="text-xs mt-2">
                                            ⚠️ Comparte esta contraseña temporal con el usuario. Debe cambiarla al primer login.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {activeTab === 'public-catalog' && (
                    <Card>
                        <div className="flex items-center gap-3 mb-6">
                            <Globe className={isDark ? 'text-emerald-400' : 'text-emerald-600'} size={24} />
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>
                                Configuración del Catálogo Público
                            </h2>
                        </div>

                        <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showCustomInventory}
                                    onChange={(e) => handleToggleShowInventory(e.target.checked)}
                                    disabled={catalogSettingsLoading}
                                    className={`mt-1 w-5 h-5 rounded border transition-colors cursor-pointer ${isDark
                                        ? 'bg-slate-600 border-slate-500 checked:bg-emerald-600'
                                        : 'border-gray-300 checked:bg-emerald-500'
                                        }`}
                                />
                                <div className="flex-1">
                                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                        Mostrar mi inventario en el catálogo público
                                    </span>
                                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                        Cuando está activado, tus items del inventario aparecerán en los resultados
                                        de búsqueda del catálogo público junto con el catálogo oficial de Hot Wheels.
                                        Tus clientes podrán ver las piezas que tienes disponibles.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className={`mt-4 p-3 rounded-lg text-sm ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
                            <p>💡 <strong>Estado actual:</strong> {showCustomInventory
                                ? '✅ Tu inventario ES visible en el catálogo público'
                                : '❌ Tu inventario NO es visible en el catálogo público'}
                            </p>
                        </div>
                    </Card>
                )}
            </div>

            {/* Modal: Cambiar Contraseña */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                title="Cambiar Contraseña"
            >
                <div className="space-y-4">
                    <Input
                        label="Contraseña Actual"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Input
                        label="Nueva Contraseña"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Input
                        label="Confirmar Contraseña"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <Button onClick={handleChangePassword} className="flex-1">
                            Cambiar Contraseña
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setShowPasswordModal(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default StoreSettingsPage
