import { useState } from 'react'
import { AlertTriangle, Send, CheckCircle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { publicCatalogService } from '@/services/public'

interface ReportDataModalProps {
    isOpen: boolean
    onClose: () => void
    item: {
        _id: string
        carModel: string
        series: string
        year: string
    }
}

const REPORT_TYPES = [
    { value: 'error_info', label: 'Error en la información', icon: '❌' },
    { value: 'missing_photo', label: 'Falta la foto', icon: '📷' },
    { value: 'wrong_photo', label: 'Foto incorrecta', icon: '🔄' },
    { value: 'other', label: 'Otro', icon: '📝' },
] as const

export default function ReportDataModal({ isOpen, onClose, item }: ReportDataModalProps) {
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    const [reportType, setReportType] = useState<string>('')
    const [note, setNote] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (!reportType) {
            setError('Selecciona un tipo de reporte')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            await publicCatalogService.submitDataReport({
                catalogItemId: item._id,
                carModel: item.carModel,
                series: item.series,
                year: item.year,
                reportType,
                note: note.trim()
            })
            setSubmitted(true)
        } catch {
            setError('Error al enviar el reporte. Intenta de nuevo.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleClose = () => {
        setReportType('')
        setNote('')
        setSubmitted(false)
        setError('')
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Reportar dato" maxWidth="md">
            {submitted ? (
                <div className="text-center py-8 space-y-4">
                    <CheckCircle size={48} className="mx-auto text-green-500" />
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ¡Reporte enviado!
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Gracias por ayudarnos a mejorar la información del catálogo.
                    </p>
                    <Button variant="primary" onClick={handleClose}>
                        Cerrar
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Item info reference */}
                    <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {item.carModel}
                        </p>
                        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                            {item.series} · {item.year}
                        </p>
                    </div>

                    {/* Report type selection */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            ¿Qué problema encontraste?
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {REPORT_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => { setReportType(type.value); setError('') }}
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${reportType === type.value
                                            ? isDark
                                                ? 'border-blue-500 bg-blue-900/30 text-white'
                                                : 'border-blue-500 bg-blue-50 text-slate-900'
                                            : isDark
                                                ? 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="text-lg">{type.icon}</span>
                                    <span className="text-sm font-medium">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note field */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Nota adicional (opcional)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={500}
                            rows={3}
                            placeholder="Describe el error que encontraste..."
                            className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${isDark
                                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500'
                                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {note.length}/500 caracteres
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertTriangle size={14} /> {error}
                        </p>
                    )}

                    {/* Submit button */}
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={handleClose} className="flex-1">
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={submitting || !reportType}
                            icon={<Send size={16} />}
                            className="flex-1"
                        >
                            {submitting ? 'Enviando...' : 'Enviar reporte'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    )
}
