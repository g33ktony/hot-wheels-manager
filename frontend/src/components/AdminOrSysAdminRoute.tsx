import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { Loading } from './common/Loading'

interface AdminOrSysAdminRouteProps {
    children: React.ReactNode
}

const AdminOrSysAdminRoute: React.FC<AdminOrSysAdminRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth()
    const { isSysAdmin, isAdmin } = usePermissions()

    if (isLoading) {
        return <Loading text="Verificando sesion..." fullScreen />
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (!isSysAdmin() && !isAdmin()) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

export default AdminOrSysAdminRoute
