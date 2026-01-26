# Quick Start - Migración de Fechas con Railway MongoDB

## ⚡ TL;DR (5 minutos)

### 1. Verifica conexión a Railway
```bash
cd backend
echo $MONGODB_URI  # Debe mostrar tu URL de Railway
```

Si no está configurado:
- Ve a [Railway Dashboard](https://railway.app)
- Abre tu proyecto
- Copia el `DATABASE_URL` o `MONGODB_URI`
- En terminal: `export MONGODB_URI="tu_url_aqui"`

### 2. Ver Preview (sin cambios)
```bash
npm run fix:dates:preview
```

### 3. Crear Backup en Railway
- Ve a Railway Dashboard → Tu Proyecto → Plugins → MongoDB → Backups
- Click "Create Backup"

### 4. Ejecutar migración
```bash
npm run fix:dates
```

Responde `SÍ` cuando te pida confirmación.

### 5. Esperar a que termine
- Mostrará cuántos registros se corrigieron
- ✅ Listo

## 🔍 Verificar que Funcionó

```bash
# Abre MongoDB en Railway
mongosh "$MONGODB_URI"

# En la shell:
use hot-wheels-manager
db.deliveries.findOne()
# Debe mostrar scheduledDate correcta
```

Luego abre tu app en `/dashboard`:
- ✅ "Entregas del Día" debe mostrar entregas de HOY
- ✅ No debe haber datos cruzados

## ❌ Si algo sale mal

Restaura el backup en Railway:
1. Railway Dashboard → Plugins → MongoDB → Backups
2. Selecciona el backup que hiciste
3. Click "Restore"

## 📚 Documentación Completa

Ver `GUIA_MIGRACION_FECHAS.md` para:
- Instrucciones detalladas
- Solución de problemas
- Opciones avanzadas
- Cómo revertir
