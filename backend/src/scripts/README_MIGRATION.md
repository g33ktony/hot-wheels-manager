# Migración de Campos de Pago en Entregas

## 📋 Descripción

Este script actualiza todas las entregas existentes en la base de datos para incluir los nuevos campos de seguimiento de pagos introducidos en la versión con sistema de pagos.

## 🎯 Qué hace

El script agrega automáticamente los siguientes campos a las entregas que no los tienen:

- `paidAmount`: 0 (sin pagos realizados)
- `paymentStatus`: 'pending' (estado pendiente)
- `payments`: [] (historial de pagos vacío)

## 🚀 Cómo ejecutar

### Opción 1: Localmente con ts-node

```bash
cd backend
npx ts-node src/scripts/migrateDeliveryPayments.ts
```

### Opción 2: Compilado con Node.js

```bash
cd backend
npm run build
node dist/scripts/migrateDeliveryPayments.js
```

### Opción 3: Usando npm script (recomendado)

Agrega este script a tu `backend/package.json`:

```json
{
  "scripts": {
    "migrate:delivery-payments": "ts-node src/scripts/migrateDeliveryPayments.ts"
  }
}
```

Luego ejecuta:

```bash
cd backend
npm run migrate:delivery-payments
```

## ⚠️ Importante

- **Backup**: Se recomienda hacer un backup de la base de datos antes de ejecutar la migración
- **Una sola vez**: Este script solo necesita ejecutarse una vez después de desplegar la actualización
- **Seguro**: El script solo actualiza entregas que no tienen los campos, no modifica entregas ya actualizadas
- **Reversible**: Si algo sale mal, puedes restaurar desde el backup

## 📊 Output esperado

```
🚀 Starting Delivery Payment Fields Migration...

🔄 Connecting to MongoDB...
✅ Connected to MongoDB
🔄 Finding deliveries without payment fields...
📦 Found 25 deliveries to update
  ⏳ Updated 10/25 deliveries...
  ⏳ Updated 20/25 deliveries...

📊 Migration Summary:
  ✅ Successfully updated: 25 deliveries
  ❌ Failed: 0 deliveries
  📦 Total processed: 25 deliveries

🎉 Migration completed successfully!
🔌 Disconnected from MongoDB
```

## 🔍 Verificación

Para verificar que la migración fue exitosa, puedes ejecutar esta consulta en MongoDB:

```javascript
// Verificar entregas sin campos de pago
db.deliveries.find({
  $or: [
    { paidAmount: { $exists: false } },
    { paymentStatus: { $exists: false } },
    { payments: { $exists: false } }
  ]
}).count()

// Debe retornar 0
```

## 🐛 Troubleshooting

### Error: "Cannot connect to MongoDB"

- Verifica que MongoDB esté corriendo
- Verifica la variable de entorno `MONGODB_URI` en tu archivo `.env`
- Verifica las credenciales de conexión

### Error: "Module not found"

```bash
# Instala las dependencias
cd backend
npm install
```

## 📝 Notas

- El frontend ya está preparado para manejar entregas con o sin campos de pago
- Los valores por defecto son compatibles con el comportamiento esperado
- No es necesario ejecutar esta migración para que la app funcione, pero es recomendado para limpiar los datos

## 🆘 Soporte

Si encuentras algún problema:

1. Revisa los logs del script
2. Verifica la conexión a MongoDB
3. Asegúrate de tener las últimas versiones del código
4. Contacta al equipo de desarrollo si el problema persiste
