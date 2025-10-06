# 📦 Sistema de Cajas - Implementación Completa

## 🎯 Objetivo
Gestionar cajas selladas de Hot Wheels (72 piezas), Matchbox (24 piezas), Kaido House Master (24 piezas), etc. que se compran completas y se desempac an progresivamente.

---

## ✅ Completado

### 1. **Backend - Tipos y Modelos**
- ✅ `shared/types.ts`: Agregar campos de caja en `InventoryItem` y `PurchaseItem`
  - `isBox`, `boxName`, `boxSize`, `boxPrice`, `boxStatus`, `registeredPieces`
  - `sourceBox`, `sourceBoxId` (para tracking de piezas)
  
- ✅ `backend/src/models/InventoryItem.ts`: Schema con campos de caja
- ✅ `backend/src/models/Purchase.ts`: Schema con campos de caja en items

### 2. **Backend - Controladores y Rutas**
- ✅ `backend/src/controllers/boxesController.ts`: Controlador completo
  - `GET /api/boxes` - Listar cajas pendientes
  - `GET /api/boxes/:id` - Detalle de caja + piezas registradas
  - `POST /api/boxes/:id/pieces` - Registrar pieza(s)
  - `PUT /api/boxes/:id/complete` - Completar caja incompleta
  - `DELETE /api/boxes/:id/pieces/:pieceId` - Eliminar pieza registrada
  - `PUT /api/boxes/:id` - Editar info de caja (boxSize, etc.)

- ✅ `backend/src/routes/boxes.ts`: Rutas configuradas
- ✅ `backend/src/index.ts`: Rutas agregadas a Express
- ✅ `backend/src/controllers/purchasesController.ts`: 
  - Modificado `addItemsToInventory()` para manejar cajas selladas
  - Cuando `item.isBox === true`, crea item especial en inventario

### 3. **Frontend - Compras**
- ✅ `frontend/src/pages/Purchases.tsx`: UI para agregar cajas
  - Checkbox "Es una caja sellada"
  - Campos: Nombre, Cantidad de piezas, Precio total
  - Cálculo automático de costo por pieza
  - Generación automática de carId (BOX-NOMBRE-timestamp)
  - Envío correcto al backend

---

## ⏳ Pendiente (Fase 2)

### 1. **Frontend - Página de Cajas** 
Crear `frontend/src/pages/Boxes.tsx`:

```tsx
interface BoxesPageProps {
  // Mostrar cajas con status 'sealed' o 'unpacking'
  // Card con: Nombre, Progreso (45/72), Brand, Type
  // Click → Abrir modal de desempacado
}
```

**Funcionalidades**:
- Lista de cajas pendientes de desempacar
- Filtros: Brand, Tipo, Status
- Badge de progreso visual
- Botón "Continuar Registro"

### 2. **Frontend - Modal de Desempacado**
Crear `frontend/src/components/BoxUnpackModal.tsx`:

```tsx
interface BoxUnpackModalProps {
  box: InventoryItem; // Caja a desempacar
  onClose: () => void;
}
```

**Funcionalidades**:
- Header: "Caja P - 45/72 piezas"
- Formulario para registrar pieza:
  - Car ID
  - Fotos
  - TH/STH/Chase checkboxes
  - Precio de venta sugerido
  - Notas
- Botones:
  - "Guardar y Agregar Otra" (registro rápido)
  - "Guardar y Cerrar"
  - "Completar Caja Incompleta" (si faltan piezas)
- Lista de piezas ya registradas (editable/eliminable)

### 3. **Frontend - API Hooks**
Crear `frontend/src/hooks/useBoxes.ts`:

```typescript
export const useBoxes = () => {
  return useQuery(['boxes'], async () => {
    const response = await axios.get('/api/boxes')
    return response.data.data
  })
}

export const useBoxById = (id: string) => {
  return useQuery(['boxes', id], async () => {
    const response = await axios.get(`/api/boxes/${id}`)
    return response.data.data
  })
}

export const useRegisterBoxPieces = () => {
  return useMutation(async ({ boxId, pieces }) => {
    const response = await axios.post(`/api/boxes/${boxId}/pieces`, { pieces })
    return response.data
  })
}

export const useCompleteBox = () => {
  return useMutation(async ({ boxId, reason }) => {
    const response = await axios.put(`/api/boxes/${boxId}/complete`, { reason })
    return response.data
  })
}
```

### 4. **Frontend - Navegación**
Agregar ruta en `App.tsx`:
```tsx
<Route path="/boxes" element={<Boxes />} />
```

Agregar ítem en sidebar/navbar:
```tsx
<NavLink to="/boxes">
  <Package /> Cajas
</NavLink>
```

### 5. **Frontend - Badges en Inventario**
Actualizar `frontend/src/pages/Inventory.tsx`:

```tsx
// Mostrar badge para cajas
{item.isBox && (
  <Badge color="purple">
    📦 {item.boxName} - {item.registeredPieces}/{item.boxSize}
  </Badge>
)}

// Mostrar badge para piezas de cajas
{item.sourceBox && (
  <Badge color="gray">
    De: {item.sourceBox}
  </Badge>
)}
```

### 6. **Frontend - Validaciones**
- Validar que boxName no esté vacío si isBox=true
- Validar que boxSize > 0
- Validar que boxPrice > 0
- Deshabilitar campos normales si isBox=true (quantity, unitPrice)
- Mostrar warning si faltan campos

---

## 📊 Flujo de Usuario Completo

### Escenario: Comprar y Desempacar Caja P (72 piezas, $2200)

#### 1. **Comprar Caja**
1. Usuario va a "Compras"
2. Click "+ Nueva Compra"
3. Agrega item:
   - ✅ Marca checkbox "Es una caja sellada"
   - Nombre: "Caja P"
   - Marca: "Hot Wheels"
   - Tipo: "Básico"
   - Cantidad: 72 piezas
   - Precio: $2200
   - Sistema calcula: $30.56 por pieza
4. Guarda compra
5. Marca como "Recibida"

#### 2. **Sistema Procesa**
- Backend detecta `isBox: true`
- Crea item en inventario:
  ```json
  {
    "carId": "BOX-P-1696550400000",
    "isBox": true,
    "boxName": "Caja P",
    "boxSize": 72,
    "boxPrice": 2200,
    "boxStatus": "sealed",
    "registeredPieces": 0
  }
  ```

#### 3. **Ver Cajas Pendientes**
1. Usuario va a "Cajas" (nueva página)
2. Ve card: "Caja P - 0/72 piezas"
3. Click "Desempacar"

#### 4. **Registrar Piezas**
1. Modal se abre
2. Usuario registra 10 piezas hoy:
   - Pieza 1: HW-MUSTANG-2024, TH ✓
   - Pieza 2: HW-CORVETTE-2024
   - ... (10 piezas)
3. Click "Guardar"
4. Sistema:
   - Crea 10 items en inventario con `sourceBox: "Caja P"`
   - Actualiza caja: `registeredPieces: 10, boxStatus: "unpacking"`
5. Card ahora muestra: "Caja P - 10/72 piezas"

#### 5. **Continuar Registro**
1. Mañana, usuario vuelve
2. Click "Continuar Registro"
3. Modal muestra:
   - "62 piezas pendientes"
   - Lista de 10 piezas ya registradas (puede editar/eliminar)
4. Registra 20 más → Total: 30/72

#### 6. **Completar Caja**
- **Opción A**: Registra las 72 piezas
  - Sistema auto-completa
  - Caja desaparece de la lista
  - 72 piezas en inventario con `sourceBox: "Caja P"`

- **Opción B**: Solo registró 70 piezas
  - Click "Completar Caja Incompleta"
  - Confirma: "2 piezas faltantes/dañadas"
  - Caja se marca como completada
  - 70 piezas en inventario

---

## 🔧 Configuración Adicional

### Sincronizar Tipos con Backend
Cuando hagas cambios en `shared/types.ts`, copia al backend:
```bash
cd backend
npm run build
# O manualmente:
cp -r ../shared/* src/shared/
```

### Variables de Entorno
No se necesitan cambios en `.env`

### Deploy
```bash
git push  # Railway auto-deploya backend
# Vercel auto-deploya frontend
```

---

## 🧪 Testing

### Casos de Prueba

#### Test 1: Comprar Caja Normal
- [ ] Crear compra con caja de 72 piezas
- [ ] Marcar como recibida
- [ ] Verificar que aparece en inventario con boxStatus="sealed"
- [ ] Verificar que NO se crean 72 items individuales

#### Test 2: Desempacar Progresivo
- [ ] Abrir caja
- [ ] Registrar 10 piezas
- [ ] Verificar que caja muestra 10/72
- [ ] Verificar que 10 items aparecen en inventario
- [ ] Cerrar y reabrir modal
- [ ] Verificar que muestra 10 piezas registradas

#### Test 3: Duplicados en Caja
- [ ] Registrar 2 veces "HW-MUSTANG-2024"
- [ ] Verificar que inventario muestra quantity=2
- [ ] Verificar que caja cuenta 2 piezas registradas (72 → 70 pendientes)

#### Test 4: Completar Caja Incompleta
- [ ] Registrar solo 70 de 72 piezas
- [ ] Click "Completar Incompleta"
- [ ] Agregar razón: "2 piezas dañadas"
- [ ] Verificar que caja desaparece
- [ ] Verificar que 70 piezas quedan en inventario

#### Test 5: Editar/Eliminar Pieza Registrada
- [ ] Registrar 5 piezas
- [ ] Eliminar 1 pieza
- [ ] Verificar que contador vuelve a 4/72 (retrocede)
- [ ] Editar otra pieza (cambiar precio, notas)
- [ ] Verificar que cambios se guardan

#### Test 6: Vender Caja Completa
- [ ] Crear venta con caja sellada (quantity=1)
- [ ] Verificar que caja desaparece del inventario
- [ ] Verificar que NO se crean piezas individuales

---

## 📝 Notas Técnicas

### Cálculo de Costo por Pieza
```typescript
const costPerPiece = boxPrice / boxSize
// Ejemplo: $2200 / 72 = $30.56
```

### Generación de carId para Cajas
```typescript
const boxPrefix = boxName.toUpperCase().replace(/\s+/g, '-')
const timestamp = Date.now()
const carId = `${boxPrefix}-${timestamp}`
// Ejemplo: "BOX-P-1696550400000"
```

### Estados de Caja
- `sealed`: Caja recién recibida, 0 piezas registradas
- `unpacking`: 1+ piezas registradas, pero no completada
- `completed`: Todas las piezas registradas o marcada como incompleta

### Tracking de Origen
Cada pieza registrada de una caja tiene:
```typescript
{
  sourceBox: "Caja P",      // Nombre para mostrar
  sourceBoxId: "673a1b2c3d4e5f6g7h8i9j0k" // ID para queries
}
```

---

## 🚀 Próximos Pasos

1. **Inmediato** (Necesario para funcionalidad básica):
   - [ ] Crear página `Boxes.tsx`
   - [ ] Crear modal `BoxUnpackModal.tsx`
   - [ ] Crear hooks `useBoxes.ts`
   - [ ] Agregar navegación
   - [ ] Testing básico

2. **Corto Plazo** (Mejoras UX):
   - [ ] Badges en inventario
   - [ ] Filtros en página de cajas
   - [ ] Búsqueda de piezas registradas
   - [ ] Exportar lista de piezas de caja

3. **Largo Plazo** (Features avanzados):
   - [ ] Estadísticas por caja (¿cuántos TH/STH?)
   - [ ] Comparar cajas (rendimiento)
   - [ ] Alerts: "Caja abierta hace 30 días sin completar"
   - [ ] Escaneo de código de barras para registro rápido

---

## 📚 Recursos

- **Documentación Backend**: `backend/src/controllers/boxesController.ts`
- **Tipos Compartidos**: `shared/types.ts`
- **Fix Bug Brand/PieceType**: `docs/FIX_BRAND_PIECETYPE_BUG.md`

---

**Estado**: Backend completo ✅ | Frontend 60% ⏳ | Testing 0% ❌

**Última actualización**: 2025-10-05
