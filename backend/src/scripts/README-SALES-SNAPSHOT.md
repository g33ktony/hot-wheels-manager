# Sales Snapshot Migration Script

## 📋 Descripción

Este script de migración actualiza todas las ventas existentes para incluir un **snapshot (instantánea)** de los datos del inventario en el momento de la venta. Esto incluye:

- **Fotos** del item vendido
- **Índice de foto principal** (`primaryPhotoIndex`)
- **Precio de costo** (`costPrice`)
- **Ganancia recalculada** (`profit`)

## 🎯 Por qué es necesario

Antes de este cambio, las ventas no guardaban las fotos ni el precio de costo directamente. Esto causaba problemas:

1. **Sin fotos en tarjetas de ventas**: Las ventas creadas desde entregas no mostraban imágenes
2. **Datos perdidos**: Si se eliminaba un item del inventario, la venta perdía toda la información visual
3. **Métricas incorrectas**: No se podía calcular correctamente la ganancia histórica

## 🚀 Cómo ejecutar

### Opción 1: Con npm/yarn (Recomendado)

```bash
# Desde la raíz del proyecto
cd backend
npm run migrate:sales-snapshot

# O con yarn
yarn migrate:sales-snapshot
```

### Opción 2: Directamente con tsx

```bash
# Desde la raíz del proyecto
npx tsx backend/src/scripts/migrateSalesSnapshot.ts

# O desde backend/
cd backend
npx tsx src/scripts/migrateSalesSnapshot.ts
```

## 📊 Qué hace el script

1. **Conecta a MongoDB** usando las variables de entorno
2. **Busca todas las ventas** en la base de datos
3. **Para cada venta**:
   - Revisa cada item de la venta
   - Si el item no tiene fotos, `primaryPhotoIndex` o `costPrice`:
     - Busca el item correspondiente en el inventario usando `inventoryItemId`
     - Copia las fotos, `primaryPhotoIndex` y `purchasePrice` (como `costPrice`)
     - Recalcula el `profit` basado en el nuevo `costPrice`
     - Guarda los cambios
4. **Muestra un resumen** con estadísticas de la migración

## 📈 Ejemplo de salida

```
🚀 Starting sales snapshot migration...

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Found 45 total sales

  ✓ Updated item: 2024-HW-001 - Corvette C8.R
  ✓ Updated item: 2024-HW-002 - Nissan Skyline GT-R
✅ Updated sale 507f1f77bcf86cd799439011 (Customer: Juan Pérez)

  ⚠️  Inventory item not found for: 2024-HW-OLD (ID: 507f1f77bcf86cd799439099)

============================================================
📊 MIGRATION SUMMARY
============================================================
Total sales processed:          45
Sales updated:                  12
Sales with items without data:  3
Individual items updated:       28
Items not found in inventory:   2
Errors encountered:             0
============================================================

🔌 Disconnected from MongoDB

✅ Migration completed successfully!
```

## ⚠️ Consideraciones

### Items no encontrados en inventario

El script mostrará advertencias para items que tienen `inventoryItemId` pero ya no existen en el inventario. Esto puede ocurrir si:

- El item fue eliminado del inventario
- La venta es muy antigua y el inventario ha cambiado mucho
- Es un item de catálogo o venta POS sin inventario asociado

**Estos items se saltarán** y la venta se dejará sin modificar.

### Items sin `inventoryItemId`

Los items que no tienen `inventoryItemId` (ventas POS o items de catálogo) se saltarán automáticamente con un mensaje informativo.

### Backup recomendado

Antes de ejecutar el script en producción, se recomienda:

```bash
# Hacer backup de la base de datos
mongodump --uri="mongodb://localhost:27017/hotwheels" --out=./backup-$(date +%Y%m%d)
```

## 🔄 Reversión

Si algo sale mal, puedes restaurar desde el backup:

```bash
mongorestore --uri="mongodb://localhost:27017/hotwheels" ./backup-YYYYMMDD
```

## 🔧 Variables de entorno necesarias

El script usa las siguientes variables de entorno del archivo `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/hotwheels
```

Si no está definida, usará `mongodb://localhost:27017/hotwheels` por defecto.

## 📝 Notas técnicas

### Comportamiento idempotente

El script es **idempotente**, es decir, puede ejecutarse múltiples veces sin causar problemas:

- Solo actualiza items que NO tienen fotos/costPrice
- No sobreescribe datos existentes
- Puede ejecutarse de forma segura después de agregar nuevas ventas

### Performance

El script procesa ventas secuencialmente para evitar sobrecarga en la base de datos. Para miles de ventas, puede tomar varios minutos.

## 🐛 Solución de problemas

### Error: Cannot connect to MongoDB

Verifica que:
1. MongoDB esté corriendo
2. La variable `MONGODB_URI` esté correctamente configurada
3. Tengas permisos de lectura/escritura en la base de datos

### Error: Model not found

Asegúrate de ejecutar el script desde la carpeta correcta y que las rutas de imports sean válidas.

## 📚 Cambios relacionados

Este script es parte de la mejora para guardar snapshots de items en las ventas:

- **Modelo Delivery**: Ahora guarda `photos`, `primaryPhotoIndex` y `costPrice` en `DeliveryItem`
- **Modelo Sale**: Ahora guarda `primaryPhotoIndex` en `SaleItem`
- **Controller de Deliveries**: Enriquece entregas con datos del inventario al crear/actualizar
- **Función createSalesFromDelivery**: Copia el snapshot de la entrega a la venta

## 📞 Soporte

Si encuentras problemas, revisa los logs del script. La mayoría de errores incluyen información detallada sobre qué salió mal.
