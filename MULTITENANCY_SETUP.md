# 🏪 Multi-Tenancy Implementation - Store Access Control

## Estructura de Tiendas (Núcleos)

Cada usuario pertenece a **UNA tienda**.

### Reglas de Acceso

#### **sys_admin**
- ✅ Puede **VER** datos de TODA las tiendas (para auditoría/supervisión)
- ❌ Solo puede **EDITAR** datos de su propia tienda
- ✅ Acceso total a gestión de usuarios
- ✅ Acceso total a database management

#### **admin**
- ✅ Puede VER y EDITAR su tienda
- ❌ NO puede ver otras tiendas

#### **editor**
- ✅ Puede VER y EDITAR su tienda
- ❌ NO puede ver otras tiendas

#### **analyst**
- ✅ Puede VER su tienda (read-only)
- ❌ NO puede ver otras tiendas

---

## Colecciones por Tienda

Todas estas colecciones tienen un campo `storeId` obligatorio:

```typescript
// Inventory & Catalog
- Inventory (inventarioItems)     ← Por tienda
- Customers (clientes)             ← Por tienda
- Suppliers (proveedores)          ← Por tienda

// Sales & Purchases
- Sales (ventas)                   ← Por tienda
- Purchases (compras)              ← Por tienda
- PresaleOrders (pre-ventas)       ← Por tienda

// Delivery & Logistics
- Deliveries (entregas)            ← Por tienda
- DeliveryLocations                ← Por tienda (puede ser global o por tienda)

// Store Management
- StoreSettings                    ← Por tienda
- Leads (leads)                    ← Por tienda

// NOT per-store (PÚBLICO GLOBAL):
- HotWheelsCars (catálogo)         ← GLOBAL, sin storeId
```

---

## Implementación

### Backend

#### 1. Modelo de Usuario Actualizado
```typescript
interface IUser extends Document {
  email: string
  password: string
  name: string
  role: 'sys_admin' | 'admin' | 'editor' | 'analyst'
  storeId: string  // ← NUEVO: cada usuario tiene una tienda
  createdAt: Date
  lastLogin?: Date
  permissions?: string[]
}
```

#### 2. JWT Token Incluye storeId
```typescript
const token = jwt.sign({
  userId: user._id,
  email: user.email,
  role: user.role,
  storeId: user.storeId  // ← NUEVO
}, SECRET, { expiresIn: '24h' })
```

#### 3. Middleware de Auth Actualizado
```typescript
// Middleware asigna a request:
req.user.storeId = decoded.storeId
req.storeId = decoded.storeId
```

#### 4. Utilidades de Acceso a Tienda
```typescript
// utils/storeAccess.ts

checkStoreAccess(userStoreId, targetStoreId, userRole) -> boolean
  // sys_admin: true para cualquier tienda
  // otros: solo su tienda

createStoreFilter(userStoreId, userRole) -> { storeId: userStoreId }
  // Para Mongoose queries
```

### Frontend

#### 1. AuthContext Actualizado
```typescript
interface User {
  id: string
  email: string
  name: string
  role: 'sys_admin' | 'admin' | 'editor' | 'analyst'
  storeId: string  // ← NUEVO
}
```

#### 2. Hook usePermissions Actualizado
```typescript
const { 
  user,
  hasPermission,
  canAccessStore,    // ← NUEVO
  canEditStore,      // ← NUEVO
  isSysAdmin,
  isAdmin,
  isEditor,
  isAnalyst
} = usePermissions()

// Uso:
if (canAccessStore('tienda123')) {
  // Ver datos de tienda123
}

if (canEditStore('tienda123')) {
  // Editar datos de tienda123
}
```

---

## Implementación en Endpoints

### Paso 1: Importar utilidades
```typescript
import { requireStoreAccessRead, requireStoreAccessWrite, createStoreFilter } from '@/utils/storeAccess'
```

### Paso 2: Proteger en rutas

```typescript
// Lectura: sys_admin puede ver todas las tiendas
router.get('/api/inventory/:storeId', 
  authMiddleware, 
  requireStoreAccessRead,    // Permite sys_admin ver todas
  getInventory
)

// Escritura: nadie puede editar otra tienda
router.patch('/api/inventory/:storeId/:id', 
  authMiddleware, 
  requireStoreAccessWrite,   // Solo su tienda
  requirePermission('inventory:edit'),
  updateInventory
)
```

### Paso 3: Filtrar queries en handlers

```typescript
const getInventory = async (req: Request, res: Response) => {
  const { storeId } = req.params
  
  // El middleware ya verificó acceso, ahora filtrar
  const filter = createStoreFilter(req.storeId!, req.userRole!)
  
  const items = await InventoryModel.find({
    ...filter,
    storeId: storeId
  })
  
  res.json(items)
}
```

---

## Estructura de Datos Ejemplo

### InventoryItem
```typescript
{
  _id: ObjectId,
  carId: string,
  storeId: "store_123",    // ← NUEVO
  toyNum: string,
  quantity: number,
  purchasePrice: number,
  suggestedPrice: number,
  actualPrice: number,
  condition: 'mint' | 'good' | 'fair' | 'poor',
  notes: string,
  photos: string[],
  location: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Customer
```typescript
{
  _id: ObjectId,
  storeId: "store_123",    // ← NUEVO
  name: string,
  email: string,
  phone: string,
  address: string,
  city: string,
  country: string,
  notes: string,
  createdAt: Date
}
```

### Sale
```typescript
{
  _id: ObjectId,
  storeId: "store_123",    // ← NUEVO
  customerId: ObjectId,
  items: [{
    inventoryId: ObjectId,
    quantity: number,
    price: number
  }],
  totalPrice: number,
  status: 'pending' | 'completed' | 'cancelled',
  createdAt: Date
}
```

---

## Ejemplos de Uso en Componentes

### Mostrar solo si pueden editar tienda
```typescript
const ItemDetail = ({ storeId }) => {
  const { canEditStore } = usePermissions()
  
  return (
    <>
      {canEditStore(storeId) && (
        <Button onClick={handleEdit}>Editar</Button>
      )}
    </>
  )
}
```

### Filtrar inventario por tienda del usuario
```typescript
const Inventory = () => {
  const { user } = usePermissions()
  
  // Si no es sys_admin, al menos filtrar por su tienda
  const tiendas = isSysAdmin ? 
    getAllStores() : 
    [user.storeId]
  
  return (
    <>
      {tiendas.map(tienda => (
        <InventoryView storeId={tienda} key={tienda} />
      ))}
    </>
  )
}
```

---

## Migración de Datos Existentes

```bash
# Asignar storeId a usuarios existentes
npm run assign-store-to-users

# Script que: 
# 1. Verifica cada usuario
# 2. Pide que seleccione su tienda
# 3. Asigna storeId
```

---

## Índices MongoDB Recomendados

```javascript
// Users
db.users.createIndex({ storeId: 1, role: 1 })
db.users.createIndex({ storeId: 1, email: 1 })

// Inventory
db.inventory.createIndex({ storeId: 1 })
db.inventory.createIndex({ storeId: 1, status: 1 })

// Customers
db.customers.createIndex({ storeId: 1 })
db.customers.createIndex({ storeId: 1, email: 1 })

// Sales
db.sales.createIndex({ storeId: 1 })
db.sales.createIndex({ storeId: 1, status: 1 })
db.sales.createIndex({ storeId: 1, createdAt: -1 })

// Deliveries
db.deliveries.createIndex({ storeId: 1 })
db.deliveries.createIndex({ storeId: 1, status: 1 })

// Leads
db.leads.createIndex({ storeId: 1 })
```

---

## Checklist de Implementación

```
Backend Models
  ✅ User.ts - agrega storeId
  [ ] Inventory model - agrega storeId
  [ ] Customer model - agrega storeId
  [ ] Sale model - agrega storeId
  [ ] Purchase model - agrega storeId
  [ ] Delivery model - agrega storeId
  [ ] StoreSettings model - agrega storeId
  [ ] Lead model - agrega storeId

Backend Auth
  ✅ auth.ts - agrega storeId a request
  ✅ authController.ts - incluye storeId en JWT
  ✅ storeAccess.ts - utilidades de acceso

Backend Routes
  [ ] Inventory routes - requireStoreAccessRead/Write
  [ ] Customer routes - requireStoreAccessRead/Write
  [ ] Sale routes - requireStoreAccessRead/Write
  [ ] Purchase routes - requireStoreAccessRead/Write
  [ ] Delivery routes - requireStoreAccessRead/Write
  [ ] StoreSettings routes - requireStoreAccessWrite

Backend Handling
  [ ] crear storeFilter en todos los controllers
  [ ] actualizar todas las queries

Frontend
  ✅ AuthContext - user.storeId
  ✅ usePermissions - canAccessStore, canEditStore
  [ ] Components - usar canAccessStore/canEditStore
  [ ] Routes - proteger por storeId

Database
  [ ] Agregar storeId a colecciones existentes
  [ ] Crear índices por storeId
```

---

## Próximas Fases

### Fase 1: Infraestructura (ESTA)
- [x] Agregar storeId a User model
- [x] Actualizar JWT para incluir storeId
- [x] Crear utilidades de acceso por tienda
- [ ] Migrar todos los modelos

### Fase 2: Endpoints
- [ ] Proteger todos los endpoints CRUD
- [ ] Agregar filtros por tienda

### Fase 3: Frontend
- [ ] Mostrar datos según tienda
- [ ] Permitir cambiar de tienda (si sys_admin)
- [ ] UI para seleccionar tienda

### Fase 4: Inventario Compartido (Futuro)
- [ ] Permitir que tiendas compartan inventario
- [ ] Sistema de reservas
- [ ] Transferencias entre tiendas

