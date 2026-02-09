import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLeads, useLeadStatistics, useUpdateLead, useDeleteLead } from '@/hooks/useLeads'
import { leadsApi } from '@/services/leads'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  Download,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Bell
} from 'lucide-react'
import toast from 'react-hot-toast'

const ESTADOS = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
  'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos',
  'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo',
  'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas', 'Ciudad de México'
]

export default function Leads() {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedRequestType, setSelectedRequestType] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const limit = 20

  // Modals
  const [viewingLead, setViewingLead] = useState<any>(null)
  const [editingLead, setEditingLead] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    contactStatus: '',
    notes: ''
  })

  // Fetch leads and statistics
  const { data: leadsResponse, isLoading } = useLeads({
    page,
    limit,
    search: searchTerm,
    estado: selectedEstado,
    contactStatus: selectedStatus,
    requestType: selectedRequestType
  })

  const { data: statistics } = useLeadStatistics()
  const updateLeadMutation = useUpdateLead()
  const deleteLeadMutation = useDeleteLead()

  if (isLoading) {
    return <Loading text="Cargando leads..." />
  }

  const leads = leadsResponse?.data || []
  const pagination = leadsResponse?.pagination || { page: 1, totalPages: 1, total: 0 }

  // Debug: Log leads data to console
  console.log('📋 Leads data:', leads)
  console.log('📊 Leads with interestedInItem:', leads.filter((l: any) => l.interestedInItem).length)

  const handleEdit = (lead: any) => {
    setEditingLead(lead)
    setEditFormData({
      contactStatus: lead.contactStatus || 'new',
      notes: lead.notes || ''
    })
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLead) return

    try {
      await updateLeadMutation.mutateAsync({
        id: editingLead._id,
        data: editFormData
      })
      setEditingLead(null)
    } catch (error) {
      console.error('Error updating lead:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este lead?')) {
      try {
        await deleteLeadMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting lead:', error)
      }
    }
  }

  const handleExport = async () => {
    try {
      await leadsApi.exportLeads({
        estado: selectedEstado,
        contactStatus: selectedStatus
      })
      toast.success('Leads exportados correctamente')
    } catch (error) {
      console.error('Error exporting leads:', error)
      toast.error('Error al exportar leads')
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      new: { label: 'Nuevo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Clock },
      contacted: { label: 'Contactado', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: UserCheck },
      converted: { label: 'Convertido', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
      not_interested: { label: 'No Interesado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: XCircle }
    }
    const { label, color, icon: Icon } = config[status as keyof typeof config] || config.new
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        <Icon size={12} className="mr-1" />
        {label}
      </span>
    )
  }

  const getRequestTypeBadge = (type: string) => {
    if (type === 'notify') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <Bell size={12} className="mr-1" />
          Notificar
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle size={12} className="mr-1" />
        Disponible
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Gestión de Leads
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Administra los leads del catálogo público
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Download size={18} />}
          onClick={handleExport}
        >
          Exportar CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
                <Users className={`${isDark ? 'text-blue-200' : 'text-blue-600'}`} size={24} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Total Leads
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {statistics.totalLeads}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900' : 'bg-green-100'}`}>
                <TrendingUp className={`${isDark ? 'text-green-200' : 'text-green-600'}`} size={24} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Últimos 7 Días
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {statistics.recentLeads}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-yellow-900' : 'bg-yellow-100'}`}>
                <Bell className={`${isDark ? 'text-yellow-200' : 'text-yellow-600'}`} size={24} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Notificaciones
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {statistics.notifyRequests}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-900' : 'bg-purple-100'}`}>
                <CheckCircle className={`${isDark ? 'text-purple-200' : 'text-purple-600'}`} size={24} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Convertidos
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {statistics.statusBreakdown.converted || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Buscar
            </label>
            <Input
              type="text"
              placeholder="Nombre, email, municipio..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Estado
            </label>
            <select
              value={selectedEstado}
              onChange={(e) => {
                setSelectedEstado(e.target.value)
                setPage(1)
              }}
              className={`w-full px-4 py-2 rounded-lg border ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
                } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            >
              <option value="">Todos</option>
              {ESTADOS.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Status de Contacto
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setPage(1)
              }}
              className={`w-full px-4 py-2 rounded-lg border ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
                } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            >
              <option value="">Todos</option>
              <option value="new">Nuevo</option>
              <option value="contacted">Contactado</option>
              <option value="converted">Convertido</option>
              <option value="not_interested">No Interesado</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Tipo de Solicitud
            </label>
            <select
              value={selectedRequestType}
              onChange={(e) => {
                setSelectedRequestType(e.target.value)
                setPage(1)
              }}
              className={`w-full px-4 py-2 rounded-lg border ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
                } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            >
              <option value="">Todos</option>
              <option value="availability">Disponibilidad</option>
              <option value="notify">Notificar</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Leads Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className={isDark ? 'bg-slate-800' : 'bg-slate-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Contacto
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Ubicación
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Item de Interés
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Fecha
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-slate-800' : 'bg-white'} divide-y divide-slate-200 dark:divide-slate-700`}>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No se encontraron leads
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => (
                  <tr key={lead._id} className={isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {lead.name}
                      </div>
                      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <div className="flex items-center mt-1">
                          <Mail size={12} className="mr-1" />
                          {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="flex items-center mt-1">
                            <Phone size={12} className="mr-1" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
                        <div className="flex items-center">
                          <MapPin size={12} className="mr-1" />
                          {lead.estado}
                        </div>
                        <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {lead.municipio}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {lead.interestedInItem && lead.interestedInItem.carModel ? (
                        <div>
                          <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {lead.interestedInItem.carModel}
                          </div>
                          <div className="mt-1">
                            {getRequestTypeBadge(lead.interestedInItem.requestType)}
                          </div>
                          {lead.interestedInItem.catalogId && (
                            <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              ID: {lead.interestedInItem.catalogId.slice(-8)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className={`text-sm italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Sin item específico
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(lead.contactStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
                        {new Date(lead.registeredAt).toLocaleDateString('es-MX')}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {new Date(lead.registeredAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewingLead(lead)}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`}
                          title="Ver detalles"
                        >
                          <Eye size={16} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
                        </button>
                        <button
                          onClick={() => handleEdit(lead)}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`}
                          title="Editar"
                        >
                          <Edit2 size={16} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
                        </button>
                        <button
                          onClick={() => handleDelete(lead._id)}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-900' : 'hover:bg-red-100'}`}
                          title="Eliminar"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Mostrando página {pagination.page} de {pagination.totalPages} ({pagination.total} leads)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* View Lead Modal */}
      {viewingLead && (
        <Modal
          isOpen={!!viewingLead}
          onClose={() => setViewingLead(null)}
          title="Detalles del Lead"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nombre
                </label>
                <p className={isDark ? 'text-white' : 'text-slate-900'}>{viewingLead.name}</p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email
                </label>
                <p className={isDark ? 'text-white' : 'text-slate-900'}>{viewingLead.email}</p>
              </div>
              {viewingLead.phone && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Teléfono
                  </label>
                  <p className={isDark ? 'text-white' : 'text-slate-900'}>{viewingLead.phone}</p>
                </div>
              )}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Estado
                </label>
                <p className={isDark ? 'text-white' : 'text-slate-900'}>{viewingLead.estado}</p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Municipio
                </label>
                <p className={isDark ? 'text-white' : 'text-slate-900'}>{viewingLead.municipio}</p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Status
                </label>
                {getStatusBadge(viewingLead.contactStatus)}
              </div>
            </div>

            {viewingLead.interestedInItem && viewingLead.interestedInItem.carModel && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Item de Interés
                </label>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {viewingLead.interestedInItem.carModel}
                  </p>
                  {viewingLead.interestedInItem.catalogId && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Catalog ID: {viewingLead.interestedInItem.catalogId}
                    </p>
                  )}
                  <div className="mt-2 flex items-center space-x-2">
                    {getRequestTypeBadge(viewingLead.interestedInItem.requestType)}
                    {viewingLead.interestedInItem.requestType === 'notify' && (
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        • Quiere ser notificado cuando esté disponible
                      </span>
                    )}
                    {viewingLead.interestedInItem.requestType === 'availability' && (
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        • Consultó sobre disponibilidad inmediata
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(!viewingLead.interestedInItem || !viewingLead.interestedInItem.carModel) && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Item de Interés
                </label>
                <div className={`p-4 rounded-lg border-2 border-dashed ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-300'}`}>
                  <p className={`text-sm italic text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Este lead solo proporcionó sus datos para acceder al catálogo, sin interés específico en algún item.
                  </p>
                </div>
              </div>
            )}

            {viewingLead.message && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mensaje
                </label>
                <p className={`p-4 rounded-lg ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  {viewingLead.message}
                </p>
              </div>
            )}

            {viewingLead.notes && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Notas Internas
                </label>
                <p className={`p-4 rounded-lg ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  {viewingLead.notes}
                </p>
              </div>
            )}

            {viewingLead.viewedItems && viewingLead.viewedItems.length > 0 && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Items Vistos ({viewingLead.viewedItems.length})
                </label>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'} max-h-40 overflow-y-auto`}>
                  {viewingLead.viewedItems.map((item: any, idx: number) => (
                    <div key={idx} className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                      • {item.carModel}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className={`block font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Fecha de Registro
                </label>
                <p className={isDark ? 'text-white' : 'text-slate-900'}>
                  {new Date(viewingLead.registeredAt).toLocaleString('es-MX')}
                </p>
              </div>
              {viewingLead.lastContactedAt && (
                <div>
                  <label className={`block font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Último Contacto
                  </label>
                  <p className={isDark ? 'text-white' : 'text-slate-900'}>
                    {new Date(viewingLead.lastContactedAt).toLocaleString('es-MX')}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="secondary" onClick={() => setViewingLead(null)}>
              Cerrar
            </Button>
          </div>
        </Modal>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <Modal
          isOpen={!!editingLead}
          onClose={() => setEditingLead(null)}
          title="Editar Lead"
          maxWidth="md"
        >
          <form onSubmit={handleUpdateSubmit}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Status de Contacto
                </label>
                <select
                  value={editFormData.contactStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, contactStatus: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                >
                  <option value="new">Nuevo</option>
                  <option value="contacted">Contactado</option>
                  <option value="converted">Convertido</option>
                  <option value="not_interested">No Interesado</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Notas Internas
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={4}
                  placeholder="Agrega notas sobre este lead..."
                  className={`w-full px-4 py-2 rounded-lg border ${isDark
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingLead(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={updateLeadMutation.isLoading}
              >
                {updateLeadMutation.isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
