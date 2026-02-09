import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { publicService } from '@/services/public'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import toast from 'react-hot-toast'

interface LeadCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  interestedInItem?: {
    catalogId: string
    carModel: string
    requestType: 'availability' | 'notify'
  }
}

// Mexican estados
const ESTADOS = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
  'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos',
  'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo',
  'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas', 'Ciudad de México'
]

export default function LeadCaptureModal({
  isOpen,
  onClose,
  onSuccess,
  interestedInItem
}: LeadCaptureModalProps) {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    estado: '',
    municipio: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name || !formData.email || !formData.estado || !formData.municipio) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Email inválido')
      return
    }

    setLoading(true)

    try {
      // Get reCAPTCHA token
      // TODO: Descomentar cuando tengas las claves de reCAPTCHA configuradas
      /*
      const token = await window.grecaptcha.execute(
        import.meta.env.VITE_RECAPTCHA_SITE_KEY,
        { action: 'submit_lead' }
      )
      */
      const token = 'test-token' // Token temporal para pruebas

      // Submit lead
      await publicService.submitLead({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        estado: formData.estado,
        municipio: formData.municipio,
        interestedInItem,
        message: formData.message || undefined,
        recaptchaToken: token
      })

      toast.success('¡Gracias! Te contactaremos pronto.')
      onSuccess()
    } catch (error: any) {
      console.error('Error submitting lead:', error)
      const errorMessage = error.response?.data?.error || 'Error al enviar. Intenta de nuevo.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={interestedInItem?.requestType === 'notify' ? 'Notificarme cuando esté disponible' : 'Acceso al Catálogo'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Message */}
        {!interestedInItem && (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Para explorar nuestro catálogo completo y ver disponibilidad, por favor comparte tus datos de contacto.
          </p>
        )}

        {interestedInItem && (
          <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {interestedInItem.carModel}
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {interestedInItem.requestType === 'notify'
                ? 'Te avisaremos cuando este modelo esté disponible'
                : 'Consulta sobre disponibilidad inmediata'}
            </p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Juan Pérez"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="juan@email.com"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Teléfono (opcional)
          </label>
          <Input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="555-1234567"
          />
        </div>

        {/* Estado and Municipio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Estado <span className="text-red-500">*</span>
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 rounded-lg border ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
                } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            >
              <option value="">Selecciona...</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Municipio <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="municipio"
              value={formData.municipio}
              onChange={handleChange}
              placeholder="Ej: Monterrey"
              required
            />
          </div>
        </div>

        {/* Message (optional) */}
        {interestedInItem && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Mensaje adicional (opcional)
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Pregunta o comentario..."
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
                } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
          </div>
        )}

        {/* reCAPTCHA Notice */}
        {/* TODO: Descomentar cuando tengas las claves de reCAPTCHA configuradas */}
        {/*
        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          Este sitio está protegido por reCAPTCHA y aplican la{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            Política de Privacidad
          </a>{' '}
          y{' '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            Términos de Servicio
          </a>{' '}
          de Google.
        </p>
        */}

        {/* Submit Button */}
        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
