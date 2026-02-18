# Plan de Implementación Multi-Tenancy - Hot Wheels Manager

## Estado Actual ✅
- **Infraestructura Base Completa**: User model con storeId, JWT con storeId, middleware updatado
- **Utilidades Creadas**: `storeAccess.ts` con helpers para verificar acceso
- **Frontend Listo**: `usePermissions()` hook con `canAccessStore()` y `canEditStore()`
- **Builds**: Backend y Frontend compilan sin errores

## Fases de Implementación

### FASE 1: Agregar storeId a Modelos de Datos (2-3 horas)

#### 1.1 Modelo: Inventory
**Archivo**: `backend/src/models/Inventory.ts`
```typescript
storeId: {
  type: String,
  required: true,
  index: true
}
```
- Agregar a schema
- Agregar index simple: `{ storeId: 1 }`
- Agregar index compuesto: `{ storeId: 1, status: 1 }`

#### 1.2 Modelo: Customer
**Archivo**: `backend/src/models/Customer.ts`
```typescript
storeId: {
  type: String,
  required: true,
  index: true
}
```
- Agregar a schema
- Agregar indexes: `{ storeId: 1 }`, `{ storeId: 1, status: 1 }`

#### 1.3 Modelo: Supplier
**Archivo**: `backend/src/models/Supplier.ts`
```typescript
storeId: {
  type: String,
  required: true,
  index: true
}
```
- Agregar a schema
- Agregar index: `{ storeId: 1 }`

#### 1.4 Modelo: Sale
**Archivo**: `backend/src/models/Sale.ts`
```typescript
storeId: {
  type: String,
  required: true,
  index: true
}
```
- Agregar a schema
- Agregar indexes: `{ storeId: 1 }`, `{ storeId: 1, saleDate: 1 }`

#### 1.5 Modelo: Purchase
**Archivo**: `backend/src/models/Purchase.ts`
```typescript
storeId: {
  type: String,
  required: true,
  index: true
}
```
- Agregar a schema
- Agregar indexes: `{ storeId: 1 }`, `{ storeId: 1, purchaseDate: 1 }`

#### 1.6 Modelo: Delivery
**Archivo**: `backend/src/models/Delivery.ts`
```typescript
storeId: {
  type: String,
  required: true,
  index: true
}
```
- Agregar a schema
- Agregar indexes: `{ storeId: 1 }`, `{ storeId: 1, deliveryDate: 1 }`

#### 1.7 Modelo: StoreSettings
**Archivo**: `backend/src/models/StoreSettings.ts`
```typescript
storeId: {
  type: String,
  required: true,
  unique: true,
  index: true
}
```
- Agregar a schema
- Este modelo tiene relación 1:1 con storeId (una tienda = una configuración)

#### 1.8 Modelo: Lead
**Archivo**: `backend/src/models/Lead.ts`
```typescript
storeId: {
  type: String,
  required: true,
  index: true
}
```
- Agregar a schema
- Agregar indexes: `{ storeId: 1 }`, `{ storeId: 1, status: 1 }`

**Nota**: NO modificar `HotWheelsCars.ts` - es un catálogo global sin storeId

---

### FASE 2: Migración de Datos Existentes (30-45 minutos)

#### 2.1 Crear Script de Migración
**Archivo a crear**: `backend/src/scripts/migrate-store-data.ts`

```typescript
import mongoose from 'mongoose';
import User from '../models/User';
import Inventory from '../models/Inventory';
import Customer from '../models/Customer';
import Supplier from '../models/Supplier';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import Delivery from '../models/Delivery';
import Lead from '../models/Lead';

async function migrateData() {
  try {
    console.log('🔄 Iniciando migración de datos...');
    
    // Obtener el primer admin/sys_admin para usarlo como storeId default
    const adminUser = await User.findOne({ role: 'sys_admin' });
    if (!adminUser || !adminUser.storeId) {
      throw new Error('No sys_admin user with storeId found!');
    }
    
    const defaultStoreId = adminUser.storeId;
    console.log(`📦 Usando Store ID por defecto: ${defaultStoreId}`);
    
    // Migrar Inventory
    const inventoryResult = await Inventory.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    );
    console.log(`✅ Inventory: ${inventoryResult.modifiedCount} documentos actualizados`);
    
    // Migrar Customer
    const customerResult = await Customer.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    );
    console.log(`✅ Customer: ${customerResult.modifiedCount} documentos actualizados`);
    
    // Migrar Supplier
    const supplierResult = await Supplier.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    );
    console.log(`✅ Supplier: ${supplierResult.modifiedCount} documentos actualizados`);
    
    // Migrar Sale
    const saleResult = await Sale.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    );
    console.log(`✅ Sale: ${saleResult.modifiedCount} documentos actualizados`);
    
    // Migrar Purchase
    const purchaseResult = await Purchase.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    );
    console.log(`✅ Purchase: ${purchaseResult.modifiedCount} documentos actualizados`);
    
    // Migrar Delivery
    const deliveryResult = await Delivery.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    );
    console.log(`✅ Delivery: ${deliveryResult.modifiedCount} documentos actualizados`);
    
    // Migrar Lead
    const leadResult = await Lead.updateMany(
      { storeId: { $exists: false } },
      { $set: { storeId: defaultStoreId } }
    );
    console.log(`✅ Lead: ${leadResult.modifiedCount} documentos actualizados`);
    
    console.log('\n✨ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

migrateData();
```

#### 2.2 Agregar Script a package.json
**Archivo**: `backend/package.json`
```json
{
  "scripts": {
    "migrate-store-data": "ts-node src/scripts/migrate-store-data.ts"
  }
}
```

#### 2.3 Ejecutar Migración
```bash
cd backend
npm run migrate-store-data
```

---

### FASE 3: Proteger Endpoints CRUD (2-3 horas)

#### 3.1 Patrón General para Todos los Controladores

**Ejemplo con inventoryController**:

```typescript
// En GET (listar)
router.get('/', auth, (req, res) => {
  const filter = createStoreFilter(req.storeId, req.userRole);
  Inventory.find(filter)
    .then(items => res.json(items))
    .catch(error => res.status(500).json({ error: error.message }));
});

// En GET by ID
router.get('/:id', auth, async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  
  // Verificar acceso de lectura
  if (!requireStoreAccessRead(req.storeId, item.storeId, req.userRole)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(item);
});

// En POST (crear)
router.post('/', auth, requireStoreAccessWrite, (req, res) => {
  const newItem = new Inventory({
    ...req.body,
    storeId: req.storeId // Asignar automáticamente storeId del usuario
  });
  newItem.save()
    .then(item => res.json(item))
    .catch(error => res.status(500).json({ error: error.message }));
});

// En PATCH (actualizar)
router.patch('/:id', auth, async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  
  // Verificar acceso de escritura
  if (!requireStoreAccessWrite(req.storeId, item.storeId, req.userRole)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  Object.assign(item, req.body);
  item.save()
    .then(updated => res.json(updated))
    .catch(error => res.status(500).json({ error: error.message }));
});

// En DELETE
router.delete('/:id', auth, async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  
  // Verificar acceso de escritura
  if (!requireStoreAccessWrite(req.storeId, item.storeId, req.userRole)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  await Inventory.deleteOne({ _id: req.params.id });
  res.json({ message: 'Deleted' });
});
```

#### 3.2 Controladores a Actualizar (EN ORDEN DE PRIORIDAD)

**ALTA PRIORIDAD** (uso más frecuente):
1. `inventoryController.ts` - CRÍTICO (donde más se usa)
2. `customerController.ts`
3. `saleController.ts`
4. `deliveryController.ts`

**MEDIA PRIORIDAD**:
5. `purchaseController.ts`
6. `supplierController.ts`
7. `leadController.ts`

**BAJA PRIORIDAD**:
8. `storeSettingsController.ts` (uso menos frecuente)

---

### FASE 4: Crear Índices en MongoDB (15-30 minutos)

#### 4.1 Crear Script de Índices
**Archivo a crear**: `backend/src/scripts/create-store-indexes.ts`

```typescript
import mongoose from 'mongoose';
import Inventory from '../models/Inventory';
import Customer from '../models/Customer';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import Delivery from '../models/Delivery';
import Lead from '../models/Lead';

async function createIndexes() {
  try {
    console.log('🔍 Creando índices para multi-tenancy...');
    
    // Inventory indexes
    await Inventory.collection.createIndex({ storeId: 1 });
    await Inventory.collection.createIndex({ storeId: 1, status: 1 });
    console.log('✅ Inventory indexes created');
    
    // Customer indexes
    await Customer.collection.createIndex({ storeId: 1 });
    await Customer.collection.createIndex({ storeId: 1, status: 1 });
    console.log('✅ Customer indexes created');
    
    // Sale indexes
    await Sale.collection.createIndex({ storeId: 1 });
    await Sale.collection.createIndex({ storeId: 1, saleDate: 1 });
    console.log('✅ Sale indexes created');
    
    // Purchase indexes
    await Purchase.collection.createIndex({ storeId: 1 });
    await Purchase.collection.createIndex({ storeId: 1, purchaseDate: 1 });
    console.log('✅ Purchase indexes created');
    
    // Delivery indexes
    await Delivery.collection.createIndex({ storeId: 1 });
    await Delivery.collection.createIndex({ storeId: 1, deliveryDate: 1 });
    console.log('✅ Delivery indexes created');
    
    // Lead indexes
    await Lead.collection.createIndex({ storeId: 1 });
    await Lead.collection.createIndex({ storeId: 1, status: 1 });
    console.log('✅ Lead indexes created');
    
    console.log('\n✨ Todos los índices creados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando índices:', error);
    process.exit(1);
  }
}

createIndexes();
```

#### 4.2 Ejecutar Script
```bash
cd backend
npm run create-indexes
```

---

### FASE 5: UI Frontend - Store Selection (1-2 horas)

#### 5.1 Crear Componente StoreSelector
**Archivo a crear**: `frontend/src/components/StoreSelector.tsx`

```typescript
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

export const StoreSelector = () => {
  const { user } = useAuth();
  const { isSysAdmin } = usePermissions();
  
  // Si no es sys_admin, no mostrar selector
  if (!isSysAdmin') {
    return null;
  }
  
  // TODO: Obtener lista de tiendas para sys_admin
  return (
    <div className="store-selector">
      {/* Dropdown para seleccionar tienda */}
    </div>
  );
};
```

#### 5.2 Integrar en Layout
- Mostrar tienda actual en header
- Si sys_admin: permitir cambiar de tienda
- Si no sys_admin: mostrar solo la tienda asignada

---

### FASE 6: Testing End-to-End (1 hora)

#### 6.1 Crear Test Users
```bash
npm run create-user  # Admin Store A
npm run create-user  # Admin Store B  
npm run create-user  # sys_admin
npm run create-user  # Editor Store A
```

#### 6.2 Test Cases
- [ ] Admin Store A puede ver/editar inventory Store A
- [ ] Admin Store A NO puede ver inventory Store B
- [ ] sys_admin puede VER todas las tiendas
- [ ] sys_admin NO puede EDITAR Store B (solo su propia)
- [ ] sys_admin puede VER datos de cualquier tienda
- [ ] Editor Store A limitado a su tienda

---

## Orden de Ejecución Recomendado

```
1. FASE 1: Agregar storeId a modelos (2-3 horas)
   └─ Actualizar 8 modelos de datos
   └─ Compilar y verificar sin errores

2. FASE 2: Migrar datos existentes (30-45 minutos)
   └─ Crear y ejecutar script de migración
   └─ Verificar que todos los docs tengan storeId

3. FASE 3: Proteger endpoints (2-3 horas)
   └─ Actualizar controladores por prioridad
   └─ Compilar y verificar sin errores

4. FASE 4: Crear índices (15-30 minutos)
   └─ Ejecutar script de índices
   └─ Opcional pero recomendado para performance

5. FASE 5: UI Frontend (1-2 horas)
   └─ Store selector para sys_admin
   └─ Display tienda actual

6. FASE 6: Testing (1-2 horas)
   └─ Crear usuarios de prueba
   └─ Verificar aislamiento de datos
```

**Tiempo Total Estimado**: 8-13 horas de trabajo

---

## Recordatorio - Cita del Usuario

> "yo como admin de mi tienda no puedo ver el inventario de otra tienda... Como sys admin puedo acceder a inventarios de todas las tiendas pero no editarlo solo el de la tienda a la que yo com sys admin esté ligado"

**Esto se logra con**:
- `createStoreFilter()`: Filtra datos visibles (READ)
- `requireStoreAccessWrite()`: Permite editar solo propia tienda (WRITE)
- sys_admin: puede LEER todas, ESCRIBIR solo su tienda
- otros roles: pueden LEER/ESCRIBIR solo su tienda
