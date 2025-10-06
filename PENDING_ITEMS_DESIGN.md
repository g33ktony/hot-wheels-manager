# 📦 Sistema de Items Pendientes - Documento de Diseño

## 🎯 Objetivo
Gestionar items de compras que no llegan completos, permitiendo trackeo, reenvíos y reembolsos.

---

## 📊 Estructura de Datos

### **Nuevo Modelo: PendingItem**

```typescript
interface PendingItem {
  _id: string
  originalPurchaseId: string // Compra donde se pidió originalmente
  originalPurchase?: Purchase // Populated
  
  // Detalles del item
  carId: string
  quantity: number // Cantidad que falta
  unitPrice: number // Precio original pagado
  condition: 'mint' | 'good' | 'fair' | 'poor'
  brand?: string
  pieceType?: 'basic' | 'premium' | 'rlc'
  isTreasureHunt?: boolean
  isSuperTreasureHunt?: boolean
  isChase?: boolean
  photos?: string[]
  
  // Tracking
  status: 'pending-reshipment' | 'requesting-refund' | 'refunded' | 'cancelled'
  reportedDate: Date // Cuando se reportó que no llegó
  notes?: string // Motivo o qué hacer
  
  // Reenvío
  linkedToPurchaseId?: string // Si se agregó a compra futura
  linkedToPurchase?: Purchase // Populated
  
  // Reembolso
  refundAmount?: number // Monto reembolsado
  refundDate?: Date // Fecha del reembolso
  refundMethod?: string // PayPal, transferencia, etc.
  
  createdAt: Date
  updatedAt: Date
}
```

### **Actualización: Purchase Model**
```typescript
// Agregar campo para items pendientes asociados
hasPendingItems?: boolean
pendingItemsCount?: number
```

---

## 🔄 Flujos de Usuario

### **Flujo 1: Recibir Compra Completa (Simple)**
```
1. Usuario ve compra con estado "shipped" o "paid"
2. Click botón "Marcar como Recibida"
3. Alert de confirmación: "¿Confirmas que llegó todo completo?"
4. Si acepta → Estado cambia a "received"
5. Items se agregan al inventario automáticamente
```

### **Flujo 2: Recibir Compra Incompleta (Verificación)**
```
1. Usuario ve compra con estado "shipped" o "paid"
2. Click botón "Verificar y Recibir" (naranja 🟠)
3. Modal se abre: "Verificación de Items Recibidos"
   
   ┌─────────────────────────────────────────────┐
   │ 📦 Verificación de Items Recibidos          │
   ├─────────────────────────────────────────────┤
   │                                             │
   │ ✓ Mitsubishi Lancer Evo                    │
   │   Cantidad: [2] ▼  [🗑️ No llegó]           │
   │   $300 c/u • Mint • Hot Wheels              │
   │                                             │
   │ ✓ Ferrari F40                               │
   │   Cantidad: [1] ▼  [🗑️ No llegó]           │
   │   $500 c/u • Mint • Hot Wheels              │
   │                                             │
   │ 📦 Caja P (72 piezas)                       │
   │   Cantidad: [1] ▼  [🗑️ No llegó]           │
   │   $2600 total • Sealed                      │
   │                                             │
   ├─────────────────────────────────────────────┤
   │ [Cancelar]  [✅ Confirmar Recepción]        │
   └─────────────────────────────────────────────┘

4. Usuario ajusta cantidades o elimina items
5. Al eliminar: Confirmation dialog
   "¿Confirmas que [item] no llegó? Se moverá a Items Pendientes"
6. Click "Confirmar Recepción"
7. Items recibidos → Inventario
8. Items eliminados → PendingItems (status: 'pending-reshipment')
9. Compra cambia a "received" con flag `hasPendingItems: true`
```

### **Flujo 3: Gestionar Items Pendientes**
```
Nueva página: /pending-items (solo visible si hay pendientes)

┌────────────────────────────────────────────────────────┐
│ 🟠 Items Pendientes                                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│ [Filtros: Todos | Reenvío | Reembolso | Reembolsado] │
│                                                        │
│ ┌─────────────────────────────────────────────────┐  │
│ │ 🟠 Ferrari F40                                  │  │
│ │ Compra: #ABC123 • Proveedor: John's Shop       │  │
│ │ Cantidad: 1 • Precio: $500 • Total: $500       │  │
│ │ Reportado: 5 días atrás                         │  │
│ │ Estado: Pendiente de reenvío                    │  │
│ │ Notas: "Proveedor confirma envío en siguiente"  │  │
│ │                                                  │  │
│ │ [📝 Editar] [💰 Marcar Reembolsado]            │  │
│ │ [📦 Agregar a Compra] [❌ Cancelar]            │  │
│ └─────────────────────────────────────────────────┘  │
│                                                        │
│ ⚠️ ALERTA: Mitsubishi Lancer (15+ días pendiente)    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### **Flujo 4: Agregar a Compra Futura**
```
1. Desde /pending-items, click "📦 Agregar a Compra"
2. Modal: "Seleccionar Compra Futura"
   - Lista de compras con estado "pending" o "paid" (no received)
   - Opción: [+ Crear Nueva Compra]
3. Selecciona compra
4. Item se agrega a la compra con:
   - unitPrice: $0 (ya pagado)
   - Badge especial: "🟠 Reenvío - Pagado en compra #ABC"
   - Visual diferente (fondo naranja claro)
5. PendingItem actualiza: linkedToPurchaseId
6. Al recibir la compra futura:
   - Si el item SÍ llega → PendingItem se elimina, item va a inventario
   - Si el item NO llega → Se mantiene en pendientes, se desvincula de esa compra

**VALIDACIÓN**: No se puede agregar a una compra si ya está vinculado a otra compra que NO ha sido received
```

### **Flujo 5: Marcar como Reembolsado**
```
1. Click "💰 Marcar Reembolsado"
2. Modal: "Registrar Reembolso"
   ┌─────────────────────────────────────┐
   │ 💰 Registrar Reembolso              │
   ├─────────────────────────────────────┤
   │ Item: Ferrari F40                   │
   │ Cantidad: 1 • Precio: $500          │
   │                                     │
   │ Monto reembolsado: [$500] 💵       │
   │ Fecha: [06/10/2025] 📅             │
   │ Método: [PayPal ▼]                 │
   │ Notas: [________________________]  │
   │                                     │
   │ [Cancelar] [✅ Confirmar Reembolso]│
   └─────────────────────────────────────┘
3. PendingItem actualiza:
   - status: 'refunded'
   - refundAmount, refundDate, refundMethod
4. Item desaparece de lista activa (movido a "Reembolsados")
5. Purchase original: NO se modifica totalCost (mantener registro histórico)
6. Nuevo tracking: Supplier tiene campo `pendingRefunds` y `totalRefunded`
```

---

## 🎨 Componentes UI

### **1. Botones en Purchase Card/Detail**
```tsx
// Si compra NO está received
<div>
  <button className="bg-blue-500">
    ✅ Marcar como Recibida
  </button>
  <button className="bg-orange-500">
    🟠 Verificar y Recibir
  </button>
</div>
```

### **2. Modal: ReceiveVerificationModal**
```tsx
<ReceiveVerificationModal
  purchase={purchase}
  onConfirm={(receivedItems, missingItems) => {
    // receivedItems → Inventario
    // missingItems → PendingItems
  }}
  onCancel={() => {}}
/>
```

### **3. Badge en Purchase Items (cuando está linked)**
```tsx
{item.isPendingReshipment && (
  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
    🟠 Reenvío - Pagado en #{item.originalPurchaseId}
  </span>
)}
```

### **4. Widget Dashboard**
```tsx
<div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
  <h3>🟠 Items Pendientes</h3>
  <div className="text-3xl font-bold">12</div>
  <div className="text-gray-600">$3,450 en pendientes</div>
  <Link to="/pending-items">Ver detalles →</Link>
</div>
```

### **5. Alertas (>15 días)**
```tsx
<Alert severity="warning">
  ⚠️ Tienes 3 items pendientes hace más de 15 días
  <Link to="/pending-items?filter=overdue">Ver items →</Link>
</Alert>
```

---

## 📈 Impacto en Estadísticas/Reportes

### **Opción A: Tracking Separado (RECOMENDADO)**
- Purchase mantiene `totalCost` original (histórico)
- Nuevo campo: `effectiveCost = totalCost - refundedAmount`
- Reportes muestran AMBOS:
  - "Gasto Total (original): $10,000"
  - "Gasto Efectivo (con reembolsos): $9,500"
  - "Pendiente de recibir: $500"

### **Dashboard Metrics**
```typescript
{
  totalSpent: 10000,        // Suma de totalCost
  effectiveSpent: 9500,     // totalSpent - refunds
  pendingValue: 500,        // Items pendientes
  refundedTotal: 500,       // Total reembolsado
  pendingItemsCount: 3      // Número de items
}
```

---

## 🗂️ Navegación

### **Sidebar Updates**
```tsx
<NavLink to="/purchases">💰 Compras</NavLink>
<NavLink to="/inventory">📦 Inventario</NavLink>

{/* Solo visible si hay cajas */}
{boxesCount > 0 && (
  <NavLink to="/boxes">
    📦 Cajas ({boxesCount})
  </NavLink>
)}

{/* Solo visible si hay pendientes */}
{pendingItemsCount > 0 && (
  <NavLink to="/pending-items" className="text-orange-600">
    🟠 Pendientes ({pendingItemsCount})
  </NavLink>
)}

<NavLink to="/deliveries">🚚 Entregas</NavLink>
```

---

## ✅ Validaciones y Reglas de Negocio

1. **No se puede eliminar un Purchase si tiene PendingItems activos** (status != 'refunded' && != 'cancelled')
2. **Un PendingItem solo puede vincularse a UNA compra no-received a la vez**
3. **Al marcar compra como received, verificar PendingItems vinculados**:
   - Si item llegó → Eliminar PendingItem, agregar a inventario
   - Si item NO llegó → Desvincular de compra, mantener en pendientes
4. **Alertas automáticas**: Items >15 días pendientes
5. **No se pueden crear cajas desde items pendientes** (solo items regulares)

---

## 🚀 Plan de Implementación

### **Fase 1: Backend (Modelo y API)**
- [ ] Crear modelo PendingItem
- [ ] API: POST /api/pending-items (crear)
- [ ] API: GET /api/pending-items (listar con filtros)
- [ ] API: PUT /api/pending-items/:id (actualizar status/notas)
- [ ] API: PUT /api/pending-items/:id/link-to-purchase
- [ ] API: PUT /api/pending-items/:id/mark-refunded
- [ ] API: DELETE /api/pending-items/:id (cancelar)
- [ ] Actualizar purchasesController:
  - Endpoint: POST /api/purchases/:id/receive-verification
  - Endpoint: GET /api/purchases/:id/pending-items
- [ ] Actualizar Supplier model (pendingRefunds, totalRefunded)

### **Fase 2: Frontend (Componentes)**
- [ ] ReceiveVerificationModal component
- [ ] PendingItemsPage (/pending-items)
- [ ] PendingItemCard component
- [ ] LinkToPurchaseModal component
- [ ] MarkRefundedModal component
- [ ] Dashboard: PendingItemsWidget
- [ ] Alerts: Overdue items alert
- [ ] Badge component para items en reenvío

### **Fase 3: Integración**
- [ ] Actualizar PurchaseCard con nuevos botones
- [ ] Actualizar Purchase detail view
- [ ] Sidebar: Conditional rendering
- [ ] Dashboard: Agregar widget
- [ ] Reportes/estadísticas con tracking

### **Fase 4: Testing**
- [ ] Flujo completo: Compra incompleta → Pendiente → Reenvío → Inventario
- [ ] Flujo: Compra incompleta → Pendiente → Reembolso
- [ ] Validaciones de vinculación
- [ ] Alertas de +15 días

---

## 🎨 Colores y Estilos

**Naranja (Pendientes):**
- Primary: `#f97316` (orange-500)
- Light bg: `#ffedd5` (orange-100)
- Border: `#fb923c` (orange-400)
- Dark text: `#9a3412` (orange-800)

**Iconos:**
- 🟠 Items pendientes
- 📦 Reenvío/Agregar a compra
- 💰 Reembolso
- ⚠️ Alerta de días
- ❌ Cancelar/Eliminar

---

## 📝 Notas Adicionales

- **Cajas**: NO manejar casos de cajas incompletas (no aplica)
- **Prioridad de alertas**: >15 días
- **Histórico**: Mantener Purchase.totalCost original para auditoría
- **UX**: Confirmation dialogs en todas las acciones destructivas

---

**Fecha de Diseño**: 6 de octubre de 2025  
**Versión**: 1.0  
**Status**: ✅ Aprobado - Listo para Implementación
