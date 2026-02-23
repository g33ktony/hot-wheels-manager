# 🔍 POS - Diagnóstico Detallado

## Problema Reportado
El POS no muestra items de inventario que fueron agregados.

## 🔧 Verificación Paso a Paso

### 1. Verificar el JWT Token del Usuario

**En el navegador (DevTools → Application → Cookies):**
1. Busca el cookie/localStorage que contiene el JWT token
2. Decodifica el token en https://jwt.io
3. Verifica que contenga:
   ```json
   {
     "userId": "...",
     "email": "usuario@email.com",
     "role": "editor|viewer|admin", // NO debe ser sys_admin
     "storeId": "tu-tienda-id"
   }
   ```

**El problema más común:** El `storeId` está vacío o es undefined

---

### 2. Verificar en la Consola del Navegador

**Abre DevTools (F12) → Console y copia esto:**

```javascript
// Ver el estado actual de Redux
console.log('=== Redux State ===');
console.log('Inventario cargado:', reduxStore?.inventory?.items?.length || 0, 'items');
console.log('Carrito:', reduxStore?.cart?.items?.length || 0, 'items');

// Ver el token actual
const token = localStorage.getItem('token');
if (token) {
  const decoded = JSON.parse(atob(token.split('.')[1]));
  console.log('=== Token Decodificado ===');
  console.log('storeId:', decoded.storeId);
  console.log('userId:', decoded.userId);
  console.log('role:', decoded.role);
}
```

**Qué buscar:**
- ✅ `storeId` debe tener un valor (no vacío)
- ✅ Debe haber items en el inventario
- ✅ El rol no debe ser `sys_admin`

---

### 3. Verificar en Network Tab

**En DevTools → Network:**

1. Recarga la página
2. Busca la solicitud GET `/api/inventory?page=1&limit=100`
3. Haz clic en ella
4. **Response:** Debe mostrar:
   ```json
   {
     "success": true,
     "data": {
       "items": [
         {
           "_id": "...",
           "carId": "...",
           "brand": "...",
           "quantity": 1,
           "storeId": "tu-tienda-id",
           ...
         }
       ],
       "pagination": {
         "totalItems": 5,
         ...
       }
     }
   }
   ```

**Problemas comunes:**
- ❌ `items: []` (vacío) → No hay inventario en la BD
- ❌ `storeId` diferente al del usuario → Problema de filtrado
- ❌ Error 401 → El token no se está enviando

---

### 4. Verificar en MongoDB

**Conectar a MongoDB y ejecutar:**

```javascript
// Verificar que el usuario tiene storeId
db.users.findOne({ email: "usuario@email.com" })
// Resultado debe incluir: storeId: "su-tienda-unica"

// Verificar inventario del usuario
db.inventoryitems.find({ storeId: "su-tienda-unica" })
// Debe mostrar los items que agregó

// Ver TODOS los items (si alguno tiene el mismo id del usuario)
db.inventoryitems.find({})
  .limit(5)
  .pretty()
```

---

### 5. Consola del Servidor Backend

**En el servidor, busca logs como:**

```
🔍 POS Redux State: {
  itemsCount: 0,
  isLoading: false,
  error: null,
  hasItems: false
}
```

**El problema:**
- Si `itemsCount: 0`, significa que la API retornó 0 items
- Revisa el siguiente log de carga:

```
🔄 POS: Cargando inventario inicial desde API...
✅ POS: Cargó primer lote - 5 items de 5 total
```

**Si ves:**
```
✅ POS: Cargó primer lote - 0 items de 0 total
```

**Entonces:** La base de datos no tiene items para este usuario

---

## 🎯 Soluciones por Problema

### Problema 1: JWT Token sin storeId

**Síntomas:**
- Token decodificado muestra `storeId: null` o `storeId: undefined`

**Solución:**
1. Cierra sesión (logout)
2. Inicia sesión nuevamente (login)
3. El token debe renovarse con el `storeId` correcto

**Archivo relevante:** `backend/src/middleware/auth.ts`

---

### Problema 2: Items en BD pero no aparecen en POS

**Síntomas:**
- MongoDB muestra items con `storeId` del usuario
- POS muestra 0 items
- API GET `/api/inventory` retorna 0 items

**Probable causa:** Filtro `createStoreFilter()` está incorrecta
- Ver: `backend/src/utils/storeAccess.ts`
- Ver: `backend/src/controllers/inventoryController.ts` línea 107-108

**Verificación:**
```javascript
// En consola del servidor, agrega logging:
console.log('storeId del usuario:', req.storeId);
console.log('userRole:', req.userRole);
const storeFilter = createStoreFilter(req.storeId, req.userRole);
console.log('storeFilter:', storeFilter);
```

---

### Problema 3: Items no se crearon con storeId

**Síntomas:**
- El usuario agregó items
- MongoDB muestra items pero sin `storeId` (o con storeId vacío)

**Solución:**
Ejecutar migración para asignar `storeId` a items existentes:

```javascript
// En MongoDB, ejecutar:
db.inventoryitems.updateMany(
  { storeId: { $exists: false } },
  [
    {
      $set: {
        storeId: "id-de-la-tienda-del-usuario"
      }
    }
  ]
)

// Verificar que se actualizaron:
db.inventoryitems.find({ }).pretty()
```

---

### Problema 4: Items de otra tienda aparecen

**Síntomas:**
- POS muestra items de la tienda principal o de otro usuario

**Causa:** El filtro `createStoreFilter()` no está siendo aplicado

**Verificación en logs:**
```
itemsCount: 50  // Pero solo deberían ser 5 del usuario
```

**Debug:**
Agrega esto en `backend/src/controllers/inventoryController.ts` línea 107:

```typescript
console.log('🔍 DEBUG getInventoryItems:');
console.log('  req.storeId:', req.storeId);
console.log('  req.userRole:', req.userRole);
const storeFilter = createStoreFilter(req.storeId!, req.userRole!);
console.log('  storeFilter:', storeFilter);
console.log('  query:', { ...query, ...storeFilter });
```

---

## 📊 Checklist de Validación Completa

```
USUARIO NUEVO (NO sys_admin):

JWT Token:
  ✓ [ ] storeId presente y con valor
  ✓ [ ] role es "editor"/"viewer"/"admin" (no "sys_admin")
  ✓ [ ] userId presente
  ✓ [ ] email correcto

MongoDB:
  ✓ [ ] User existe con storeId
  ✓ [ ] InventoryItems existen con ese storeId
  ✓ [ ] Cantidad > 0 en items

API Response:
  ✓ [ ] GET /api/inventory retorna items
  ✓ [ ] Items tienen el storeId correcto
  ✓ [ ] No hay error 401/403

POS Frontend:
  ✓ [ ] Redux carga items exitosamente
  ✓ [ ] Console muestra itemsCount > 0
  ✓ [ ] Items visibles en interfaz

Funcionalidad:
  ✓ [ ] Puede completar una venta
  ✓ [ ] El carrito se limpia después
  ✓ [ ] Venta registra storeId del usuario
```

---

## 🔗 Archivos Relacionados

| Archivo | Responsabilidad |
|---------|-------------------|
| `backend/src/middleware/auth.ts` | Extrae storeId del JWT |
| `backend/src/utils/storeAccess.ts` | Filtra por storeId |
| `backend/src/controllers/inventoryController.ts` | Obtiene items con filtro |
| `frontend/src/services/inventory.ts` | Llamada GET a API |
| `frontend/src/pages/POS.tsx` | Carga y muestra items |
| `backend/src/index.ts` | Aplica authMiddleware a rutas |

---

## 🚨 Próximos Pasos

1. **Primero:** Ejecuta el checklist anterior
2. **Segundo:** Si todo parece correcto:
   - Limpia caché del navegador (localStorage)
   - Cierra sesión y vuelve a iniciar
3. **Tercero:** Si sigue sin funcionar:
   - Proporciona los logs de la consola del navegador
   - Proporciona la respuesta de `/api/inventory` en Network tab
   - Proporciona resultado de MongoDB con los items

---

## 📝 Logs a Proporcionar Para Debug

Si sigue sin funcionar, ejecuta en consola del navegador y proporciona:

```javascript
// En DevTools Console:
console.log('===== DEBUG INFO =====');
console.log('Token:', localStorage.getItem('token'));
console.log('Inventario Redux:', window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.()?.inventory);
console.log('Carrito Redux:', window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.()?.cart);

// Copia todo esto y envía
```

Y en el servidor, proporciona los últimos logs cuando hagas GET `/api/inventory`
