import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import { useUserManagement } from '@/hooks/useUserManagement'
import { useStores } from '@/hooks/useStores'
import {
    Settings,
    Users,
    Plus,
    Edit,
    Trash2,
    Lock,
    Copy,
    CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const StoreSettingsPage: React.FC = () => {
    const { mode } = useTheme()
    const { user } = useAuth()
    const { createUserInStore } = useUserManagement()
    const { stores, refetch } = useStores()
    const isDark = mode === 'dark'

    const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'create-user'>('profile')
    const [showCreateUserModal, setShowCreateUserModal] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)

    // Profile state
    const [profileName, setProfileName] = useState(user?.name || '')
    const [profileEmail, setProfileEmail] = useState(user?.email || '')
    const [profilePhone, setProfilePhone] = useState(user?.phone || '')
    const [storeDescription, setStoreDescription] = useState('')

    // Create user state
    const [newUserName, setNewUserName] = useState('')
    const [newUserEmail, setNewUserEmail] = useState('')
    const [newUserRole, setNewUserRole] = useState<'editor' | 'analyst'>('editor')
    const [generatedPassword, setGeneratedPassword] = useState('')
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

    const handleCreateUser = async () => {
        if (!newUserName.trim() || !newUserEmail.trim()) {
            toast.error('Nombre y email son requeridos')
            return
        }

        try {
            setIsLoading(true)
            const result = await createUserInStore({
                name: newUserName,
                email: newUserEmail,
                role: newUserRole,
                storeId: user?.storeId || ''
            })

            setCreatedUserData({
                name: result.user.name,
                email: result.user.email,
                password: result.temporaryPassword
            })
            setGeneratedPassword(result.temporaryPassword)
            setNewUserName('')
            setNewUserEmail('')
            setNewUserRole('editor')

            await refetch()
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
                method: 'POST',
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

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b" style={{ borderColor: isDark ? '#3f4651' : '#e5e7eb' }}>
                    {[
                        { id: 'profile', label: 'Perfil y Tienda' },
                        { id: 'team', label: 'Mi Equipo' },
                        { id: 'create-user', label: 'Crear Usuario' }
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
                                {teamUsers.map(user => (
                                    <div
                                        key={user._id}
                                        className={`p-4 rounded-lg flex items-center justify-between ${isDark ? 'bg-slate-700' : 'bg-gray-100'
                                            }`}
                                    >
                                        <div>
                                            <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                                                {user.name}
                                            </p>
                                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                                {user.email}
                                            </p>
                                            <div className="flex gap-3 mt-2 text-xs">
                                                <span className={`px-2 py-1 rounded ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                                        user.role === 'editor' ? 'bg-green-100 text-green-800' :
                                                            'bg-purple-100 text-purple-800'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                                <span className={`px-2 py-1 rounded ${user.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.status}
                                                </span>
                                            </div>
                                        </div>
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
                        <div className="space-y-4">
                            <Input
                                label="Nombre del Usuario"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                placeholder="Ej: Juan García"
                            />
                            <Input
                                label="Email"
                                type="email"
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
