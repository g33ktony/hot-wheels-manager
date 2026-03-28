# 🔐 Correcciones de Control de Acceso por Rol

## Problemas Identificados y Corregidos

### ✅ 1. "Gestión de Catálogo" Solo para Sysadmin
**Problema:** Los admins de tienda podían ver "Gestión de Catálogo" en el sidebar
**Solución:** Movido dentro del condicional `isSysAdmin()` en `Layout.tsx`
**Archivo:** `frontend/src/components/common/Layout.tsx`

### ✅ 2. "Catálogo Público" Solo para Sysadmin
**Problema:** Los admins de tienda tenían la tab/opción para mostrar su inventario en catálogo público
**Solución:** 
- Agregado condicional en las tabs de `StoreSettings.tsx`
- Import de `usePermissions` 
- La tab "🌍 Catálogo Público" solo aparece si `isSysAdmin() === true`
**Archivo:** `frontend/src/pages/StoreSettings.tsx`

### ✅ 3. Notificación de Usuarios Pendientes de Aprobación
**Problema:** El sysadmin no veía cuántos usuarios necesitaban aprobación
**Solución:**
- Creado nuevo hook `usePendingUsers.ts` que llama a GET `/api/users/pending`
- Helper `usePendingUsersCount()` retorna el total de usuarios pending
- Agregado badge en "Gestión de Usuarios" que muestra contador
- El endpoint ya existía en backend, solo faltaba la integración frontend
**Archivos:** 
- `frontend/src/hooks/usePendingUsers.ts` (nuevo)
- `frontend/src/components/common/Layout.tsx` (actualizado con import y call al hook)

## Cambios Específicos

### Layout.tsx
```typescript
// ANTES: Gestión de Catálogo aparecía para todos
{ name: '📋 Gestión de Catálogo', href: '/catalog', icon: Package },

// DESPUÉS: Dentro del condicional sys_admin
...(isSysAdmin() ? [
    { name: 'Leads', ... },
    { name: 'Reportes de Datos', ... },
    { name: 'Gestión de Usuarios', icon: Users, ...(pendingUsersCount > 0 && { badge: pendingUsersCount }) },
    { name: 'Administración de Tiendas', ... },
    { name: '📋 Gestión de Catálogo', href: '/catalog', icon: Package }
] : []),
```

### StoreSettings.tsx
```typescript
// ANTES: Todos los tabs se mostraban
{ id: 'public-catalog', label: '🌍 Catálogo Público' }

// DESPUÉS: Solo para sysadmin
...(isSysAdmin() ? [{ id: 'public-catalog', label: '🌍 Catálogo Público' }] : [])
```

### usePendingUsers.ts (Nuevo)
```typescript
export const usePendingUsersCount = () => {
  const { data } = usePendingUsers()
  return data?.stats?.totalPending || 0
}
```

## Testing Recomendado

1. **Como Sysadmin:**
   - ✅ Ver "Gestión de Catálogo" en sidebar
   - ✅ Ver "Catálogo Público" en StoreSettings
   - ✅ Ver badge de usuarios pendientes en "Gestión de Usuarios"

2. **Como Admin de Tienda:**
   - ❌ NO debe ver "Gestión de Catálogo" en sidebar
   - ❌ NO debe ver "Catálogo Público" en StoreSettings
   - ❌ NO debe ver "Gestión de Usuarios" en sidebar

3. **Notificación de Pendientes:**
   - Crear nuevo usuario sin aprobar
   - Badge en "Gestión de Usuarios" debe mostrar "1"
   - Aprobar usuario
   - Badge desaparece o actualiza el contador

## Commit
```
commit 19dc4f8
Fix role-based access control: Move catalog management to sys_admin only, 
hide public catalog from non-admins, add pending users notification
```

## Archivos Modificados
- ✏️ `frontend/src/components/common/Layout.tsx`
- ✏️ `frontend/src/pages/StoreSettings.tsx`
- ✨ `frontend/src/hooks/usePendingUsers.ts` (nuevo archivo)

## Sin Cambios Necesarios
- ✅ Backend: Los permisos RBAC ya estaban implementados correctamente
- ✅ Endpoints: `/api/users/pending` ya existe y funciona
- ✅ Middleware de autenticación: Ya valida roles correctamente
