# Script de Migración de Fechas - Guía Completa (Railway MongoDB)

## 📋 Descripción

Este script corrige todas las fechas históricas que fueron guardadas con desfase de 6 horas debido al bug de timezone.

Corrige:
- ✅ `Deliveries`: `scheduledDate`, `completedDate`, `payments[].paymentDate`
- ✅ `Sales`: `saleDate`, `paymentHistory[].date`
- ✅ `PendingItems`: `reportedDate`
- ✅ `Purchases`: `purchaseDate`, `deliveryDate`

## 🔍 Antes de Ejecutar

### ⚠️ IMPORTANTE - Requisitos de Seguridad

1. **Verifica tu variable de entorno `MONGODB_URI`**:
   - Asegúrate de tener la conexión a Railway configurada
   - En Railway: Ve a tu Variable → Database → copia la `DATABASE_URL`
   - Local: Debe estar en `.env` apuntando a Railway

2. **CREA UN BACKUP** en Railway:
   ```bash
   # En Railway, descarga un backup
   # Ve a: Railway Dashboard → Plugins → MongoDB → Backups → Trigger Backup
   # O usa mongoexport si tienes acceso remoto
   mongoexport --uri "tu_mongodb_uri" --db hot-wheels-manager --collection deliveries --out backup_deliveries.json
   ```

3. **No interrumpas el proceso** una vez iniciado

## 🚀 Cómo Usar

### Paso 1: Verificar Conexión a Railway

```bash
# En la carpeta backend, verifica que puedas conectarte
cd backend

# Verifica que tienes MONGODB_URI configurado
echo $MONGODB_URI
# Debe mostrar algo como: mongodb+srv://user:pass@cluster.mongodb.net/hot-wheels-manager

# Si no está configurado, cópialo de Railway:
export MONGODB_URI="mongodb+srv://user:pass@railway-cluster.mongodb.net/hot-wheels-manager"
```

### Paso 2: Ver Preview (SIN REALIZAR CAMBIOS)

```bash
cd backend
npm run fix:dates:preview
```

Esto te mostrará:
- Cuántos registros serán afectados
- Ejemplos de qué fechas cambiarán
- NO hace cambios en la DB

**Output esperado:**
```
📦 Analizando Deliveries...
   ✅ 42 entregas con cambios identificadas
   Ejemplos de cambios:
   [1] Entrega de Juan Pérez:
       scheduledDate: 2026-01-24 → 2026-01-23

💰 Analizando Sales...
   ✅ 15 ventas con cambios identificadas
   ...
```

### Paso 3: Crear Backup en Railway (RECOMENDADO)

```bash
# Opción A: Usar Railway Dashboard
# 1. Ve a: https://railway.app
# 2. Abre tu proyecto
# 3. Ve a "Plugins" o "Data"
# 4. Busca MongoDB
# 5. Click en "Backups"
# 6. Click en "Create Backup"

# Opción B: Exportar colecciones (si tienes acceso)
mongoexport --uri "$MONGODB_URI" --collection deliveries --out backup_deliveries_$(date +%Y%m%d).json
mongoexport --uri "$MONGODB_URI" --collection sales --out backup_sales_$(date +%Y%m%d).json
```

### Paso 4: Ejecutar la Migración

```bash
cd backend
npm run fix:dates
```

**El script te pedirá confirmación:**
```
⚠️ ADVERTENCIA: Estás a punto de ejecutar la migración REAL

✅ Esta acción:
   1. Corregirá todas las fechas con desfase de 6 horas
   2. Afectará Entregas, Ventas, Items Pendientes y Compras
   3. Los cambios son PERMANENTES

❌ IMPORTANTE:
   - Asegúrate de tener un BACKUP de tu base de datos en Railway
   - No interrumpas el proceso mientras se ejecuta
   - Verifica los resultados después

¿Estás seguro de continuar? (escribe 'SÍ' para confirmar):
```

Responde: `SÍ` (o `SI`)

### Paso 5: Esperar a que Termine

El script mostrará el progreso:
```
Iniciando migración... ⏳
═══════════════════════════════════════
📦 Analizando Deliveries...
   ✅ 42 entregas con cambios identificadas
```

⏳ Analizando PendingItems...
   ✅ 8 items pendientes con cambios identificados

📋 Analizando Purchases...
   ✅ 5 compras con cambios identificadas

═══════════════════════════════════════
🎉 MIGRACIÓN COMPLETADA CON ÉXITO
═══════════════════════════════════════
📊 Total de registros afectados: 70
   - Entregas: 42
   - Ventas: 15
   - Items Pendientes: 8
   - Compras: 5
═══════════════════════════════════════
```

## ✅ Verificar que Funcionó

### 1. Verificar en MongoDB (Railway)

```javascript
// En MongoDB shell de Railway (via Railway CLI o Dashboard)
// O usa mongosh si tienes conexión remota:
mongosh "$MONGODB_URI"

// Luego en la shell:
use hot-wheels-manager
db.deliveries.findOne({})
// Verifica que scheduledDate sea una fecha correcta en UTC

// Ejemplo:
// Antes: ISODate("2026-01-25T06:00:00.000Z") (sábado - INCORRECTO)
// Después: ISODate("2026-01-24T00:00:00.000Z") (viernes - CORRECTO)
```

### 2. Verificar en la App

1. Abre `/dashboard`
   - ✅ "Entregas del Día" debe mostrar entregas de HOY
   - ✅ No debe haber entregas de ayer o mañana

2. Ve a `/deliveries`
   - ✅ Las fechas deben corresponder a los días correctos
   - ✅ El filtro "hace 30 días" debe mostrar entregas correctas

3. Ve a `/sales` (si existe)
   - ✅ Las ventas deben estar en el día correcto

## 🔄 Si Necesitas Revertir

Si algo salió mal y necesitas restaurar el backup en Railway:

```bash
# Opción A: Desde Railway Dashboard
# 1. Ve a tu proyecto en Railway
# 2. Abre el plugin MongoDB
# 3. Ve a "Backups"
# 4. Selecciona el backup anterior
# 5. Click "Restore"

# Opción B: Restaurar desde JSON exportado
mongoimport --uri "$MONGODB_URI" --collection deliveries --file backup_deliveries.json --drop
mongoimport --uri "$MONGODB_URI" --collection sales --file backup_sales.json --drop

# Opción C: Si tienes acceso a Railway CLI
railway run mongorestore --uri "$MONGODB_URI" --archive < backup.archive
```

## 🛠️ Opciones Avanzadas

### Modificar el Desfase Horario

Si tu timezone no es UTC-6, edita `fixDateMigration.ts`:

```typescript
// Línea ~25
const TIMEZONE_OFFSET_MS = 6 * 60 * 60 * 1000;  // Cambia 6 por tu valor

// Ejemplos:
// UTC-5: 5 * 60 * 60 * 1000
// UTC-6: 6 * 60 * 60 * 1000
// UTC-7: 7 * 60 * 60 * 1000
```

### Ejecutar solo ciertos tipos de documentos

Modifica `fixDateMigration.ts` y comenta las funciones que no necesites.

## 📊 Datos Técnicos

- **Desfase**: 6 horas (21,600,000 ms) - Ajusta según tu timezone
- **Afecta**: 4 colecciones en Railway MongoDB
  - Deliveries
  - Sales
  - PendingItems
  - Purchases
- **Tiempo estimado**: Depende del número de registros
  - 100 registros: ~5-10 segundos
  - 1000 registros: ~30-60 segundos
  - 10000 registros: ~5-10 minutos
- **Reversible**: Sí, con backup en Railway
- **Conexión**: Usa `MONGODB_URI` de Railroad (está en variables de entorno)

## 🚂 Integración con Railway

### Variable de Entorno

El script automáticamente usa:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hot-wheels-manager
```

Si Railway la llamó diferente, actualiza en `fixDateMigration.ts`:
```typescript
const mongoUri = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager';
```

### Ejecutar Localmente con Conexión a Railway

```bash
# Desde tu máquina local, usando la conexión de Railway
export MONGODB_URI="(copia tu valor de Railway)"
cd backend
npm run fix:dates:preview
npm run fix:dates
```

### Ejecutar en Railway CLI

```bash
# Si tienes railway CLI instalado:
railway link  # Vincula tu proyecto
railway run npm run fix:dates:preview
railway run npm run fix:dates
```

## ❓ Preguntas Frecuentes

**P: ¿Puedo ejecutar esto sin backup?**
R: No. SIEMPRE crea un backup antes.

**P: ¿Qué pasa si interrumpo el script?**
R: Algunos registros pueden estar parcialmente corregidos. Restaura desde backup.

**P: ¿Afecta a los nuevos registros?**
R: No. Solo afecta registros históricos. Los nuevos usarán las funciones corregidas.

**P: ¿Puedo ejecutarlo múltiples veces?**
R: Sí, es seguro. Detecta qué ya fue corregido y no hace cambios innecesarios.

**P: ¿Cuánto tiempo tarda?**
R: Depende de tu DB. Prueba con `--preview` primero.

## 📞 Si Hay Problemas

1. Verifica que MongoDB esté accesible
2. Revisa los logs en `MONGODB_URI`
3. Asegúrate de tener permisos de escritura
4. Restaura desde backup si es necesario
5. Contacta al desarrollador con los logs
