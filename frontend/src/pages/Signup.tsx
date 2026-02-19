import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { Lock, Mail, Car, User, Phone } from 'lucide-react'

const Signup: React.FC = () => {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        phone: ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validaciones
        if (!formData.email || !formData.password || !formData.name) {
            toast.error('Por favor completa los campos requeridos')
            return
        }

        if (formData.password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email.toLowerCase().trim(),
                    password: formData.password,
                    name: formData.name.trim(),
                    phone: formData.phone.trim() || undefined
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Error al registrarse')
            }

            toast.success('¡Registro exitoso! El administrador revisará tu solicitud.')

            // Redirigir a login después de 2 segundos
            setTimeout(() => {
                navigate('/login')
            }, 2000)
        } catch (error) {
            console.error('Signup error:', error)
            toast.error(error instanceof Error ? error.message : 'Error al registrarse')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-8">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="bg-blue-600 p-4 rounded-full">
                        <Car className="w-12 h-12 text-white" />
                    </div>
                </div>

                {/* Título */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Crear Cuenta
                    </h1>
                    <p className="text-slate-400">
                        Regístrate para comenzar a trabajar
                    </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nombre */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                            Nombre completo *
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Tu nombre"
                                className="pl-10"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                            Email *
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="tu@email.com"
                                className="pl-10"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                            Teléfono
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                id="phone"
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1234567890"
                                className="pl-10"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Contraseña */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                            Contraseña *
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Mínimo 6 caracteres"
                                className="pl-10"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Confirmar Contraseña */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                            Confirmar contraseña *
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                id="confirmPassword"
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirma tu contraseña"
                                className="pl-10"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 mb-6">
                        <p className="text-sm text-blue-200">
                            <strong>ℹ️ Importante:</strong> Tu cuenta será revisada por el administrador. Una vez aprobada, podrás iniciar sesión.
                        </p>
                    </div>

                    {/* Botón */}
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoading ? 'Registrando...' : 'Crear Cuenta'}
                    </Button>
                </form>

                {/* Link a login */}
                <div className="mt-6 text-center">
                    <p className="text-slate-400">
                        ¿Ya tienes cuenta?{' '}
                        <button
                            onClick={() => navigate('/login')}
                            className="text-blue-500 hover:text-blue-400 font-medium"
                        >
                            Inicia sesión
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Signup
