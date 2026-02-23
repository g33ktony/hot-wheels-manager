# 🔧 Investigación: POS No Muestra Items + Error al Completar Venta

**Problema Reportado:**
1. POS no muestra items que fueron agregados al inventario
2. Error al completar venta desde el carrito

**Fecha:** 20 de febrero, 2026

---

## 📋 Paso 1: Verificar que el Item se Creó Correctamente

### En MongoDB

```javascript
// 1. Conectarse a MongoDB
use hot-wheels-manager

// 2. Ver el usuario
db.users.findOne({ email: "usuario@email.com" })
// Busca especialmente el valor de: _id y storeId

// 3. Ver si el item existe
db.inventoryitems.findOne({ _id: ObjectId("ID_DEL_ITEM_CREADO") })
// ¿Tiene 'storeId' = al storeId del usuario?
// ¿Tiene 'quantity' > 0?
// ¿Tiene 'carId' válido?

// 4. Ver TODOS los items del usuario
db.inventoryitems.find({ storeId: "STORE_ID_DEL_USUARIO" })
// ¿Cuántos items retorna?
```

### En DevTools del Navegador

1. Abre **DevTools** (F12)
2. Ve a **Storage → LocalStorage**
3. Busca la clave `token`
4. Copia el valor del token
5. Decodifícalo en https://jwt.io
6. Verifica que contenga:
   ```json
   {
     "userId": "...",
     "storeId": "tu-tienda",
     "role": "editor/viewer/admin"
   }
   ```

---

## 📋 Paso 2: Verificar que la API Retorna Items

### En DevTools → Network

1. Abre el **Network Tab** (F12 → Network)
2. **Recarga la página** del POS (Ctrl+R)
3. Busca las siguientes requests:
   - `GET /api/inventory` (la primera carga)
   - `GET /api/inventory?page=1&limit=100` (carga del POS)

4. **Haz clic en la request**
5. Ve a la pestaña **Response** y verifica:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "carId": "...",
        "quantity": 1,
        "storeId": "tu-tienda",
        ...
      }
    ],
    "pagination": {
      "totalItems": 5,
      "totalPages": 1,
      ...
    }
  }
}
```

**¿Qué buscar?**
- ✅ `success: true` → La API respondió correctamente
- ✅ `items.length > 0` → Hay items en la respuesta
- ✅ Cada item tiene `storeId: "tu-tienda"`
- ❌ Si `items: []` → No hay items en la BD o el filtro los eliminó
- ❌ Si error 401/403 → Problema de autenticación

---

## 📋 Paso 3: Verificar la Consola del Navegador

### En DevTools → Console

Copia y ejecuta esto:

```javascript
// Ver estado del Redux para inventario
console.log('=== Redux Inventory State ===');
console.log(window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.()?.inventory);

// Ver estado del carrito
console.log('=== Redux Cart State ===');
console.log(window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.()?.cart);

// Ver si hay errores en la consola
console.log('=== Check for errors ===');
// Deberías ver los logs del POS diciendo:
// 🔍 POS Redux State: {itemsCount: X, isLoading: false, error: null}
// ✅ POS: Cargó primer lote - X items de X total
```

**¿Qué esperar?**
- ✅ `itemsCount > 0` → El inventario se cargó en Redux
- ❌ `itemsCount: 0` → No hay datos en Redux
- ✅ `isLoading: false` → Carga completada
- ❌ `error: "algún error"` → Hubo un error durante la carga

---

## 📋 Paso 4: Verificar que el Item Tiene Datos Completos

### En MongoDB

```javascript
// Ver el item completo
db.inventoryitems.findOne({ _id: ObjectId("ID_DEL_ITEM") })

// Verificar que tiene TODOS estos campos:
{
  _id: ObjectId("..."),
  carId: ObjectId("..."),  // ← IMPORTANTE: debe ser ObjectId válido
  quantity: 1,              // ← Debe ser > 0
  suggestedPrice: 10,       // ← Debe tener precio
  brand: "Hot Wheels",      // ← Debe tener marca
  condition: "mint",        // ← Debe tener condición
  storeId: "tienda-123",    // ← Debe ser storeId del usuario
  dateAdded: ISODate("2026-02-20..."),
  // Otros campos opcionales...
}
```

---

## ❌ Problema 1: Items no aparecen en POS

### Causas Posibles

1. **El item no tiene `carId` válido**
   - Solución: Editar item y volver a seleccionar car/modelo

2. **El item tiene `quantity: 0`**
   - Solución: Editar item y aumentar cantidad

3. **El item tiene `storeId` incorrecto**
   - Solución: Ver en MongoDB y corregir manualmente si es necesario

4. **El token JWT no tiene `storeId`**
   - Solución: Logout y login nuevamente

5. **El filtro `createStoreFilter()` está mal**
   - Solución: Revisar logs del servidor

### Debugging en Servidor

En la consola del servidor, busca logs cuando el usuario hace GET `/api/inventory`:

```
🔍 DEBUG getInventoryItems:
  req.storeId: tienda-123
  req.userRole: editor
  storeFilter: { storeId: "tienda-123" }
  query: { storeId: "tienda-123", ... }
  Found: 5 items
```

Si ves `Found: 0 items`, el problema es el filtrado.

---

## ❌ Problema 2: Error al completar venta desde carrito

### Causas Posibles

1. **El item en el carrito no tiene `inventoryItemId` válido**
2. **El item del carrito no pertenece a la tienda del usuario**
3. **La cantidad en el carrito es mayor a la disponible**
4. **Error en validación de precio**
5. **Item se eliminó después de agregarlo al carrito**

### Debugging en DevTools

```javascript
// Ver qué hay en el carrito
console.log('=== Cart Contents ===');
const cart = window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.()?.cart?.items;
console.table(cart);
// Verifica que cada item tiene: _id, cartQuantity, customPrice (si aplica)
```

### Debugging en Network Tab

1. Abre Network Tab
2. Intenta completar la venta
3. Busca la request: `POST /api/sales/pos`
4. Ve a **Response** para ver el error exacto:

```json
{
  "success": false,
  "data": null,
  "message": "El error específico aquí",
  "error": "detalles técnicos"
}
```

**Errores comunes:**
- ❌ "Item de inventario X no encontrado" → item eliminado o ID incorrecto
- ❌ "Solo puedes vender items de tu propia tienda" → storeId no coincide
- ❌ "El item de inventario solo tiene X unidades disponibles" → no hay suficiente cantidad
- ❌ "Item X no tiene precio válido" → el item no tiene precio

### Debugging en Servidor

En la consola del servidor, cuando completas venta, deberías ver:

```
🛒 POS Sale Request: {
  items: [{ inventoryItemId: "...", quantity: 1, customPrice: undefined }],
  paymentMethod: "cash",
  notes: "..."
}

✅ Item ID actualizado: -1 unidades
✅ POS Sale created successfully: ID_VENTA
```

Si ves un error antes de eso, es donde está el problema.

---

## 🔍 Checklist para Reportar el Problema

Si después de todo esto sigue sin funcionar, proporciona:

### Del Navegador (DevTools)
```javascript
// Copia y ejecuta en console:
console.log('=== USER TOKEN ===');
const token = localStorage.getItem('token');
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log(decoded);

console.log('=== INVENTORY API RESPONSE ===');
// Proporciona la respuesta de GET /api/inventory?page=1&limit=100

console.log('=== CART CONTENTS ===');
const cart = window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.()?.cart?.items;
console.table(cart);

console.log('=== ERROR MESSAGE ===');
// Proporciona el error exacto que ves en pantalla
```

### De MongoDB
```javascript
db.users.findOne({ email: "tu-email" })
// Proporciona resultado completo

db.inventoryitems.find({ storeId: "STORE_ID" })
// Proporciona todos los items

db.inventoryitems.findOne({ _id: ObjectId("ID_DEL_ITEM") })
// Proporciona el item detalladamente
```

### De los Logs del Servidor
```bash
# Ve el último error en los logs
tail -50 /path/to/servidor/logs/error.log
# O si está en consola, copia los últimos 50 líneas
```

---

## 📞 Resumen Rápido

| Problema | Verificar Primero | Segunda Opción |
|----------|-------------------|-----------------|
| POS vacío | ¿Existen items en MongoDB? | ¿El token tiene storeId? |
| Items visibles pero no se venden | ¿Tienen cantidad > 0? | ¿El item se creó con storeId? |
| Error "no hay stock" | ¿La cantidad es correcta? | ¿Hizo otra venta hace poco? |
| Error "no tales items" | ¿El ID existe en BD? | ¿Se borró el item? |
| Error 403 "otra tienda" | ¿El storeId coincide? | Cierra sesión y logea nuevamente |

---

**🎯 Próxima acción:**
Ejecuta los pasos 1-4 y reporta qué encuentras. Con esa información podré arreglarlo directamente.
