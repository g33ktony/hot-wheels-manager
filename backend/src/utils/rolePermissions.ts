/**
 * Role-Based Access Control (RBAC) System
 * Define permissions for each role
 */

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

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  sys_admin: [
    // Full access to everything
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
    // Can manage inventory, sales, purchases, deliveries, users
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
    // Can manage inventory and sales
    'catalog:view',
    'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete',
    'sales:view', 'sales:create', 'sales:edit', 'sales:delete',
    'purchases:view',
    'deliveries:view', 'deliveries:create',
    'reports:view'
  ],
  
  analyst: [
    // Can only view reports and inventory
    'catalog:view',
    'inventory:view',
    'sales:view',
    'purchases:view',
    'deliveries:view',
    'reports:view', 'reports:create'
  ]
}

export function getUserPermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = getUserPermissions(role)
  return permissions.includes(permission)
}

export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  const userPerms = getUserPermissions(role)
  return permissions.some(p => userPerms.includes(p))
}

export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  const userPerms = getUserPermissions(role)
  return permissions.every(p => userPerms.includes(p))
}
