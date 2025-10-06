# 🐛 Fix: Brand y PieceType no se guardaban en la base de datos

## Problema

Cuando se creaba una compra con `brand` y `pieceType`, y luego se marcaba como "recibida" para sincronizar automáticamente al inventario, los campos `brand` y `pieceType` **NO** aparecían en MongoDB. Esto causaba que:

1. ✅ Los items SÍ se agregaban al inventario
2. ❌ Pero los badges (Hot Wheels, Básico, TH, etc.) NO se mostraban
3. ❌ Al revisar MongoDB, los campos `brand` y `pieceType` no existían en los documentos

## Causa Raíz

El problema estaba en el **schema de Mongoose** del modelo `Purchase`, específicamente en `PurchaseItemSchema`.

### Schema ANTES (Incorrecto)
```typescript
// backend/src/models/Purchase.ts
const PurchaseItemSchema = new Schema<PurchaseItem>({
  carId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  condition: {
    type: String,
    required: true,
    enum: ['mint', 'good', 'fair', 'poor'],
    default: 'mint'
  }
  // ❌ Faltan 16+ campos!!!
}, { _id: false })
```

### Interface TypeScript (Correcta)
```typescript
// shared/types.ts
export interface PurchaseItem {
  carId: string;
  quantity: number;
  unitPrice: number;
  condition: 'mint' | 'good' | 'fair' | 'poor';
  // Brand and type fields
  brand?: string;                              // ✅ DEFINIDO en interface
  pieceType?: 'basic' | 'premium' | 'rlc';    // ✅ DEFINIDO en interface
  isTreasureHunt?: boolean;
  isSuperTreasureHunt?: boolean;
  isChase?: boolean;
  // Series fields
  seriesId?: string;
  seriesName?: string;
  // ... etc (20+ campos totales)
}
```

**¿Por qué TypeScript no se quejó?**
- El schema usaba `Schema<PurchaseItem>`, que indicaba a TypeScript "este schema implementa PurchaseItem"
- TypeScript confió en que el desarrollador definió correctamente el schema
- Pero en realidad, el schema solo tenía 4 de los 20+ campos

**¿Por qué MongoDB no guardaba los campos?**
- Mongoose **solo guarda campos que están definidos en el schema**
- Cuando el frontend enviaba:
  ```json
  {
    "carId": "HW123",
    "quantity": 1,
    "unitPrice": 50,
    "condition": "mint",
    "brand": "Hot Wheels",        // ❌ Descartado por Mongoose
    "pieceType": "basic"          // ❌ Descartado por Mongoose
  }
  ```
- Mongoose guardaba solo:
  ```json
  {
    "carId": "HW123",
    "quantity": 1,
    "unitPrice": 50,
    "condition": "mint"
    // brand y pieceType fueron ignorados
  }
  ```

## Flujo del Bug

1. **Frontend (Purchases.tsx)**
   - Usuario selecciona brand="Hot Wheels" y pieceType="basic"
   - `handleAddPurchase()` limpia los datos y envía al backend
   - ✅ Datos correctamente enviados con brand y pieceType

2. **Backend API recibe la compra**
   - Express recibe el JSON con todos los campos
   - ✅ req.body tiene brand y pieceType

3. **Mongoose guarda la compra**
   - Mongoose valida contra `PurchaseItemSchema`
   - ❌ Schema NO tiene definidos brand/pieceType
   - ❌ Mongoose **descarta** estos campos silenciosamente
   - MongoDB guarda compra SIN brand/pieceType

4. **Usuario marca compra como "recibida"**
   - Backend llama `addItemsToInventory(purchase)`
   - Lee `purchase.items` de MongoDB
   - ❌ `item.brand` es `undefined` (nunca se guardó)
   - ❌ `item.pieceType` es `undefined` (nunca se guardó)

5. **Backend crea item en inventario**
   ```typescript
   const newInventoryItem = new InventoryItemModel({
     brand: item.brand,      // ❌ undefined
     pieceType: item.pieceType,  // ❌ undefined
     // ...
   })
   ```
   - Inventory item se crea SIN brand/pieceType

6. **Frontend muestra inventario**
   - Badges verifican: `{item.brand && (<Badge>)}`
   - ❌ `item.brand` es `undefined`, badge NO se muestra

## Solución

Actualizar `PurchaseItemSchema` para incluir **TODOS** los campos de la interface `PurchaseItem`:

```typescript
// backend/src/models/Purchase.ts
const PurchaseItemSchema = new Schema<PurchaseItem>({
  carId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  condition: {
    type: String,
    required: true,
    enum: ['mint', 'good', 'fair', 'poor'],
    default: 'mint'
  },
  // ✅ Brand and type fields
  brand: { type: String },
  pieceType: { type: String, enum: ['basic', 'premium', 'rlc'] },
  isTreasureHunt: { type: Boolean, default: false },
  isSuperTreasureHunt: { type: Boolean, default: false },
  isChase: { type: Boolean, default: false },
  // ✅ Series fields
  seriesId: { type: String },
  seriesName: { type: String },
  seriesSize: { type: Number },
  seriesPosition: { type: Number },
  seriesPrice: { type: Number },
  // ✅ Photos and location
  photos: [{ type: String }],
  location: { type: String },
  notes: { type: String }
}, { _id: false })
```

## Verificación

Después de aplicar el fix:

### 1. Rebuild Backend
```bash
cd backend
npm run build
```

### 2. Redeploy a Railway
```bash
git push  # Railway auto-deploys desde main
```

### 3. Probar el flujo completo

**Paso 1: Crear compra**
1. Ir a "Compras"
2. Click "+ Nueva Compra"
3. Agregar item con:
   - Car ID: "HW-123"
   - Marca: "Hot Wheels"
   - Tipo: "Básico"
   - Quantity: 1
4. Guardar compra

**Paso 2: Verificar en MongoDB**
```javascript
db.purchases.findOne({ "items.carId": "HW-123" })
// ✅ Debe mostrar:
{
  items: [{
    carId: "HW-123",
    brand: "Hot Wheels",      // ✅ AHORA aparece
    pieceType: "basic",       // ✅ AHORA aparece
    // ...
  }]
}
```

**Paso 3: Marcar como recibida**
1. Cambiar status a "Recibida"
2. Verificar que items aparecen en Inventario

**Paso 4: Verificar inventario en MongoDB**
```javascript
db.inventoryitems.findOne({ carId: "HW-123" })
// ✅ Debe mostrar:
{
  carId: "HW-123",
  brand: "Hot Wheels",      // ✅ Sincronizado correctamente
  pieceType: "basic",       // ✅ Sincronizado correctamente
  // ...
}
```

**Paso 5: Verificar badges en UI**
1. Ir a "Inventario"
2. Buscar el item
3. ✅ Debe mostrar badge "Hot Wheels" (azul)
4. ✅ Debe mostrar badge "Básico" (gris)

## Archivos Modificados

- ✅ `backend/src/models/Purchase.ts` - Agregado todos los campos al schema
- ✅ Commit: "🐛 Agregar campos faltantes en PurchaseItemSchema"

## Lecciones Aprendidas

1. **Mongoose NO sincroniza automáticamente con TypeScript interfaces**
   - El schema define qué se guarda en MongoDB
   - La interface define qué espera TypeScript
   - DEBEN mantenerse sincronizados manualmente

2. **Mongoose descarta campos silenciosamente**
   - Si un campo no está en el schema, se ignora
   - No hay error ni warning
   - Difícil de debuggear

3. **Debugging de esquemas**
   - Siempre verificar el schema de Mongoose, no solo la interface
   - Revisar MongoDB directamente para ver qué se guardó
   - No asumir que TypeScript valida la persistencia

4. **Sincronización de tipos**
   - Cuando se agrega un campo a una interface:
     1. ✅ Agregar a TypeScript interface (`shared/types.ts`)
     2. ✅ Agregar a Mongoose schema (`models/*.ts`)
     3. ✅ Agregar lógica en controladores si es necesario
     4. ✅ Agregar UI en frontend si es necesario

## Referencias

- **Issue reportado**: "En la base de datos no veo esos campos (brand y pieceType)"
- **Root Cause**: Mongoose schema incompleto
- **Fix**: Agregar todos los campos de interface al schema
- **Status**: ✅ Fixed - Listo para deploy
