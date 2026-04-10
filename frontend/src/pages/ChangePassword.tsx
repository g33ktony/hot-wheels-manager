import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'

export default function ChangePassword() {
    const navigate = useNavigate()
    const { token } = useAuth()
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const [loading, setLoading] = useState(false)
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    })

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.currentPassword) {
            newErrors.currentPassword = 'Contraseña actual es requerida'
        }

        if (!formData.newPassword) {
            newErrors.newPassword = 'Nueva contraseña es requerida'
        } else if (formData.newPassword.length < 6) {
            newErrors.newPassword = 'Mínimo 6 caracteres'
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Confirmación es requerida'
        } else if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden'
        }

        if (formData.currentPassword === formData.newPassword) {
            newErrors.newPassword = 'La nueva contraseña debe ser diferente'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                })
            })

            const data = await response.json()

            if (data.success) {
                toast.success('✅ Contraseña actualizada exitosamente')
                setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                })
                setTimeout(() => {
                    navigate('/dashboard')
                }, 1500)
            } else {
                toast.error(`❌ ${data.message || 'Error al cambiar contraseña'}`)
            }
        } catch (error) {
            toast.error('❌ Error de conexión')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }))
    }

    const pageBackdropClass = isDark
        ? 'bg-[radial-gradient(circle_at_12%_12%,rgba(16,185,129,0.14),transparent_35%),radial-gradient(circle_at_88%_8%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]'
        : 'bg-[radial-gradient(circle_at_10%_15%,rgba(56,189,248,0.14),transparent_35%),radial-gradient(circle_at_88%_12%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,#f5f8ff_0%,#e9eff8_100%)]'
    const surfaceClass = isDark
        ? 'rounded-2xl border border-slate-700/70 bg-slate-800/85 shadow-[12px_12px_24px_rgba(2,6,23,0.55),-10px_-10px_22px_rgba(51,65,85,0.2)]'
        : 'rounded-2xl border border-white/80 bg-[#eaf0f8] shadow-[12px_12px_24px_rgba(148,163,184,0.34),-12px_-12px_24px_rgba(255,255,255,0.96)]'
    const insetClass = isDark
        ? 'border border-slate-700/70 bg-slate-900/70 shadow-[inset_5px_5px_10px_rgba(2,6,23,0.65),inset_-4px_-4px_10px_rgba(51,65,85,0.2)]'
        : 'border border-white/90 bg-[#edf3fa] shadow-[inset_5px_5px_10px_rgba(148,163,184,0.24),inset_-5px_-5px_10px_rgba(255,255,255,0.92)]'

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${pageBackdropClass}`}>
            <div className={`p-8 w-full max-w-md ${surfaceClass}`}>
                <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Cambiar Contraseña</h1>
                <p className={`${isDark ? 'text-slate-300' : 'text-gray-600'} mb-6`}>Actualiza tu contraseña de forma segura</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Contraseña Actual */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Contraseña Actual
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.current ? 'text' : 'password'}
                                value={formData.currentPassword}
                                onChange={(e) => {
                                    setFormData({ ...formData, currentPassword: e.target.value })
                                    if (errors.currentPassword) {
                                        setErrors({ ...errors, currentPassword: '' })
                                    }
                                }}
                                className={`w-full px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.currentPassword ? 'border-red-500' : insetClass
                                    }`}
                                placeholder="Ingresa tu contraseña actual"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('current')}
                                className={`absolute right-3 top-2.5 ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {showPasswords.current ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.currentPassword && (
                            <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>
                        )}
                    </div>

                    {/* Nueva Contraseña */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Nueva Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={formData.newPassword}
                                onChange={(e) => {
                                    setFormData({ ...formData, newPassword: e.target.value })
                                    if (errors.newPassword) {
                                        setErrors({ ...errors, newPassword: '' })
                                    }
                                }}
                                className={`w-full px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.newPassword ? 'border-red-500' : insetClass
                                    }`}
                                placeholder="Ingresa nueva contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new')}
                                className={`absolute right-3 top-2.5 ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {showPasswords.new ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.newPassword && (
                            <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
                        )}
                    </div>

                    {/* Confirmar Contraseña */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            Confirmar Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={(e) => {
                                    setFormData({ ...formData, confirmPassword: e.target.value })
                                    if (errors.confirmPassword) {
                                        setErrors({ ...errors, confirmPassword: '' })
                                    }
                                }}
                                className={`w-full px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.confirmPassword ? 'border-red-500' : insetClass
                                    }`}
                                placeholder="Confirma tu nueva contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className={`absolute right-3 top-2.5 ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                        )}
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${insetClass} ${isDark ? 'text-slate-200' : 'text-gray-700'}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {loading ? 'Guardando...' : 'Actualizar Contraseña'}
                        </button>
                    </div>
                </form>

                {/* Consejos de seguridad */}
                <div className={`mt-6 p-4 rounded-lg ${insetClass}`}>
                    <h3 className={`font-semibold mb-2 ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>💡 Consejos de seguridad:</h3>
                    <ul className={`text-sm space-y-1 ${isDark ? 'text-slate-300' : 'text-blue-800'}`}>
                        <li>✓ Usa al menos 6 caracteres</li>
                        <li>✓ Combina letras, números y símbolos</li>
                        <li>✓ No reutilices contraseñas anteriores</li>
                        <li>✓ Mantén tu contraseña confidencial</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
