# Análisis: Sistema Multi-Tenant para Hot Wheels Manager

## 📋 Resumen Ejecutivo

**Complejidad General: MEDIA-ALTA** (6-8 semanas de desarrollo)

Es totalmente viable implementar un sistema multi-usuario con bases de datos independientes, pero requiere cambios arquitectónicos significativos. A continuación, el análisis detallado.

---

## 🎯 Requerimientos Identificados

1. **Registro de Usuarios**
   - Página de registro pública
   - Validación de email
   - Contraseñas seguras

2. **Sistema de Aprobación**
   - Panel de admin para ver solicitudes pendientes
   - Botón "Aprobar/Rechazar" usuario
   - Notificaciones al usuario (email opcional)

3. **Gestión de Suscripciones**
   - Estado: pendiente → activo → inactivo → expirado
   - Fecha de inicio/fin de suscripción
   - Recordatorios de pago (opcional)
   - Integración con pasarela de pago (futuro)

4. **Aislamiento de Datos (Multi-tenancy)**
   - Cada usuario tiene su propia "base de datos lógica"
   - Datos completamente independientes
   - Mismas características/funcionalidades
   - Sin posibilidad de ver datos de otros usuarios

---

## 🏗️ Arquitectura Propuesta

### Opción 1: Single Database + TenantId (RECOMENDADA)
**Complejidad: MEDIA**

```
┌─────────────────────────────────────────┐
│         MongoDB Database                │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ InventoryItems Collection         │ │
│  │  - _id                            │ │
│  │  - userId: "user123"  ← FILTRO   │ │
│  │  - carId, quantity, etc.          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Sales Collection                  │ │
│  │  - _id                            │ │
│  │  - userId: "user123"  ← FILTRO   │ │
│  │  - items, total, etc.             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Deliveries, Purchases, etc.       │ │
│  │  - userId: "user123"  ← FILTRO   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Ventajas:**
- ✅ Más económico (1 sola base de datos)
- ✅ Más fácil de mantener
- ✅ Backup único
- ✅ Mejor para analytics/reportes globales
- ✅ Escalable hasta miles de usuarios

**Desventajas:**
- ⚠️ Requiere SIEMPRE filtrar por userId (riesgo de fugas)
- ⚠️ Índices compuestos necesarios

### Opción 2: Database per Tenant (COMPLEJA)
**Complejidad: ALTA**

```
┌──────────────────────┐  ┌──────────────────────┐
│ DB: user_antonio     │  │ DB: user_juan        │
│  - inventory         │  │  - inventory         │
│  - sales             │  │  - sales             │
│  - deliveries        │  │  - deliveries        │
└──────────────────────┘  └──────────────────────┘
```

**Ventajas:**
- ✅ Aislamiento total garantizado
- ✅ Migración/backup por usuario
- ✅ Menos riesgo de fugas de datos

**Desventajas:**
- ❌ Más costoso (MongoDB Atlas cobra por DB)
- ❌ Complejo de mantener (migraciones múltiples)
- ❌ Difícil hacer analytics globales
- ❌ Límite de conexiones MongoDB

---

## 📊 Cambios Necesarios (Opción 1 - Recomendada)

### 1. Backend - Modelos (2-3 días)

#### User Model - Ampliado
```typescript
export interface IUser extends Document {
  email: string
  password: string
  name: string
  businessName?: string // Nombre del negocio
  role: 'admin' | 'user'
  status: 'pending' | 'active' | 'inactive' | 'suspended'
  subscriptionStartDate?: Date
  subscriptionEndDate?: Date
  subscriptionType?: 'monthly' | 'annual'
  approvedBy?: string // userId del admin que aprobó
  approvedAt?: Date
  createdAt: Date
  lastLogin?: Date
}
```

#### Todos los modelos existentes (15+ modelos)
- ✅ Agregar campo `userId: string` (requerido)
- ✅ Agregar índice compuesto: `{ userId: 1, ...otherFields }`
- ✅ Validación a nivel schema

**Modelos a modificar:**
- InventoryItem
- Sale
- Purchase
- Delivery
- Customer
- Supplier
- MarketPrice
- CustomBrand
- DeliveryLocation
- Box
- PendingItem
- etc.

### 2. Backend - Middleware (1 día)

#### Tenant Context Middleware
```typescript
// middleware/tenantContext.ts
export const tenantContext = (req, res, next) => {
  // Extraer userId del token JWT
  req.userId = req.user.id
  next()
}
```

#### Query Interceptor
```typescript
// Automáticamente agregar { userId } a todas las queries
mongoose.plugin((schema) => {
  schema.pre('find', function() {
    if (this.userId) {
      this.where({ userId: this.userId })
    }
  })
})
```

### 3. Backend - Controllers (3-5 días)

**TODOS los controllers necesitan cambios:**

Antes:
```typescript
const items = await InventoryItemModel.find()
```

Después:
```typescript
const items = await InventoryItemModel.find({ userId: req.userId })
```

**Nuevos controllers:**
- `userManagementController.ts` - Admin panel
- `registrationController.ts` - Registro público

### 4. Backend - Routes (1-2 días)

```typescript
// Rutas públicas (sin autenticación)
POST /api/auth/register - Registro de usuarios

// Rutas de admin (solo admin)
GET  /api/admin/pending-users - Ver solicitudes
POST /api/admin/approve-user/:id - Aprobar usuario
POST /api/admin/reject-user/:id - Rechazar usuario
GET  /api/admin/users - Listar todos los usuarios
PUT  /api/admin/users/:id/subscription - Actualizar suscripción

// Todas las rutas existentes
- Agregar tenantContext middleware
- Validar que solo accedan a SUS datos
```

### 5. Frontend - Context (2 días)

```typescript
// contexts/UserContext.tsx
interface UserContextType {
  user: User | null
  isAdmin: boolean
  subscription: {
    isActive: boolean
    expiresAt: Date
    daysRemaining: number
  }
}
```

### 6. Frontend - Páginas Nuevas (3-4 días)

```
/register - Página de registro
/admin/users - Panel de gestión de usuarios (solo admin)
/admin/pending - Solicitudes pendientes (solo admin)
/subscription - Estado de suscripción del usuario
```

### 7. Frontend - Modificaciones (2-3 días)

- Agregar botón "Registrarse" en login
- Badge de estado de suscripción en navbar
- Mensaje cuando suscripción está por vencer
- Bloquear acceso si suscripción expiró

---

## 🔐 Seguridad Crítica

### Validaciones Obligatorias

1. **Middleware de Tenant**
```typescript
// SIEMPRE verificar que userId del token coincida
if (req.params.id) {
  const resource = await Model.findById(req.params.id)
  if (resource.userId !== req.userId) {
    throw new Error('Unauthorized')
  }
}
```

2. **Índices Únicos Compuestos**
```typescript
// CustomBrand no puede repetirse POR USUARIO
schema.index({ userId: 1, name: 1 }, { unique: true })
```

3. **Tests de Aislamiento**
```typescript
// Test: Usuario A NO puede ver datos de Usuario B
it('should not access other user data', async () => {
  const userAData = await api.get('/inventory', { token: userAToken })
  const userBData = await api.get('/inventory', { token: userBToken })
  expect(userAData).not.toContain(userBData)
})
```

---

## 💰 Costos Estimados

### MongoDB Atlas
- **Plan Actual (M0 Free)**: 512MB - Suficiente para 5-10 usuarios
- **M2 Shared**: $9/mes - Suficiente para 50-100 usuarios
- **M10 Dedicated**: $57/mes - Suficiente para 500+ usuarios

### Desarrollo
- **Tiempo**: 6-8 semanas (1 desarrollador)
- **Fases**:
  - Fase 1 (2 semanas): Backend - Modelos + Auth
  - Fase 2 (2 semanas): Backend - Controllers + Routes
  - Fase 3 (2 semanas): Frontend - UI + Context
  - Fase 4 (1-2 semanas): Testing + Seguridad

---

## 📈 Plan de Implementación Sugerido

### Fase 1: MVP (2-3 semanas)
- [ ] Modelo de User ampliado
- [ ] Sistema de registro
- [ ] Panel admin básico (aprobar/rechazar)
- [ ] Agregar userId a 3-4 modelos principales (Inventory, Sales, Deliveries)
- [ ] Middleware de tenant context
- [ ] Frontend: Registro + Panel admin básico

### Fase 2: Multi-tenancy Completo (2-3 semanas)
- [ ] Agregar userId a TODOS los modelos
- [ ] Actualizar TODOS los controllers
- [ ] Tests de aislamiento
- [ ] Migración de datos existentes (asignar a tu usuario)

### Fase 3: Suscripciones (1-2 semanas)
- [ ] Modelo de suscripción
- [ ] Lógica de expiración
- [ ] UI para gestión de suscripciones
- [ ] Notificaciones de vencimiento

### Fase 4: Pagos (Futuro)
- [ ] Integración con Stripe/PayPal/MercadoPago
- [ ] Webhooks de pago
- [ ] Facturación automática

---

## ⚠️ Riesgos y Consideraciones

### Riesgos Técnicos
1. **Fuga de datos**: Si olvidas filtrar por userId en alguna query
2. **Performance**: Índices compuestos pueden afectar queries
3. **Migraciones**: Datos actuales necesitan userId asignado
4. **Testing**: Necesitas tests exhaustivos de aislamiento

### Mitigaciones
- ✅ Middleware global que SIEMPRE agregue filtro
- ✅ Tests automatizados de aislamiento
- ✅ Code review obligatorio para queries
- ✅ Auditoría de acceso a datos

### Datos Actuales
```typescript
// Script de migración necesario
await InventoryItemModel.updateMany(
  { userId: { $exists: false } },
  { $set: { userId: 'TU_USER_ID_ADMIN' } }
)
```

---

## 🎨 Mockups UI Sugeridos

### 1. Página de Registro
```
┌─────────────────────────────────────┐
│   Hot Wheels Manager                │
│                                     │
│   Crear Cuenta                      │
│   ┌───────────────────────────┐   │
│   │ Nombre Completo            │   │
│   ├───────────────────────────┤   │
│   │ Nombre del Negocio         │   │
│   ├───────────────────────────┤   │
│   │ Email                      │   │
│   ├───────────────────────────┤   │
│   │ Contraseña                 │   │
│   └───────────────────────────┘   │
│                                     │
│   [Registrarse]                     │
│                                     │
│   ¿Ya tienes cuenta? [Inicia sesión]│
└─────────────────────────────────────┘
```

### 2. Panel Admin - Solicitudes Pendientes
```
┌──────────────────────────────────────────┐
│ Solicitudes Pendientes (3)               │
├──────────────────────────────────────────┤
│ Juan Pérez                               │
│ Tienda: "Hot Wheels México"              │
│ Email: juan@example.com                  │
│ Fecha: 8 oct 2025                        │
│ [Aprobar] [Rechazar]                     │
├──────────────────────────────────────────┤
│ María García                             │
│ Tienda: "Colección de Autos"            │
│ Email: maria@example.com                 │
│ Fecha: 7 oct 2025                        │
│ [Aprobar] [Rechazar]                     │
└──────────────────────────────────────────┘
```

### 3. Badge de Suscripción (Navbar)
```
┌────────────────────────────────────┐
│ Hot Wheels Manager                 │
│                                    │
│ [Dashboard] [Inventory] [Sales]    │
│                                    │
│ Suscripción: ✅ Activa (28 días)  │
│ Antonio • [Cerrar Sesión]          │
└────────────────────────────────────┘
```

---

## 🚦 Recomendación Final

### ✅ SI implementar si:
- Planeas tener 5+ usuarios de pago
- Puedes dedicar 6-8 semanas al desarrollo
- Tienes presupuesto para MongoDB (desde $9/mes)
- Necesitas escalabilidad a futuro

### ⚠️ CONSIDERAR alternativa si:
- Solo serás tú usando la app por ahora
- Prefieres monetizar de otra forma (consultoría, venta de datos)
- No tienes tiempo para desarrollo extenso

### 📝 Alternativa Rápida (2 semanas)
Si quieres algo más simple:
- Sistema de registro con aprobación manual
- TODOS los usuarios comparten misma vista de datos
- Solo control de quién puede login (whitelist)
- Sin aislamiento de datos

---

## 🎯 Siguiente Paso Sugerido

Si decides implementar el sistema completo, te sugiero:

1. **Crear un branch de feature**: `git checkout -b feature/multi-tenant`
2. **Empezar con Fase 1 (MVP)**
3. **Validar con usuarios beta** antes de continuar
4. **Iterar basado en feedback**

¿Quieres que empiece con la Fase 1 del MVP?

