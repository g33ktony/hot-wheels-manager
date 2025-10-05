# 🎁 Sistema de Ventas por Series - Implementación

## 📋 Especificación

### Concepto
Sistema para vender conjuntos completos de Hot Wheels (series) con precio promocional.

**Ejemplo:**
- Serie: "Marvel Series 2024" (5 piezas)
- Precio individual: $200 c/u = $1,000 total
- Precio por serie completa: $850 (15% descuento)

---

## 🎯 Funcionalidades

### 1. **Identificación de Series**
- Cada pieza puede tener un `seriesId` único
- Todas las piezas de la misma serie comparten el mismo `seriesId`
- Ejemplo: "MARVEL-2024-001"

### 2. **Precio Automático**
- Se calcula automáticamente al 85% del total individual
- Puede ser editado manualmente por el usuario
- Se guarda en `seriesPrice` (editable) y `seriesDefaultPrice` (referencia)

### 3. **Inventario - Completar Serie**
Al editar una pieza que pertenece a una serie:
- Mostrar botón "🎁 Completar Serie"
- Abrir modal para agregar las piezas faltantes
- Validar que todas tengan precio base similar

### 4. **Entregas - Vender por Serie** ⭐ FLUJO MEJORADO
**Nuevo flujo más intuitivo:**
1. Usuario agrega UNA pieza de una serie a la entrega (precio normal)
2. Sistema detecta que tiene `seriesId`
3. Aparece botón: "🎁 Completar Serie: [Nombre] (X piezas faltantes)"
4. Al hacer clic:
   - Valida inventario disponible de todas las piezas faltantes
   - Si hay stock: agrega automáticamente las otras piezas
   - Ajusta precio de TODAS las piezas de la serie: `seriesPrice ÷ seriesSize`
   - Si falta stock: muestra error "❌ No hay suficiente inventario (faltan 2 piezas de 'supra')"

### 5. **Venta Parcial**
Si el cliente quiere solo algunas piezas (3 de 5):
- Se venden al precio individual
- Sin descuento de serie
- Precio: 3 x $200 = $600

---

## 📊 Modelo de Datos

### InventoryItem (shared/types.ts)

```typescript
interface InventoryItem {
  // ... campos existentes
  
  // Series fields
  seriesId?: string;           // "MARVEL-2024-001"
  seriesName?: string;         // "Marvel Series 2024"
  seriesSize?: number;         // 5 piezas
  seriesPosition?: number;     // 1, 2, 3, 4, 5
  seriesPrice?: number;        // 850 (editable)
  seriesDefaultPrice?: number; // 850 (auto-calculado 85%)
}
```

### DeliveryItem State (frontend)

```typescript
interface DeliveryItemState {
  // ... campos existentes
  isSoldAsSeries?: boolean;    // true si se vendió como serie
  seriesInfo?: {
    seriesId: string;
    seriesName: string;
    totalPieces: number;
    discountApplied: number;   // 150 ($1000 - $850)
  }
}
```

---

## 🚀 Fases de Implementación

### ✅ Fase 1: Modelo de Datos (COMPLETADO)
- [x] Actualizar `InventoryItem` en `shared/types.ts`
- [x] Actualizar schema en `backend/src/models/InventoryItem.ts`
- [x] Agregar índices para `seriesId`

### ✅ Fase 2: Backend - API Series (COMPLETADO)
- [x] Endpoint: `GET /api/inventory/series/:seriesId` - Obtener items de una serie
- [x] Endpoint: `GET /api/inventory/series/:seriesId/availability` - Verificar disponibilidad completa
- [x] Endpoint: `GET /api/inventory/series/:seriesId/missing` - Obtener piezas faltantes
- [x] Agregar rutas en `inventoryRoutes.ts`

### ✅ Fase 3: Frontend - Inventario (COMPLETADO)
- [x] UI: Agregar campos de serie al crear/editar item
- [x] Checkbox para activar modo serie
- [x] Campos: seriesId, seriesName, seriesSize, seriesPosition, seriesPrice
- [x] Badge visual en tarjeta de inventario para mostrar serie

### ✅ Fase 4: Frontend - Entregas (COMPLETADO) ⭐
- [x] Detectar items con `seriesId` al agregar a entrega
- [x] Botón "🎁 Completar Serie" aparece después de agregar primera pieza
- [x] Verificar inventario disponible completo antes de agregar
- [x] Agregar automáticamente todas las piezas faltantes
- [x] Ajustar precios unitarios: `seriesPrice ÷ seriesSize`
- [x] Badge visual para items vendidos como serie
- [x] Contador de piezas faltantes en botón

### ✅ Fase 5: Validaciones y Edge Cases (COMPLETADO)
- [x] Calcular precio automático al 85% (backend + frontend)
- [x] Mostrar precio sugerido calculado en tiempo real
- [x] Validar inventario suficiente antes de completar serie
- [x] Manejar eliminación inteligente de items de serie:
  - Opción de eliminar toda la serie o solo una pieza
  - Ajustar precios a individual si se rompe la serie
- [x] Backend: Auto-calcular `seriesDefaultPrice` al crear/actualizar
- [x] Frontend: Mostrar cálculo en tiempo real ($XXX por pieza)

---

## 🎨 UI Mockups

### Inventario - Editar Item con Series

```
┌──────────────────────────────────────────────┐
│ Editar Item: Iron Man                       │
├──────────────────────────────────────────────┤
│ Código: MV001                                │
│ Cantidad: 1                                  │
│ Precio: $200                                 │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ 📦 Información de Serie                  ││
│ │ Series ID: MARVEL-2024-001               ││
│ │ Nombre: Marvel Series 2024               ││
│ │ Posición: 1 de 5                         ││
│ │ Precio Serie: $850                       ││
│ │                                          ││
│ │ Estado: 1/5 piezas en inventario         ││
│ │                                          ││
│ │ [🎁 Completar Serie]                     ││
│ └──────────────────────────────────────────┘│
│                                              │
│ [Cancelar]  [Guardar]                       │
└──────────────────────────────────────────────┘
```

### Entregas - Agregar Item de Serie

```
┌──────────────────────────────────────────────┐
│ Seleccionar Item                             │
├──────────────────────────────────────────────┤
│ > Iron Man - Marvel Series 2024              │
│   $200                                       │
│   ┌────────────────────────────────────────┐ │
│   │ 🎁 Se vende por serie completa         │ │
│   │ $850 (5 piezas - Ahorra $150)          │ │
│   │                                        │ │
│   │ [Agregar Serie Completa]               │ │
│   └────────────────────────────────────────┘ │
│                                              │
│ [Agregar Pieza Individual]                   │
└──────────────────────────────────────────────┘
```

### Entregas - Items Agregados como Serie

```
┌──────────────────────────────────────────────┐
│ Items de la Entrega                          │
├──────────────────────────────────────────────┤
│ 📦 Marvel Series 2024 (5 piezas) - $850     │
│ ├─ 1. Iron Man        $170                   │
│ ├─ 2. Spider-Man      $170                   │
│ ├─ 3. Captain America $170                   │
│ ├─ 4. Thor            $170                   │
│ └─ 5. Hulk            $170                   │
│                                              │
│ Descuento aplicado: $150 ✨                  │
│                                              │
│ [+ Agregar otro item]                        │
└──────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

### Inventario
- [ ] Crear item con información de serie
- [ ] Editar item y agregar a serie existente
- [ ] Completar serie (agregar piezas faltantes)
- [ ] Validar que seriesId sea único
- [ ] Precio de serie se calcula automáticamente

### Entregas
- [ ] Agregar pieza individual de serie
- [ ] Ver botón "Vender por serie" solo si está completa
- [ ] Agregar serie completa
- [ ] Precio total correcto ($850 vs $1000)
- [ ] No permitir agregar serie si ya hay piezas individuales
- [ ] Eliminar serie completa

---

## 📝 Notas Técnicas

### Cálculo de Precio de Serie
```typescript
// Auto-calculado al 85% del total individual
const individualTotal = seriesSize * suggestedPrice;
const seriesDefaultPrice = Math.round(individualTotal * 0.85);
```

### Validación de Serie Completa
```typescript
// Verificar que hay inventario de todas las piezas
const seriesItems = await InventoryItem.find({ 
  seriesId: 'MARVEL-2024-001',
  quantity: { $gt: 0 } 
});

const isComplete = seriesItems.length === seriesSize;
```

### Ajuste de Precio Unitario
```typescript
// Al vender por serie, ajustar precio unitario
const unitPrice = seriesPrice / seriesSize;
// Ejemplo: $850 / 5 = $170 por pieza
```

---

## 🎯 Estado Actual

**Fase 1: Modelo de Datos** - ✅ COMPLETADO
- Tipos actualizados en `shared/types.ts`
- Schema actualizado en backend
- Listo para siguiente fase

**Próximo paso:** Fase 2 - Endpoints de API para series
