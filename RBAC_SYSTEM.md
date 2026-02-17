# Sistema de Roles y Permisos - Documentación

## Estructura de Roles

El sistema implementa 4 niveles de acceso jerárquicos:

### 1. **sys_admin** (System Administrator - TÚ)
- ✅ Acceso total al sistema
- ✅ Gestión de usuarios
- ✅ Gestión de base de datos
- ✅ Configuración del sistema
- ✅ No se puede crear otro sys_admin desde UI (solo en BD)

**Permisos:**
```
catalog:view, catalog:edit, catalog:delete, catalog:sync,
inventory:view, inventory:create, inventory:edit, inventory:delete,
sales:view, sales:create, sales:edit, sales:delete,
purchases:view, purchases:create, purchases:edit, purchases:delete,
deliveries:view, deliveries:create, deliveries:edit, deliveries:delete,
reports:view, reports:create, reports:edit, reports:delete,
users:view, users:create, users:edit, users:delete,
settings:edit, database:manage
```

**Badge en UI:** 👑 SYS ADMIN (rojo)

---

### 2. **admin** (Account Administrator - Principal)
- ✅ Gestionar inventario, ventas, compras
- ✅ Crear/editar usuarios (pero no eliminarlos)
- ✅ Ver/editar reportes
- ✅ Administrar entregas
- ✅ Editar catálogo
- ✅ Configuración de tienda
- ❌ NO puede acceder a database management

**Permisos:**
```
catalog:view,
inventory:view, inventory:create, inventory:edit, inventory:delete,
sales:view, sales:create, sales:edit, sales:delete,
purchases:view, purchases:create, purchases:edit, purchases:delete,
deliveries:view, deliveries:create, deliveries:edit, deliveries:delete,
reports:view, reports:create, reports:edit, reports:delete,
users:view, users:create, users:edit,
settings:edit
```

**Badge en UI:** 🔐 ADMIN (naranja)

---

### 3. **editor** (Inventory Editor)
- ✅ Crear/editar/eliminar inventario
- ✅ Crear/editar ventas
- ✅ Ver compras y entregas
- ✅ Ver reportes
- ❌ NO puede eliminar ventas/entregas
- ❌ NO puede crear usuarios
- ❌ NO puede editar catálogo

**Permisos:**
```
catalog:view,
inventory:view, inventory:create, inventory:edit, inventory:delete,
sales:view, sales:create, sales:edit, sales:delete,
purchases:view,
deliveries:view, deliveries:create,
reports:view
```

---

### 4. **analyst** (Analytics User)
- ✅ Ver todo (read-only)
- ✅ Crear reportes
- ❌ NO puede modificar nada
- ❌ NO puede acceder a CRUD

**Permisos:**
```
catalog:view,
inventory:view,
sales:view,
purchases:view,
deliveries:view,
reports:view, reports:create
```

---

## Implementación Técnica

### Backend

#### 1. Modelo de Usuario Actualizado
**Archivo:** `backend/src/models/User.ts`

```typescript
interface IUser extends Document {
  email: string
  password: string
  name: string
  role: 'sys_admin' | 'admin' | 'editor' | 'analyst'
  createdAt: Date
  lastLogin?: Date
  permissions?: string[]
}
```

#### 2. Utilitarios de Permisos
**Archivo:** `backend/src/utils/rolePermissions.ts`

- `ROLE_PERMISSIONS` - Mapeo de rol → permisos
- `hasPermission(role, permission)` - Verificar un permiso
- `hasAnyPermission(role, permissions)` - Verificar cualquiera de varios
- `hasAllPermissions(role, permissions)` - Verificar todos

#### 3. Middleware de Autorización
**Archivo:** `backend/src/middleware/authorization.ts`

```typescript
// Verificar permiso específico
router.patch('/edit/:id', 
  authMiddleware, 
  requirePermission('catalog:edit'), 
  handler
)

// Requerir sys_admin
router.post('/sync', 
  authMiddleware, 
  requireSysAdmin, 
  handler
)

// Requerir admin o superior
router.post('/users', 
  authMiddleware, 
  requireAdminOrHigher, 
  handler
)
```

#### 4. Middleware de Autenticación Actualizado
**Archivo:** `backend/src/middleware/auth.ts`

Ahora asigna a `req`:
- `req.userId` - ID del usuario
- `req.userRole` - Rol del usuario
- `req.userEmail` - Email del usuario

#### 5. Token JWT
El token JWT incluye el rol:

```typescript
const token = jwt.sign(
  {
    userId: user._id,
    email: user.email,
    role: user.role  // ← Incluido aquí
  },
  JWT_SECRET,
  { expiresIn: '24h' }
)
```

---

### Frontend

#### 1. AuthContext Actualizado
**Archivo:** `frontend/src/contexts/AuthContext.tsx`

```typescript
interface User {
  id: string
  email: string
  name: string
  role: 'sys_admin' | 'admin' | 'editor' | 'analyst'
}
```

#### 2. Hook usePermissions
**Archivo:** `frontend/src/hooks/usePermissions.ts`

```typescript
const { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  isSysAdmin,
  isAdmin,
  isEditor,
  isAnalyst
} = usePermissions()

// Uso
if (hasPermission('catalog:edit')) {
  // Mostrar botón editar catálogo
}

if (isSysAdmin()) {
  // Mostrar solo para sys admin
}
```

#### 3. Uso en Componentes

**ItemDetail.tsx:**
```typescript
const { hasPermission } = usePermissions()
const canEditCatalog = hasPermission('catalog:edit')

{canEditCatalog && item && (
  <Button onClick={() => setShowEditCatalogModal(true)}>
    📝 Editar Catálogo
  </Button>
)}
```

**Layout.tsx:**
```typescript
const { isSysAdmin, isAdmin } = usePermissions()

{isSysAdmin() && <span>👑 SYS ADMIN</span>}
{isAdmin() && !isSysAdmin() && <span>🔐 ADMIN</span>}
```

---

## Crear Usuarios

### Opción 1: Script Interactivo (Recomendado)

```bash
npm run create-user
```

Esto te pide:
1. Email
2. Nombre
3. Contraseña
4. Seleccionar rol (1-4)

### Opción 2: Directamente en BD

```bash
# Conectar a MongoDB Atlas
mongosh "mongodb+srv://..."

db.users.insertOne({
  email: "admin@example.com",
  password: "$2a$10/...", // bcrypt hash
  name: "Admin User",
  role: "admin",
  createdAt: new Date(),
  permissions: []
})
```

---

## Migrations desde el Sistema Anterior

Si tenías usuarios con rol `'admin'` antes:

```bash
# Backend: Actualizar todos los 'admin' existentes
MongoDB:
db.users.updateMany(
  { role: "admin" },
  { $set: { role: "admin" } }  // Mantiene el mismo nombre, pero sin validación
)
```

---

## Rutas Protegidas

### Catálogo (requiere `catalog:edit`)
```
PATCH /api/hotwheels/edit/:toyNum
POST /api/hotwheels/update-catalog
```

### Usuarios (requiere `users:create` o `users:edit`)
```
POST /api/users
PATCH /api/users/:id
DELETE /api/users/:id
```

### Sistema (requiere `sys_admin`)
```
POST /api/database/backup
POST /api/database/restore
PATCH /api/settings/system
```

---

## Próximos Pasos para Completar

1. **Aplicar permisos a más rutas:**
   - Inventory CRUD
   - Sales CRUD
   - Purchases CRUD
   - Deliveries CRUD
   - Reports CRUD
   - Settings

2. **UI Permissions Guard:**
   - Ocultar tabs del sidebar según rol
   - Deshabilitar botones según permisos
   - Mensajes de error "Permission Denied"

3. **Auditoría:**
   - Log quién cambió qué (editar catálogo, usuarios, etc.)
   - Histórico de permisos

4. **Invitaciones:**
   - Admin puede invitar usuarios con enlace
   - Emails con instrucciones
   - Validación de rol al registrarse con link de invitación

---

## Verificación Actual

✅ Backend build successful
✅ Frontend build successful  
✅ System compila correctamente
✅ Se puede crear usuarios con `npm run create-user`
✅ Hook `usePermissions()` funciona
✅ Badge de admin en topbar funciona
✅ Botón "Editar Catálogo" solo aparece si tienes permiso

---

## Testing

### Test 1: Crear usuario sys_admin
```bash
cd backend
npm run create-user
# Selecciona opción 1 (sys_admin)
```

### Test 2: Verificar en UI
```bash
npm run dev
# Login con el usuario creado
# Debería ver badge 👑 SYS ADMIN en topbar
```

### Test 3: Editar Catálogo
```bash
# Login como admin
# Ir a cualquier item del catálogo
# Debería ver botón "📝 Editar Catálogo" (azul)
# Click debería abrir modal
```

###Test 4: Verificar token
```javascript
// En navegador console, después de login:
const user = JSON.parse(localStorage.getItem('user'))
console.log(user.role)  // Debería mostrar el rol
```
