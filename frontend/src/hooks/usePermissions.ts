import { useAuth } from '@/contexts/AuthContext'

export type Permission = 
  // Catalog permissions
  | 'catalog:view'
  | 'catalog:edit'
  | 'catalog:delete'
  | 'catalog:sync'
  
  // Inventory permissions
  | 'inventory:view'
  | 'inventory:create'
  | 'inventory:edit'
  | 'inventory:delete'
  
  // Sales permissions
  | 'sales:view'
  | 'sales:create'
  | 'sales:edit'
  | 'sales:delete'
  
  // Purchases permissions
  | 'purchases:view'
  | 'purchases:create'
  | 'purchases:edit'
  | 'purchases:delete'
  
  // Deliveries permissions
  | 'deliveries:view'
  | 'deliveries:create'
  | 'deliveries:edit'
  | 'deliveries:delete'
  
  // Reports permissions
  | 'reports:view'
  | 'reports:create'
  | 'reports:edit'
  | 'reports:delete'
  
  // Users permissions
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  
  // Settings permissions
  | 'settings:edit'
  | 'database:manage'

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  sys_admin: [
    'catalog:view', 'catalog:edit', 'catalog:delete', 'catalog:sync',
    'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete',
    'sales:view', 'sales:create', 'sales:edit', 'sales:delete',
    'purchases:view', 'purchases:create', 'purchases:edit', 'purchases:delete',
    'deliveries:view', 'deliveries:create', 'deliveries:edit', 'deliveries:delete',
    'reports:view', 'reports:create', 'reports:edit', 'reports:delete',
    'users:view', 'users:create', 'users:edit', 'users:delete',
    'settings:edit', 'database:manage'
  ],
  admin: [
    'catalog:view',
    'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete',
    'sales:view', 'sales:create', 'sales:edit', 'sales:delete',
    'purchases:view', 'purchases:create', 'purchases:edit', 'purchases:delete',
    'deliveries:view', 'deliveries:create', 'deliveries:edit', 'deliveries:delete',
    'reports:view', 'reports:create', 'reports:edit', 'reports:delete',
    'users:view', 'users:create', 'users:edit',
    'settings:edit'
  ],
  editor: [
    'catalog:view',
    'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete',
    'sales:view', 'sales:create', 'sales:edit', 'sales:delete',
    'purchases:view',
    'deliveries:view', 'deliveries:create',
    'reports:view'
  ],
  analyst: [
    'catalog:view',
    'inventory:view',
    'sales:view',
    'purchases:view',
    'deliveries:view',
    'reports:view', 'reports:create'
  ]
}

export const usePermissions = () => {
  const { user } = useAuth()

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false
    const permissions = ROLE_PERMISSIONS[user.role] || []
    return permissions.includes(permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false
    const userPerms = ROLE_PERMISSIONS[user.role] || []
    return permissions.some(p => userPerms.includes(p))
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!user) return false
    const userPerms = ROLE_PERMISSIONS[user.role] || []
    return permissions.every(p => userPerms.includes(p))
  }

  // Store-based access control
  const canAccessStore = (storeId: string): boolean => {
    if (!user) return false
    // sys_admin puede acceder a cualquier tienda (para lectura)
    if (user.role === 'sys_admin') return true
    // Otros roles solo su tienda
    return user.storeId === storeId
  }

  const canEditStore = (storeId: string): boolean => {
    if (!user) return false
    // Solo se puede editar la propia tienda (ni sys_admin puede editar otras)
    return user.storeId === storeId
  }

  const isSysAdmin = () => user?.role === 'sys_admin'
  const isAdmin = () => user?.role === 'admin'
  const isEditor = () => user?.role === 'editor'
  const isAnalyst = () => user?.role === 'analyst'

  return {
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessStore,
    canEditStore,
    isSysAdmin,
    isAdmin,
    isEditor,
    isAnalyst
  }
}
