import React, { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useStores } from '@/hooks/useStores'
import { storeSettingsService } from '@/services/storeSettings'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import PageHeader from '@/components/common/PageHeader'
import Modal from '@/components/common/Modal'
import { Loading } from '@/components/common/Loading'
import {
  Building2,
  Users,
  Plus,
  Edit,
  Archive,
  RotateCcw,
  Trash2,
  AlertCircle,
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

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

const StoresPage: React.FC = () => {
  const { mode } = useTheme()
  const { isSysAdmin } = usePermissions()
  const isDark = mode === 'dark'
  const { stores, isLoading, error, refetch, createStore, updateUserRole, removeUser, archiveStore, restoreStore } = useStores()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedStore, setSelectedStore] = useState<any>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [newStoreName, setNewStoreName] = useState('')
  const [newStoreDescription, setNewStoreDescription] = useState('')
  const [newUserRole, setNewUserRole] = useState('editor')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'archived'>('active')
  const [storeVisibilityControl, setStoreVisibilityControl] = useState<Record<string, boolean>>({})
  const [visibilityControlLoading, setVisibilityControlLoading] = useState<string | null>(null)

  const loadStoreDetails = async (storeId: string) => {
    try {
      const token = sanitizeToken(localStorage.getItem('token'))
      const response = await fetch(`/api/stores/${storeId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      if (!response.ok) {
        throw new Error('No se pudo cargar el detalle de la tienda')
      }

      const payload = await response.json()
      const detail = payload?.data
      const usersFromDetail = Array.isArray(detail?.users) ? detail.users : []

      // Load store settings for admin visibility control
      try {
        const storeSettings = await storeSettingsService.getByStoreId(storeId)
        if (storeSettings) {
          setStoreVisibilityControl(prev => ({
            ...prev,
            [storeId]: storeSettings.publicCatalog?.allowStoreAdminInventoryVisibilityControl ?? false
          }))
        }
      } catch (err) {
        console.warn('Could not load store settings for visibility control:', err)
      }

      setSelectedStore((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          ...detail,
          users: {
            ...(prev.users || {}),
            total: usersFromDetail.length,
            userDetails: usersFromDetail
          }
        }
      })
    } catch (error: any) {
      console.warn('Store details fallback failed:', error)
    }
  }

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
            Solo sys_admin puede administrar tiendas
          </p>
        </Card>
      </div>
    )
  }

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      toast.error('El nombre de la tienda es requerido')
      return
    }

    try {
      await createStore(newStoreName, newStoreDescription)
      toast.success('Tienda creada exitosamente')
      setNewStoreName('')
      setNewStoreDescription('')
      setShowCreateModal(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la tienda')
    }
  }

  const handleUpdateUserRole = async () => {
    if (!selectedStore || !selectedUser) return

    try {
      await updateUserRole(selectedStore._id, selectedUser._id, newUserRole)
      toast.success('Rol actualizado exitosamente')
      setShowUserModal(false)
      setSelectedUser(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el rol')
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!selectedStore) return

    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      try {
        await removeUser(selectedStore._id, userId)
        toast.success('Usuario eliminado')
        setSelectedStore(null)
        setShowDetailModal(false)
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar usuario')
      }
    }
  }

  const handleArchiveStore = async (storeId: string) => {
    if (window.confirm('¿Estás seguro de que deseas archivar esta tienda? Los usuarios se guardarán para poder restaurarlos después.')) {
      try {
        await archiveStore(storeId)
        toast.success('Tienda archivada exitosamente')
        setShowDetailModal(false)
        setSelectedStore(null)
      } catch (error: any) {
        toast.error(error.message || 'Error al archivar tienda')
      }
    }
  }

  const handleRestoreStore = async (storeId: string) => {
    if (window.confirm('¿Estás seguro de que deseas restaurar esta tienda?')) {
      try {
        await restoreStore(storeId)
        toast.success('Tienda restaurada exitosamente')
        setShowDetailModal(false)
        setSelectedStore(null)
      } catch (error: any) {
        toast.error(error.message || 'Error al restaurar tienda')
      }
    }
  }

  const filteredStores = stores
    .filter(store => {
      const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTab = activeTab === 'all'
        ? true
        : activeTab === 'active'
          ? !store.isArchived
          : store.isArchived
      return matchesSearch && matchesTab
    })

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <PageHeader
            title="Administración de Tiendas"
            subtitle="Gestiona todas las tiendas, usuarios y configuraciones"
            icon={<Building2 className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`} size={32} />}
            actions={
              isSysAdmin() ? (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus size={20} />
                  Nueva Tienda
                </Button>
              ) : undefined
            }
          />
        </div>

        {/* Búsqueda */}
        <Card className="mb-6">
          <Input
            type="text"
            placeholder="Buscar tienda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Card>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b" style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium transition ${activeTab === 'all'
              ? `${isDark ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'}`
              : `${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-600 hover:text-gray-700'}`
              }`}
          >
            Todas ({stores.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 font-medium transition ${activeTab === 'active'
              ? `${isDark ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'}`
              : `${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-600 hover:text-gray-700'}`
              }`}
          >
            Tiendas Activas ({stores.filter(s => !s.isArchived).length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 font-medium transition ${activeTab === 'archived'
              ? `${isDark ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'}`
              : `${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-600 hover:text-gray-700'}`
              }`}
          >
            Tiendas Archivadas ({stores.filter(s => s.isArchived).length})
          </button>
        </div>

        {/* Lista de Tiendas */}
        {isLoading ? (
          <Loading text="Cargando tiendas..." />
        ) : error ? (
          <Card className="text-center py-10">
            <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              No se pudo cargar Administracion de Tiendas
            </h3>
            <p className={isDark ? 'text-slate-400 mb-5' : 'text-gray-600 mb-5'}>
              {error}
            </p>
            <Button onClick={refetch} className="mx-auto">
              Reintentar
            </Button>
          </Card>
        ) : filteredStores.length === 0 ? (
          <Card className="text-center py-12">
            <Building2 className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
              No hay tiendas para el filtro seleccionado
            </p>
            {stores.length > 0 && (
              <p className={`mt-2 text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                Se cargaron {stores.length} tienda(s). Prueba la pestaña "Todas" o limpia la busqueda.
              </p>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredStores.map(store => (
              <div
                key={store._id}
                className={`p-6 rounded-lg border cursor-pointer transition ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                onClick={() => {
                  setSelectedStore(store)
                  setShowDetailModal(true)
                  if (!store?.users?.userDetails?.length) {
                    loadStoreDetails(store._id)
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>
                        {store.name}
                      </h3>
                      {store.isSysAdminStore && (
                        <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                          Tienda del Sistema
                        </span>
                      )}
                    </div>
                    {store.description && (
                      <p className={isDark ? 'text-slate-400 mb-3' : 'text-gray-600 mb-3'}>
                        {store.description}
                      </p>
                    )}
                    <div className="flex gap-6 text-sm">
                      <div className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                        <Users size={16} className="inline mr-1" />
                        <strong>{store.users.total}</strong> usuarios
                      </div>
                      <div className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                        👤 <strong>{store.users.admin}</strong> admin
                        {' | '}
                        <strong>{store.users.editor}</strong> editor
                        {' | '}
                        <strong>{store.users.analyst}</strong> analyst
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedStore(store)
                        setShowDetailModal(true)
                        if (!store?.users?.userDetails?.length) {
                          loadStoreDetails(store._id)
                        }
                      }}
                    >
                      <Edit size={18} />
                    </Button>
                    {activeTab === 'active' && isSysAdmin() && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleArchiveStore(store._id)
                        }}
                        title="Archivar tienda"
                      >
                        <Archive size={18} />
                      </Button>
                    )}
                    {activeTab === 'archived' && isSysAdmin() && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestoreStore(store._id)
                        }}
                        title="Restaurar tienda"
                      >
                        <RotateCcw size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Crear Tienda */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva Tienda"
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la Tienda"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder="Ej: Tienda Centro"
          />
          <Input
            label="Descripción (opcional)"
            value={newStoreDescription}
            onChange={(e) => setNewStoreDescription(e.target.value)}
            placeholder="Descripción de la tienda..."
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button onClick={handleCreateStore} className="w-full sm:flex-1 h-10">
              Crear Tienda
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              className="w-full sm:flex-1 h-10"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Detalles y Gestión de Tienda */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedStore(null)
        }}
        title={`Gestión: ${selectedStore?.name}`}
      >
        {selectedStore && (
          <div className="space-y-6">
            {/* Info de la Tienda */}
            <div>
              <h3 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Información de la Tienda</h3>
              <p className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                <strong>Nombre:</strong> {selectedStore.name}
              </p>
              {selectedStore.description && (
                <p className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                  <strong>Descripción:</strong> {selectedStore.description}
                </p>
              )}
              <p className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                <strong>Total de Usuarios:</strong> {selectedStore.users.total}
              </p>
            </div>

            {/* Lista de Usuarios */}
            <div>
              <h3 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Usuarios de la Tienda</h3>
              {selectedStore.users.total === 0 ? (
                <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                  No hay usuarios en esta tienda
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedStore.users.userDetails.map((user: any) => (
                    <div
                      key={user._id}
                      className={`p-3 rounded-lg flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center sm:justify-between ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}
                    >
                      <div className="flex-1">
                        <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                          {user.name}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          {user.email}
                        </p>
                        <div className="flex gap-3 mt-1 text-xs">
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
                      <div className="flex gap-2 self-end sm:self-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setNewUserRole(user.role)
                            setShowUserModal(true)
                          }}
                        >
                          Editar
                        </Button>
                        {isSysAdmin() && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRemoveUser(user._id)}
                            disabled={user.role === 'sys_admin'}
                            className={`${user.role === 'sys_admin' ? 'opacity-50 cursor-not-allowed' : 'text-red-600'}`}
                            title={user.role === 'sys_admin' ? 'No se puede eliminar administradores del sistema' : 'Eliminar usuario'}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Control de visibilidad por tienda */}
            <div>
              <h3 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Eye size={16} className="inline mr-2" />
                Control de Visibilidad
              </h3>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeVisibilityControl[selectedStore._id] ?? false}
                    onChange={async (e) => {
                      const checked = e.target.checked
                      setVisibilityControlLoading(selectedStore._id)
                      try {
                        await storeSettingsService.updateAdminVisibilityControl(selectedStore._id, checked)
                        setStoreVisibilityControl(prev => ({ ...prev, [selectedStore._id]: checked }))
                        toast.success(checked
                          ? `Admin de "${selectedStore.name}" ahora puede gestionar visibilidad pública`
                          : `Solo SysAdmin puede gestionar visibilidad pública en "${selectedStore.name}"`
                        )
                      } catch (err: any) {
                        toast.error(err?.message || 'Error al actualizar configuración')
                      } finally {
                        setVisibilityControlLoading(null)
                      }
                    }}
                    disabled={visibilityControlLoading === selectedStore._id}
                    className={`mt-1 w-5 h-5 rounded border transition-colors cursor-pointer ${isDark
                      ? 'bg-slate-600 border-slate-500 checked:bg-purple-600'
                      : 'border-gray-300 checked:bg-purple-500'
                      }`}
                  />
                  <div className="flex-1">
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                      Permitir que Admin gestione visibilidad pública
                    </span>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Si está activado, el Admin de esta tienda podrá activar/desactivar
                      "Mostrar inventario en catálogo público". Si no, solo SysAdmin puede hacerlo.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => {
                setShowDetailModal(false)
                setSelectedStore(null)
              }}
              className="w-full"
            >
              Cerrar
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal: Editar Rol de Usuario */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false)
          setSelectedUser(null)
        }}
        title="Editar Rol del Usuario"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                {selectedUser.name}
              </p>
              <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                {selectedUser.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Nuevo Rol
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300'
                  }`}
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="analyst">Analyst</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button onClick={handleUpdateUserRole} className="w-full sm:flex-1 h-10">
                Actualizar Rol
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowUserModal(false)
                  setSelectedUser(null)
                }}
                className="w-full sm:flex-1 h-10"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default StoresPage
