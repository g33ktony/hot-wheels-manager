# 📋 Flujo de Registro y Aprobación de Usuarios

## 🎯 Resumen

Este documento describe el flujo completo de cómo un nuevo usuario del público puede:
1. Crear una cuenta registrándose
2. Esperar aprobación del sys admin
3. Comenzar a trabajar en su tienda

---

## 📊 Diagrama del Flujo

```
┌─────────────────────────────────────────────────────────────┐
│ 1️⃣  PÚBLICO INTERESADO SIN CUENTA                          │
├─────────────────────────────────────────────────────────────┤
│ Navega a: /signup                                           │
│ Ve formulario con campos:                                   │
│  ✓ Nombre completo *                                        │
│  ✓ Email (único) *                                          │
│  ✓ Teléfono                                                 │
│  ✓ Contraseña (mín. 6 caracteres) *                        │
│  ✓ Confirmar contraseña *                                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
                    submit formulario
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND PROCESA                                             │
├─────────────────────────────────────────────────────────────┤
│ POST /api/auth/signup                                       │
│                                                              │
│ ✓ Validar campos requeridos                                 │
│ ✓ Validar formato email                                     │
│ ✓ Validar contraseña (6+ chars)                             │
│ ✓ Verificar email NO existe en BD                           │
│ ✓ Hashear contraseña con bcrypt                             │
│ ✓ Crear usuario con:                                        │
│   - status: "pending" ⏱️  (requiere aprobación)             │
│   - role: "admin" (default para nuevas tiendas)             │
│   - storeId: auto-generado (ej: email prefix)               │
│   - createdAt: fecha actual                                 │
│ ✓ Guardar en MongoDB                                        │
│                                                              │
│ Retorna: 201 Created                                        │
│ Mensaje: "Registro exitoso. Tu cuenta está pendiente..."    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2️⃣  USUARIO NUEVO INTENTA LOGIN                            │
├─────────────────────────────────────────────────────────────┤
│ Navega a: /login                                            │
│ Ingresa:                                                    │
│  - Email: nuevo@email.com                                   │
│  - Password: ••••••••                                       │
│                                                              │
│ RESULTADO: ❌ ERROR DE LOGIN                                │
│ Mensaje: "Tu cuenta está pendiente de aprobación..."        │
│                                                              │
│ Porque: El backend valida status="approved"                 │
│ en POST /api/auth/login antes de generar token             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3️⃣ SYS ADMIN REVISA SOLICITUDES                            │
├─────────────────────────────────────────────────────────────┤
│ Login como: antonio@hotwheels.com (sys_admin)               │
│ Navega a: /admin/users (en el menú)                         │
│ Ve filtros:                                                 │
│  - Pendientes ⏱️  (default)                                  │
│  - Aprobados ✅                                              │
│  - Rechazados ❌                                             │
│                                                              │
│ Ve tabla con usuarios pending:                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Usuario │ Email │ Tienda │ Estado │ Acciones        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Juan    │nuevo@ │juan_s │ ⏱️    │ [✅] [❌] [🗑️] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│ Opciones:                                                   │
│  ✅ APROBAR → Elije rol (admin/editor/analyst)              │
│  ❌ RECHAZAR → Explica razón                                │
│  🗑️ ELIMINAR → Borra completamente                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
            [SYS ADMIN HACE CLICK EN ✅]
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND APRUEBA USUARIO                                     │
├─────────────────────────────────────────────────────────────┤
│ PATCH /api/users/:id/approve                                │
│ Con body: { role: "admin" }                                 │
│                                                              │
│ Actualiza usuario:                                          │
│  - status: "pending" → "approved" ✅                         │
│  - approvedAt: fecha actual                                 │
│  - approvedBy: "antonio@hotwheels.com"                      │
│  - role: "admin"                                            │
│                                                              │
│ Retorna: 200 OK                                             │
│ Mensaje: "Usuario nuevo@email.com aprobado..."              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4️⃣  USUARIO APROBADO PUEDE INGRESAR                        │
├─────────────────────────────────────────────────────────────┤
│ Se va a /login nuevamente                                   │
│ Ingresa:                                                    │
│  - Email: nuevo@email.com                                   │
│  - Password: ••••••••                                       │
│                                                              │
│ RESULTADO: ✅ LOGIN EXITOSO                                 │
│                                                              │
│ Recibe:                                                     │
│  - Token JWT (válido 1 día)                                 │
│  - Datos del usuario:                                       │
│    - name: "Juan"                                           │
│    - email: "nuevo@email.com"                               │
│    - role: "admin"                                          │
│    - storeId: "juan_s"                                      │
│                                                              │
│ Se redirige a: /dashboard                                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5️⃣  USUARIO COMIENZA A TRABAJAR EN SU TIENDA               │
├─────────────────────────────────────────────────────────────┤
│ Dashboard muestra:                                          │
│  - Inventario vacío (es nuevo)                              │
│  - Puede crear artículos en su tienda                       │
│  - Puede ver sus ventas, entregas                           │
│  - Datos otros se crean en: storeId = "juan_s"              │
│                                                              │
│ En el sidebar ve (según su rol):                            │
│  - Dashboard                                                │
│  - Inventario                                               │
│  - Ventas                                                   │
│  - Compras                                                  │
│  - Entregas                                                 │
│  - Clientes                                                 │
│  - etc.                                                     │
│                                                              │
│ NO ve:                                                      │
│  - "Gestión de Usuarios" (solo sys_admin)                   │
│  - Otras tiendas (usuarios normales = acceso single tienda) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Seguridad y Validaciones

### En el Formul registro (/signup):
- ✅ Email es único en BD
- ✅ Validación de email format (RFC 5322 básico)
- ✅ Contraseña mínimo 6 caracteres
- ✅ Confirmación de contraseña coincide
- ✅ Campos requeridos: email, password, nombre

### En el Login:
- ✅ Contraseña hash con bcrypt
- ✅ Usuario NO puede ingresar si status !== "approved"
- ✅ Token JWT expira en 1 día
- ✅ Token contiene: userId, email, role, storeId

### En Gestión de Usuarios:
- ✅ Solo sys_admin puede aprobar/rechazar
- ✅ Solo sys_admin puede eliminar usuarios
- ✅ Sys admin puede asignar rol al aprobar
- ✅ Cada aprobación/rechazo es auditada (approvedBy, approvedAt)

---

## 🗄️ Estructura de Datos

### User Schema (MongoDB)
```typescript
{
  _id: ObjectId
  email: String (unique)
  password: String (hashed)
  name: String
  phone?: String
  role: 'sys_admin' | 'admin' | 'editor' | 'analyst'  (default: 'admin')
  storeId: String (refiere a la tienda del usuario)
  status: 'pending' | 'approved' | 'rejected'  (default: 'pending')
  approvedBy?: String (email de quien aprobó)
  approvedAt?: Date
  rejectionReason?: String (si fue rechazado)
  createdAt: Date
  lastLogin?: Date
  permissions?: [String]
}
```

### Índices importantes:
- `status: 1` - Para queries rápidas de usuarios pending
- `storeId: 1, status: 1` - Para ver usuarios por tienda y estado
- `email: 1` - Unique, para búsquedas rápidas

---

## 🔧 Endpoints Nuevos

### Registro Público
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "nuevo@example.com",
  "password": "miPassword123",
  "name": "Juan García",
  "phone": "+1234567890"
}

Respuesta 201:
{
  "success": true,
  "message": "Registro exitoso. Tu cuenta está pendiente de aprobación...",
  "data": {
    "user": {
      "id": "...",
      "email": "nuevo@example.com",
      "name": "Juan García",
      "storeId": "nuevo",
      "status": "pending"
    }
  }
}
```

### Lista de Usuarios (Gestión)
```http
GET /api/users?status=pending&role=admin&storeId=juan_s
Authorization: Bearer {token}

Respuesta 200:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "email": "nuevo@example.com",
      "name": "Juan García",
      "phone": "+1234567890",
      "role": "admin",
      "storeId": "juan_s",
      "status": "pending",
      "createdAt": "2026-02-18T20:33:38Z"
    }
  ]
}
```

### Obtener Usuarios Pending
```http
GET /api/users/pending
Authorization: Bearer {token}
(Solo sys_admin)

Respuesta 200:
{
  "success": true,
  "data": {
    "users": [...],
    "stats": {
      "totalPending": 2,
      "byStore": {
        "juan_s": 1,
        "maria_l": 1
      }
    }
  }
}
```

### Aprobar Usuario
```http
PATCH /api/users/:id/approve
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "admin"  // opcional, default: mantiene existente
}

Respuesta 200:
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "nuevo@example.com",
      "name": "Juan García",
      "role": "admin",
      "storeId": "juan_s",
      "status": "approved",
      "approvedAt": "2026-02-18T20:34:00Z"
    }
  },
  "message": "Usuario nuevo@example.com aprobado exitosamente"
}
```

### Rechazar Usuario
```http
PATCH /api/users/:id/reject
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "No cumple con los requisitos de negocio"
}

Respuesta 200:
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "nuevo@example.com",
      "status": "rejected",
      "rejectionReason": "No cumple con los requisitos..."
    }
  }
}
```

### Eliminar Usuario
```http
DELETE /api/users/:id
Authorization: Bearer {token}
(Solo sys_admin)

Respuesta 200:
{
  "success": true,
  "message": "Usuario nuevo@example.com eliminado exitosamente"
}
```

---

## 📄 Páginas Frontend

### 1. `/signup` - Registro Público
**Sin autenticación requerida**

Formulario con:
- Nombre completo *
- Email *
- Teléfono
- Contraseña *
- Confirmar contraseña *

Funcionalidad:
- Validación en cliente
- Submit a `/api/auth/signup`
- Mensaje de éxito: "Registro exitoso. El admin revisará tu solicitud."
- Link a login: "¿Ya tienes cuenta?"
- Redirección automática a /login después de 2 segundos

### 2. `/login` - Inicio de Sesión
**Sin autenticación requerida**

Nueva funcionalidad:
- Mensaje de error específico si status = "pending":
  - "Tu cuenta está pendiente de aprobación por el administrador"
- Mensaje de error si status = "rejected":
  - "Tu cuenta ha sido rechazada"
- **Link nuevo**: "¿No tienes cuenta? Crear una cuenta aquí" → `/signup`

### 3. `/admin/users` - Gestión de Usuarios
**Solo sys_admin (protegida)**

Interfaz:
- Búsqueda: Por nombre o email
- Filtros: Pendientes | Aprobados | Rechazados | Todos
- Tabla con columnas:
  - Usuario (nombre + teléfono)
  - Email
  - Tienda (storeId)
  - Estado (badge con color)
  - Acciones (botones)

Acciones por estado:
- **Pending**: 
  - ✅ Aprobar → modal con selector de rol
  - ❌ Rechazar → modal con campo de razón
  - 🗑️ Eliminar
- **Approved/Rejected**:
  - 🗑️ Eliminar

Modales:
- **Aprobar**: Seleccionar rol (admin/editor/analyst), botón confirmar
- **Rechazar**: Campo de razón, validar que no esté vacío

---

## 🔄 Flujo de Estados

```
Nuevo Usuario
    ↓
[Llena formulario signup]
    ↓
Usuario: status = "pending" ⏱️
    ↓
    ├→ [Sys Admin Aprueba] → status = "approved" ✅ → Puede login
    │
    └→ [Sys Admin Rechaza] → status = "rejected" ❌ → No puede login
          Con rejectionReason
```

---

## ✅ Checklist de Implementación

Backend:
- ✅ User model con campo status
- ✅ Endpoint POST /api/auth/signup
- ✅ Validación de aprobación en POST /api/auth/login
- ✅ Endpoint GET /api/users
- ✅ Endpoint GET /api/users/pending
- ✅ Endpoint PATCH /api/users/:id/approve
- ✅ Endpoint PATCH /api/users/:id/reject
- ✅ Endpoint DELETE /api/users/:id
- ✅ Script de migración de usuarios existentes

Frontend:
- ✅ Página /signup
- ✅ Link a signup en /login
- ✅ Página /admin/users
- ✅ Link a gestión de usuarios en sidebar (solo sys_admin)
- ✅ Compilación sin errores

Database:
- ✅ Migración de usuarios existentes a "approved"
- ✅ Índices apropiados

---

## 🚀 Cómo Probar

### Test 1: Registro nuevo usuario
1. Navega a `http://localhost:5173/signup`
2. Llena formulario:
   - Nombre: "Test User"
   - Email: "test@nuevaempresa.com"
   - Teléfono: "+1234567890"
   - Password: "password123"
3. Click "Crear Cuenta"
4. Ver mensaje: "Registro exitoso..."
5. Redirección a login automática

### Test 2: Intenta login sin aprobación
1. Navega a `/login`
2. Ingresa: `test@nuevaempresa.com` / `password123`
3. Ver error: "Tu cuenta está pendiente de aprobación..."
4. No recibe token JWT

### Test 3: Sys admin aprueba usuario
1. Login como: `antonio@hotwheels.com`
2. Click en "Gestión de Usuarios" (sidebar)
3. Ver usuario "Test User" en estado "Pendiente"
4. Click en botón verde (✅ Aprobar)
5. Modal: Selecciona "admin", click "Aprobar"
6. Confirmación: "Usuario test@nuevaempresa.com aprobado"
7. Usuario desaparece de tab "Pendientes"

### Test 4: Nuevo usuario puede ingresar
1. Navega a `/login`
2. Ingresa: `test@nuevaempresa.com` / `password123`
3. Login exitoso
4. Redirección a dashboard
5. Ve su tienda vacía (nueva)

### Test 5: Sys admin rechaza usuario (flow alternativo)
1. Login como sys_admin
2. Navega a `/admin/users`
3. Clic en botón rojo (❌ Rechazar) en usuario diferente
4. Modal: Escribe razón "No cumple con requisitos"
5. Click "Rechazar"
6. Usuario pasa a tab "Rechazados"
7. Usuario vuelve a intentar login
8. Error: "Tu cuenta ha sido rechazada"

---

## 💡 Notas Importantes

1. **Email es único**: No se puede registrar dos cuentas con el mismo email
2. **Store automática**: Cada usuario obtiene una tienda con ID = email prefix
3. **Rol default**: Nuevos usuarios tienen rol = "admin" (pueden editar su tienda)
4. **Sys Admin**: 
   - Tiene su propia tienda (sys-admin-store)
   - Puede leer data de todas las tiendas
   - Puede escribir solo en su tienda
   - Puede aprobar/rechazar nuevos usuarios
5. **Datos existentes**: Todos marcados como "approved" (migración)
6. **Auditoría**: Cada aprobación/rechazo registra quién y cuándo

---

## 🔮 Mejoras Futuras

1. **Email de notificación**: Enviar email cuando usuario es aprobado/rechazado
2. **Sistema de invitaciones**: Admin crea link especial para invitar usuarios
3. **Roles personalizados**: Permitir crear roles custom
4. **Auditoría completa**: Log de todas las acciones de admin
5. **2FA**: Autenticación de dos factores
6. **Social login**: OAuth con Google, Facebook
7. **Recuperación de contraseña**: Enviar reset link por email
