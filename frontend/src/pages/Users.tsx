import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { usePermissions } from '@/hooks/usePermissions'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import { Loading } from '@/components/common/Loading'
import {
    Users,
    CheckCircle,
    XCircle,
    Clock,
    Trash2,
    Mail,
    Phone,
    Store,
    AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
    _id: string
    email: string
    name: string
    phone?: string
    role: string
    storeId: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
    approvedAt?: string
    approvedBy?: string
    rejectionReason?: string
}

const UsersPage: React.FC = () => {
    const { mode } = useTheme()
    const { isSysAdmin } = usePermissions()
    const isDark = mode === 'dark'

    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [showApprovalModal, setShowApprovalModal] = useState(false)
    const [showRejectionModal, setShowRejectionModal] = useState(false)
    const [approvalRole, setApprovalRole] = useState('admin')
    const [rejectionReason, setRejectionReason] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    // Verificar permisos
    if (!isSysAdmin()) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                <Card className="p-8 text-center">
                    <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                    <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : ''}`}>
                        Acceso Denegado
                    </h2>
                    <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                        Solo los administradores del sistema pueden acceder a esta página.
                    </p>
                </Card>
            </div>
        )
    }

    // Fetch usuarios
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/users', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })

                if (!response.ok) throw new Error('Error al cargar usuarios')

                const data = await response.json()
                setUsers(data.data || [])
            } catch (error) {
                console.error('Error fetching users:', error)
                toast.error('Error al cargar usuarios')
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [])

    // Filtrar usuarios
    const filteredUsers = users.filter(user => {
        const matchesFilter = filter === 'all' || user.status === filter
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesFilter && matchesSearch
    })

    // Aprobar usuario
    const handleApprove = async () => {
        if (!selectedUser) return

        try {
            const response = await fetch(`/api/users/${selectedUser._id}/approve`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ role: approvalRole })
            })

            if (!response.ok) throw new Error('Error al aprobar')

            toast.success(`Usuario ${selectedUser.email} aprobado`)
            setShowApprovalModal(false)
            setSelectedUser(null)

            // Actualizar lista
            const updatedUsers = users.map(u =>
                u._id === selectedUser._id
                    ? { ...u, status: 'approved' as const, approvedAt: new Date().toISOString() }
                    : u
            )
            setUsers(updatedUsers)
        } catch (error) {
            console.error('Error approving user:', error)
            toast.error('Error al aprobar usuario')
        }
    }

    // Rechazar usuario
    const handleReject = async () => {
        if (!selectedUser) return

        if (!rejectionReason.trim()) {
            toast.error('Debes indicar una razón para el rechazo')
            return
        }

        try {
            const response = await fetch(`/api/users/${selectedUser._id}/reject`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reason: rejectionReason })
            })

            if (!response.ok) throw new Error('Error al rechazar')

            toast.success(`Usuario ${selectedUser.email} rechazado`)
            setShowRejectionModal(false)
            setSelectedUser(null)
            setRejectionReason('')

            // Actualizar lista
            const updatedUsers = users.map(u =>
                u._id === selectedUser._id
                    ? { ...u, status: 'rejected' as const, rejectionReason }
                    : u
            )
            setUsers(updatedUsers)
        } catch (error) {
            console.error('Error rejecting user:', error)
            toast.error('Error al rechazar usuario')
        }
    }

    // Eliminar usuario
    const handleDelete = async (userId: string, email: string) => {
        if (!window.confirm(`¿Eliminar usuario ${email}?`)) return

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (!response.ok) throw new Error('Error al eliminar')

            toast.success('Usuario eliminado')
            setUsers(users.filter(u => u._id !== userId))
        } catch (error) {
            console.error('Error deleting user:', error)
            toast.error('Error al eliminar usuario')
        }
    }

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
                    <Clock size={14} />
                    <span className="text-xs font-medium">Pendiente</span>
                </div>
            case 'approved':
                return <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800">
                    <CheckCircle size={14} />
                    <span className="text-xs font-medium">Aprobado</span>
                </div>
            case 'rejected':
                return <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-800">
                    <XCircle size={14} />
                    <span className="text-xs font-medium">Rechazado</span>
                </div>
            default:
                return null
        }
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Users className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`} size={32} />
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : ''}`}>
                            Gestión de Usuarios
                        </h1>
                    </div>
                    <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                        Aprueba, rechaza o gestiona las solicitudes de nuevos usuarios
                    </p>
                </div>

                {/* Controles */}
                <Card className="mb-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Búsqueda */}
                        <div className="flex-1 min-w-0">
                            <Input
                                type="text"
                                placeholder="Buscar por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filtros */}
                        <div className="flex gap-2 overflow-x-auto">
                            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === f
                                        ? `${isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`
                                        : `${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                                        }`}
                                >
                                    {f === 'pending' && 'Pendientes'}
                                    {f === 'approved' && 'Aprobados'}
                                    {f === 'rejected' && 'Rechazados'}
                                    {f === 'all' && 'Todos'}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Tabla */}
                {loading ? (
                    <Loading />
                ) : filteredUsers.length === 0 ? (
                    <Card className="text-center py-12">
                        <Users className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                        <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                            No hay usuarios para mostrar
                        </p>
                    </Card>
                ) : (
                    <div className={`rounded-lg overflow-x-auto ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
                        <table className="w-full">
                            <thead className={isDark ? 'bg-slate-700' : 'bg-gray-100'}>
                                <tr>
                                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} uppercase`}>
                                        Usuario
                                    </th>
                                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} uppercase`}>
                                        Email
                                    </th>
                                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} uppercase`}>
                                        Tienda
                                    </th>
                                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} uppercase`}>
                                        Estado
                                    </th>
                                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} uppercase`}>
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr
                                        key={user._id}
                                        className={`border-t ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <td className={`px-6 py-4 ${isDark ? 'text-white' : ''}`}>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                {user.phone && (
                                                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                                        <Phone size={12} className="inline mr-1" />
                                                        {user.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                                            <div className="flex items-center gap-2">
                                                <Store size={14} />
                                                {user.storeId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(user.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {user.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user)
                                                                setShowApprovalModal(true)
                                                            }}
                                                            className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                                            title="Aprobar"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user)
                                                                setShowRejectionModal(true)
                                                            }}
                                                            className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                                            title="Rechazar"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(user._id, user.email)}
                                                    disabled={user.role === 'sys_admin'}
                                                    className={`p-2 rounded-lg transition-colors ${user.role === 'sys_admin'
                                                            ? isDark
                                                                ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : isDark
                                                                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        }`}
                                                    title={user.role === 'sys_admin' ? 'No se puede eliminar administradores del sistema' : 'Eliminar'}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Aprobación */}
            <Modal
                isOpen={showApprovalModal}
                onClose={() => setShowApprovalModal(false)}
                title="Aprobar Usuario"
            >
                {selectedUser && (
                    <div className="space-y-4">
                        <div>
                            <p className={`text-sm mb-2 ${isDark ? 'text-slate-300' : ''}`}>
                                <strong>Usuario:</strong> {selectedUser.name} ({selectedUser.email})
                            </p>
                            <p className={`text-sm mb-4 ${isDark ? 'text-slate-300' : ''}`}>
                                <strong>Tienda:</strong> {selectedUser.storeId}
                            </p>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : ''}`}>
                                Rol a asignar
                            </label>
                            <select
                                value={approvalRole}
                                onChange={(e) => setApprovalRole(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border ${isDark
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-white border-gray-300'
                                    }`}
                            >
                                <option value="admin">Admin de Tienda</option>
                                <option value="editor">Editor</option>
                                <option value="analyst">Analista</option>
                            </select>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => setShowApprovalModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleApprove}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Aprobar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de Rechazo */}
            <Modal
                isOpen={showRejectionModal}
                onClose={() => {
                    setShowRejectionModal(false)
                    setRejectionReason('')
                }}
                title="Rechazar Usuario"
            >
                {selectedUser && (
                    <div className="space-y-4">
                        <div>
                            <p className={`text-sm mb-2 ${isDark ? 'text-slate-300' : ''}`}>
                                <strong>Usuario:</strong> {selectedUser.name} ({selectedUser.email})
                            </p>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : ''}`}>
                                Razón del rechazo
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Explica por qué rechazas esta solicitud"
                                className={`w-full px-3 py-2 rounded-lg border ${isDark
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-white border-gray-300'
                                    }`}
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowRejectionModal(false)
                                    setRejectionReason('')
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleReject}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Rechazar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default UsersPage
