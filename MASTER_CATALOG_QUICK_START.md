# Master Catalog Enricher - Quick Start Guide

## ✅ Setup

### 1. Build Backend
```bash
cd backend
npm run build
```

### 2. Verify Imports
```bash
# Check that all TypeScript compiles
npm run lint
```

### 3. Test Master Script Locally
```bash
# Ejecutar directamente (requiere MongoDB conectado)
npm run enrich:master

# O en watch mode (desarrollo)
npm run enrich:master:dev
```

## 🚀 Uso

### Opción A: Desde CLI (Backend Script)
```bash
cd backend
npm run enrich:master
```

**Output esperado:**
```
📥 Cargados 13245 items de Hot Wheels
📥 Cargados 1240 items de Mini GT
...
📊 Procesados 1000/15341 items...
✅ Enriquecimiento completado en 45s

📊 ===== ESTADÍSTICAS FINALES =====
{
  "totalProcessed": 15341,
  "photosCoverage": {
    "percentWithMainPhoto": 81.2
  },
  ...
}
```

### Opción B: Desde API + Frontend (Recomendado)

**Backend:**
```bash
npm run dev  # Inicia servidor en puerto 3001
```

**Frontend:**
```bash
cd frontend
npm run dev  # Inicia en puerto 5173
```

**En browser:**
1. Navegar a `http://localhost:5173`
2. Login (si aplica)
3. Buscar botón "🔄 Actualizar Catálogo"
4. Modal se abre, muestra progreso en tiempo real
5. Esperar a completar

**Console esperada:**
```
✅ Enriquecimiento completado
💾 Stats guardadas en: /data/enrichment-stats-2026-03-09T12-00-00-000Z.json
```

## 🔍 Verificar Datos en MongoDB

```bash
# Connect to MongoDB
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/hot-wheels"

# Check enriched items
db.hotwheelscars.findOne({ toy_num: "13609" })

# Should show:
{
  carModel: "Speed Blaster",
  colorGroup: "Blue",
  colorVariant: "Glitter",
  colorHex: "#0066FF",
  hwSeriesType: "mainline",
  photoValidation: { ... },
  enrichmentMetadata: { ... }
}
```

## 📊 Monitorear Progreso

### Endpoint Status (Polling)
```bash
# Durante enriquecimiento
curl http://localhost:3001/api/catalog/enrich/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inProgress": true,
    "lastProgress": {
      "step": "classifying",
      "message": "🔍 Clasificando tipos de series...",
      "percent": 35,
      "currentBrand": "Hot Wheels",
      "processedItems": 5234,
      "totalItems": 15341
    }
  }
}
```

### Get Final Stats
```bash
# Después de completar
curl http://localhost:3001/api/catalog/enrich/stats
```

## 🧪 Test Cases

### Test 1: Verificar Colores Normalizados
```javascript
// En MongoDB
db.hotwheelscars.aggregate([
  { $group: { _id: "$colorGroup", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]).toArray()

// Output:
[
  { "_id": "Blue", "count": 1152 },
  { "_id": "Red", "count": 1403 },
  { "_id": "Silver", "count": 892 },
  ...
]
```

### Test 2: Verificar Cobertura de Fotos
```javascript
db.hotwheelscars.aggregate([
  { $group: {
    _id: "$photoValidation.usedPhotoSource",
    count: { $sum: 1 }
  }}
]).toArray()

// Output:
[
  { "_id": "main", "count": 12450 },
  { "_id": "carded", "count": 1200 },
  { "_id": "gallery", "count": 1500 },
  { "_id": "none", "count": 191 }
]
```

### Test 3: Verificar Series Types (Hot Wheels)
```javascript
db.hotwheelscars.aggregate([
  { $match: { brand: "Hot Wheels" } },
  { $group: {
    _id: "$hwSeriesType",
    count: { $sum: 1 }
  }},
  { $sort: { count: -1 } }
]).toArray()

// Output:
[
  { "_id": "mainline", "count": 10450 },
  { "_id": "premium", "count": 1200 },
  { "_id": "sth", "count": 350 },
  { "_id": "th", "count": 245 },
  ...
]
```

## 🛠️ Troubleshooting

### Error: "ENOENT: no such file or directory"
**Causa:** Falta archivo JSON
**Solución:**
```bash
# Verificar que exista
ls -la backend/data/hotwheels_database.json
# Si falta, restaurar o ejecutar sync antes
npm --prefix backend run sync-to-mongo
```

### Error: "MongoDB connection refused"
**Causa:** MongoDB no conecta
**Solución:**
```bash
# Verificar variable de entorno
echo $MONGODB_URI

# O en .env backend/
cat backend/.env | grep MONGODB_URI

# Probar conexión:
mongosh "$MONGODB_URI"
```

### SSE "Connection lost" en Frontend
**Causa:** Timeout o error de CORS
**Solución:**
```javascript
// En backend/src/routes/catalogEnrichmentRoutes.ts, verificar:
res.setHeader('Access-Control-Allow-Origin', '*')  // ✅ Debe existir
```

### Lentitud / Timeout
**Causa:** Base de datos lenta o sin índices
**Solución:**
```bash
# Crear índices
npm --prefix backend run create-indexes

# O manual:
db.hotwheelscars.createIndex({ toy_num: 1 })
db.hotwheelscars.createIndex({ brand: 1, year: 1 })
```

## 📈 Performance Tips

### Para 100k+ items
1. **Batch Upserts:** Aumentar batch size en master-catalog-enrich.ts
```typescript
if ((i + 1) % 1000 === 0) { // De 500 a 1000
```

2. **Índices:** Crear índices antes de sync
```bash
npm --prefix backend run create-indexes
```

3. **Parallelización:** (Futura mejora) Usar Worker Threads

## 📚 Archivos de Referencia

| Archivo | Descripción |
|---------|-------------|
| `master-catalog-enrich.ts` | Script principal de orquestación |
| `catalogClassificationService.ts` | Lógica de clasificación |
| `catalogPhotoService.ts` | Validación y priorización de fotos |
| `catalogEnrichmentRoutes.ts` | API endpoints |
| `CatalogEnrichmentDialog.tsx` | Componente React |
| `useCatalogEnrichment.ts` | Hook React |
| `MASTER_CATALOG_ARCHITECTURE.md` | Documentación técnica completa |

## 🚀 Next Steps

1. ✅ Build & Test localmente
2. ✅ Deploy a producción
3. ⬜ Monitorear ejecuciones
4. ⬜ Agregar filtros por color en UI
5. ⬜ Exportar CSV con datos enriquecidos
6. ⬜ Implementar caché Redis para estadísticas

## 📞 Debug Mode

Para más detalles de ejecución:

```bash
# Backend
DEBUG=* npm run enrich:master

# Frontend (en Chrome DevTools)
console.log(...) para todos los eventos SSE
```

## ✨ Done!

Todas las piezas están en lugar. Ready to enrich! 🎉
