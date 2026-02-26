import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function ChangePassword() {
    const navigate = useNavigate()
    const { token } = useAuth()
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Cambiar Contraseña</h1>
                <p className="text-gray-600 mb-6">Actualiza tu contraseña de forma segura</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Contraseña Actual */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="Ingresa tu contraseña actual"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('current')}
                                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.newPassword ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="Ingresa nueva contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new')}
                                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="Confirma tu nueva contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
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
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-medium transition"
                        >
                            {loading ? 'Guardando...' : 'Actualizar Contraseña'}
                        </button>
                    </div>
                </form>

                {/* Consejos de seguridad */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">💡 Consejos de seguridad:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
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
