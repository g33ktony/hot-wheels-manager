import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTheme } from '@/contexts/ThemeContext'
import { dataReportsApi, DataReport } from '@/services/dataReports'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import {
    Flag,
    CheckCircle,
    Clock,
    Eye,
    Trash2,
    AlertTriangle,
    Camera,
    Image,
    FileText,
    Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

const REPORT_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    error_info: { label: 'Error en información', icon: <AlertTriangle size={14} />, color: 'text-red-500' },
    missing_photo: { label: 'Falta foto', icon: <Camera size={14} />, color: 'text-yellow-500' },
    wrong_photo: { label: 'Foto incorrecta', icon: <Image size={14} />, color: 'text-orange-500' },
    other: { label: 'Otro', icon: <FileText size={14} />, color: 'text-blue-500' }
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pendiente', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    reviewed: { label: 'Revisado', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    resolved: { label: 'Resuelto', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' }
}

export default function DataReports() {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const queryClient = useQueryClient()

    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [selectedReport, setSelectedReport] = useState<DataReport | null>(null)
    const [adminNotes, setAdminNotes] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['data-reports', page, statusFilter, typeFilter],
        queryFn: () => dataReportsApi.getAll({
            page,
            limit: 20,
            status: statusFilter || undefined,
            reportType: typeFilter || undefined
        })
    })

    const updateMutation = useMutation(
        ({ id, data }: { id: string; data: { status?: string; adminNotes?: string } }) =>
            dataReportsApi.update(id, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['data-reports'])
                toast.success('Reporte actualizado')
                setSelectedReport(null)
            },
            onError: () => { toast.error('Error al actualizar') }
        }
    )

    const deleteMutation = useMutation(
        (id: string) => dataReportsApi.delete(id),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['data-reports'])
                toast.success('Reporte eliminado')
                setDeleteConfirm(null)
            },
            onError: () => { toast.error('Error al eliminar') }
        }
    )

    if (isLoading) {
        return <Loading text="Cargando reportes..." />
    }

    const reports = data?.reports || []
    const summary = data?.summary || { pending: 0, reviewed: 0, resolved: 0 }
    const totalPages = data?.totalPages || 1

    const handleStatusChange = (reportId: string, newStatus: string) => {
        updateMutation.mutate({ id: reportId, data: { status: newStatus } })
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Flag className="inline mr-2 mb-1" size={24} />
                        Reportes de Datos
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Reportes enviados por usuarios del catálogo público
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <div className="text-center p-3">
                        <Clock size={20} className="mx-auto text-yellow-500 mb-1" />
                        <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pendientes</p>
                    </div>
                </Card>
                <Card>
                    <div className="text-center p-3">
                        <Eye size={20} className="mx-auto text-blue-500 mb-1" />
                        <p className="text-2xl font-bold text-blue-600">{summary.reviewed}</p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Revisados</p>
                    </div>
                </Card>
                <Card>
                    <div className="text-center p-3">
                        <CheckCircle size={20} className="mx-auto text-green-500 mb-1" />
                        <p className="text-2xl font-bold text-green-600">{summary.resolved}</p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Resueltos</p>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <Filter size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                        className={`px-3 py-2 rounded-lg border text-sm ${isDark
                                ? 'bg-slate-700 border-slate-600 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                    >
                        <option value="">Todos los estados</option>
                        <option value="pending">Pendientes</option>
                        <option value="reviewed">Revisados</option>
                        <option value="resolved">Resueltos</option>
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                        className={`px-3 py-2 rounded-lg border text-sm ${isDark
                                ? 'bg-slate-700 border-slate-600 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                    >
                        <option value="">Todos los tipos</option>
                        <option value="error_info">Error en información</option>
                        <option value="missing_photo">Falta foto</option>
                        <option value="wrong_photo">Foto incorrecta</option>
                        <option value="other">Otro</option>
                    </select>
                </div>
            </Card>

            {/* Reports List */}
            {reports.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Flag size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                        <p className={`text-lg font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            No hay reportes
                        </p>
                        <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            {statusFilter || typeFilter ? 'Prueba cambiando los filtros' : 'Los reportes de los usuarios aparecerán aquí'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-3">
                    {reports.map((report: DataReport) => {
                        const typeInfo = REPORT_TYPE_LABELS[report.reportType] || REPORT_TYPE_LABELS.other
                        const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.pending

                        return (
                            <Card key={report._id}>
                                <div className="p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                        {/* Report Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                {/* Type badge */}
                                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${typeInfo.color}`}>
                                                    {typeInfo.icon} {typeInfo.label}
                                                </span>
                                                {/* Status badge */}
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bg}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>

                                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {report.carModel}
                                            </h3>
                                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {report.series} · {report.year}
                                            </p>

                                            {report.note && (
                                                <p className={`text-sm mt-2 p-2 rounded ${isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-50 text-slate-700'
                                                    }`}>
                                                    "{report.note}"
                                                </p>
                                            )}

                                            {report.adminNotes && (
                                                <p className={`text-xs mt-2 italic ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    Nota admin: {report.adminNotes}
                                                </p>
                                            )}

                                            <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {formatDate(report.createdAt)}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex sm:flex-col gap-2 flex-shrink-0">
                                            {report.status === 'pending' && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleStatusChange(report._id, 'reviewed')}
                                                    icon={<Eye size={14} />}
                                                >
                                                    Revisar
                                                </Button>
                                            )}
                                            {report.status === 'reviewed' && (
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleStatusChange(report._id, 'resolved')}
                                                    icon={<CheckCircle size={14} />}
                                                >
                                                    Resolver
                                                </Button>
                                            )}
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedReport(report)
                                                    setAdminNotes(report.adminNotes || '')
                                                }}
                                            >
                                                Notas
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => setDeleteConfirm(report._id)}
                                                icon={<Trash2 size={14} />}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Anterior
                    </Button>
                    <span className={`flex items-center px-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Página {page} de {totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Siguiente
                    </Button>
                </div>
            )}

            {/* Admin Notes Modal */}
            <Modal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                title={`Notas - ${selectedReport?.carModel || ''}`}
                maxWidth="md"
            >
                {selectedReport && (
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Estado
                            </label>
                            <select
                                value={selectedReport.status}
                                onChange={(e) => setSelectedReport({ ...selectedReport, status: e.target.value as DataReport['status'] })}
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark
                                        ? 'bg-slate-700 border-slate-600 text-white'
                                        : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                            >
                                <option value="pending">Pendiente</option>
                                <option value="reviewed">Revisado</option>
                                <option value="resolved">Resuelto</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Notas del admin
                            </label>
                            <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                rows={4}
                                placeholder="Escribe notas sobre este reporte..."
                                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${isDark
                                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500'
                                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setSelectedReport(null)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    updateMutation.mutate({
                                        id: selectedReport._id,
                                        data: { status: selectedReport.status, adminNotes }
                                    })
                                }}
                                className="flex-1"
                                disabled={updateMutation.isLoading}
                            >
                                {updateMutation.isLoading ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Eliminar reporte"
                maxWidth="sm"
            >
                <div className="space-y-4">
                    <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                        ¿Estás seguro de eliminar este reporte? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="flex-1">
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
                            className="flex-1"
                            disabled={deleteMutation.isLoading}
                        >
                            {deleteMutation.isLoading ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
