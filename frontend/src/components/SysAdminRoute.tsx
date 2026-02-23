import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'

interface SysAdminRouteProps {
    children: React.ReactNode
}

const SysAdminRoute: React.FC<SysAdminRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth()
    const { isSysAdmin } = usePermissions()

    // Mostrar loading mientras se verifica la autenticación
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando sesión...</p>
                </div>
            </div>
        )
    }

    // Redirigir a login si no está autenticado
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // Redirigir a dashboard si no es sys_admin
    if (!isSysAdmin()) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

export default SysAdminRoute
