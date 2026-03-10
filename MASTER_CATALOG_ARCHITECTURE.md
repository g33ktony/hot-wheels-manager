# Master Catalog Enrichment System - Arquitectura & Integración

**Versión:** 1.0.0  
**Fecha:** 2026-03-09  
**Status:** Implementado

## 📋 Visión General

Sistema unificado para enriquecimiento de catálogos de múltiples marcas (Hot Wheels, Mini GT, Pop Race, Kaido House, Tomica) con:

- ✅ Clasificación automática de tipos de series (STH, TH, Premium, Team Transport, etc)
- ✅ Normalización de colores con grupos estandardizados
- ✅ Validación y priorización de fotografías
- ✅ Sincronización con MongoDB
- ✅ Progreso en tiempo real con SSE
- ✅ API RESTful para control

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  CatalogEnrichmentDialog → useCatalogEnrichment Hook        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    SSE (Server-Sent Events)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              BACKEND API (Express)                           │
│  catalogEnrichmentRoutes                                    │
│  - POST /api/catalog/enrich                                 │
│  - GET /api/catalog/enrich/status                           │
│  - GET /api/catalog/enrich/stats                            │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│           Master Catalog Enricher                            │
│  (src/scripts/master-catalog-enrich.ts)                     │
├──────────────────────────────────────────────────────────────┤
│  1. Load Phase                                               │
│     ├─ Cargar hotwheels_database.json                       │
│     ├─ Cargar mini-gt_database.json                         │
│     ├─ Cargar pop-race_database.json                        │
│     ├─ Cargar kaido-house_database.json                     │
│     └─ Cargar tomica_database.json                          │
│                                                               │
│  2. Classify Phase                                           │
│     ├─ CatalogClassificationService                         │
│     ├─ Detectar brand                                        │
│     ├─ Clasificar HW series type (STH/TH/Premium/etc)      │
│     └─ Validar carded photos vs main                        │
│                                                               │
│  3. Normalize Phase                                          │
│     ├─ CatalogColorNormalizer                               │
│     ├─ Agrupar colores (Red/Blue/Green/etc)                │
│     └─ Generar color hex codes                              │
│                                                               │
│  4. Photo Priority Phase                                     │
│     ├─ CatalogPhotoService                                  │
│     ├─ Main photo → Carded (validado) → Gallery             │
│     └─ Calcular cobertura (target 95%)                      │
│                                                               │
│  5. Enrich Phase                                             │
│     ├─ Agregar metadatos (colorGroup, hwSeriesType)        │
│     ├─ Generar posiciones en serie                          │
│     └─ Crear photoValidation report                         │
│                                                               │
│  6. Sync Phase                                               │
│     └─ MongoDB: upsert via HotWheelsCarModel                │
│                                                               │
│  7. Progress Emission                                        │
│     └─ EventSource SSE para UI real-time                    │
└──────────────────────────────────────────────────────────────┘
             │          │           │           │
             ▼          ▼           ▼           ▼
    ┌────────────────────────────────────────────────┐
    │        SERVICIOS COMPARTIDOS                   │
    ├────────────────────────────────────────────────┤
    │ catalogClassificationService.ts               │
    │ catalogPhotoService.ts                        │
    │ catalogColorNormalizer.ts (future)            │
    └────────────────────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────────┐
    │     MONGODB (HotWheelsCarModel)                │
    │ - Almacena items enriquecidos                  │
    │ - Índices por serie, año, color               │
    │ - Metadatos de enriquecimiento                 │
    └────────────────────────────────────────────────┘
```

## 🔄 Flujo de Ejecución

### 1. Desde Frontend
```typescript
// Usuario hace clic en "Actualizar Catálogo"
// Modal abre → onClick → useCatalogEnrichment.startEnrichment()
// Hook hace POST /api/catalog/enrich
// Abre EventSource para consumir SSE
```

### 2. Backend Inicia
```typescript
POST /api/catalog/enrich
→ Verifica si ya hay enriquecimiento en progreso
→ Retorna SSE headers
→ Crea MasterCatalogEnricher instance
→ Registra progress callbacks
→ Inicia async enricher.enrich()
```

### 3. Enriquecimiento Ejecuta
```
load() → 15%
  ├─ Hot Wheels: 13.2k items
  ├─ Mini GT: 1.2k items
  └─ ... otras marcas
     ↓
classify() → 45%
  ├─ Detectar brand (automático)
  ├─ Clasificar series types
  └─ Validar photos
     ↓
normalize() → 60%
  ├─ Normalizar colores
  └─ Generar hex codes
     ↓
enrich() → 80%
  ├─ Agregar metadatos
  └─ Calcular estadísticas
     ↓
sync() → 95%
  ├─ MongoDB: upsert por toy_num
  └─ Batch operations
     ↓
complete() → 100%
  └─ Emitir estadísticas finales
```

### 4. Frontend Recibe Actualizaciones
```typescript
EventSource onmessage
→ Parse CatalogEnrichmentProgress
→ setProgress(data)
→ Actualizar UI Progress Bar
→ Mostrar stats live
→ Si error → mostrar error
→ Si complete → cerrar cuando usuario haga clic
```

## 📊 Estructuras de Datos

### EnrichedCatalogItem (Input → Output)
```typescript
// Input (del JSON original)
{
  toy_num: "13609",
  carModel: "Speed Blaster",
  series: "1995 Model Series",
  year: "1995",
  color: "Blue w/ Pink Glitter",
  photo_url: "wiki-file:...",
  photo_url_carded: "",
  photo_gallery: [],
  segment: "mainline"
}

// Output (enriquecido)
{
  ...original fields,
  brand: "Hot Wheels",
  hwSeriesType: "mainline",
  colorGroup: "Blue",
  colorVariant: "Glitter",
  colorHex: "#0066FF",
  photoValidation: {
    hasMainPhoto: true,
    hasCardedPhoto: false,
    hasGallery: false,
    usedPhotoSource: "main",
    cardedValidated: false
  },
  enrichmentMetadata: {
    processedAt: "2026-03-09T...",
    version: "1.0.0",
    dataQuality: "high"
  }
}
```

### CatalogEnrichmentProgress (SSE Event)
```typescript
{
  step: "classifying" | "normalizing" | "validating-photos" | "enriching" | "syncing" | "complete",
  message: "🔍 Clasificando tipos de series...",
  percent: 35,
  currentBrand: "Hot Wheels",
  processedItems: 4325,
  totalItems: 15341,
  stats?: {
    itemsWithMainPhoto: 12450,
    itemsWithCardedPhoto: 2100,
    itemsWithGallery: 850,
    itemsClassified: 15341,
    colorsNormalized: 2045
  },
  error?: {
    code: "ENRICH_ERROR",
    message: "...",
    context?: {}
  }
}
```

## 🔌 Integración: Cómo Conectar al Proyecto

### Backend (Express)

1. **Actualizar `src/index.ts`**
```typescript
import catalogEnrichmentRoutes from './routes/catalogEnrichmentRoutes'

// En la sección de rutas:
app.use('/api/catalog', catalogEnrichmentRoutes)
```

2. **Verificar Mongo conectado**
```bash
npm run dev  # Debe conectar a MongoDB Atlas
```

### Frontend (React)

1. **Importar Componente**
```typescript
import CatalogEnrichmentDialog from './components/CatalogEnrichmentDialog'

function App() {
  const [isEnrichmentOpen, setIsEnrichmentOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsEnrichmentOpen(true)}>
        🔄 Actualizar Catálogo
      </button>
      <CatalogEnrichmentDialog
        isOpen={isEnrichmentOpen}
        onClose={() => setIsEnrichmentOpen(false)}
        onComplete={() => {
          // Recargar catálogo en la página actual
          window.location.reload()
        }}
      />
    </>
  )
}
```

2. **Agregar Import en shared/catalog-types.ts**
```typescript
// Ya existe, solo asegúrate de que esté en tsconfig paths
```

## 📋 Campos Nuevos en MongoDB

Cuando un item es sincronizado, estos campos se agregan:

```javascript
db.hotwheelscars.findOne({ toy_num: "13609" })
→ {
    // ... campos originales ...
    colorGroup: "Blue",           // Red, Blue, Green, etc
    colorVariant: "Glitter",      // Metallic, Pearl, Spectraflame, etc
    colorHex: "#0066FF",          // Hex code para UI
    hwSeriesType: "mainline",     // Para Hot Wheels
    seriesPosition: "1/12",       // Si disponible
    yearPosition: undefined,      // Si disponible
    photoValidation: {
      hasMainPhoto: true,
      hasCardedPhoto: false,
      hasGallery: false,
      usedPhotoSource: "main",
      cardedValidated: false
    },
    enrichmentMetadata: {
      processedAt: "2026-03-09T12:00:00Z",
      version: "1.0.0",
      dataQuality: "high"
    }
  }
```

## 🎨 UI: Item Display

En cards/tables que muestren items, puede usarse:

```typescript
<div className="item-card">
  <img src={item.photo_url} alt={item.carModel} />
  
  {/* Color Indicator */}
  <div
    className="color-indicator"
    style={{ backgroundColor: item.colorHex }}
    title={item.color}
  />
  
  <h3>{item.carModel}</h3>
  
  {/* Badges */}
  <div className="badges">
    {item.hwSeriesType === 'sth' && <span className="badge sth">STH</span>}
    {item.hwSeriesType === 'th' && <span className="badge th">TH</span>}
    {item.hwSeriesType === 'premium' && <span className="badge premium">Premium</span>}
  </div>
  
  {/* Info */}
  <p>Año: {item.year}</p>
  <p>Color: {item.color}</p>
  <p>Serie: {item.series}</p>
  {item.seriesPosition && <p>Posición: {item.seriesPosition}</p>}
</div>
```

## 🔍 API Reference

### POST /api/catalog/enrich
Inicia enriquecimiento con SSE streaming

**Respuesta:** Flujo SSE de `CatalogEnrichmentProgress`

```bash
curl -X POST http://localhost:3001/api/catalog/enrich
# Receive: Server-Sent Events stream
```

### GET /api/catalog/enrich/status
Estado actual del enriquecimiento

```bash
curl http://localhost:3001/api/catalog/enrich/status
# Response:
{
  "success": true,
  "data": {
    "inProgress": false,
    "lastProgress": { ... }
  }
}
```

### GET /api/catalog/enrich/stats
Última estadística disponible (si completó)

```bash
curl http://localhost:3001/api/catalog/enrich/stats
# Response:
{
  "success": true,
  "data": {
    "step": "complete",
    "stats": {
      "totalProcessed": 15341,
      "photosCoverage": { ... },
      ...
    }
  }
}
```

## 🧪 Testing

### Local Testing Script
```bash
# Build first
npm --prefix backend run build

# Ejecutar master script directamente
npm --prefix backend run enrich:master

# Watches changes
npm --prefix backend run enrich:master:dev
```

### Frontend Testing
```typescript
// En CatalogEnrichmentDialog.tsx, cambiar:
const fakeProgress = {
  step: 'classifying',
  message: '🔍 Clasificando...',
  percent: 45,
  // ... etc
}
// setProgress(fakeProgress)  // Para testing UI
```

## 📈 Performance & Optimization

### Batch Operations
MongoDB bulk operations para sincronización:
- Batch size: ~500 items
- Índices en: toy_num, series, year, colorGroup
- Upsert strategy: por toy_num (unique)

### Memory Management
- Stream processing de items (no cargar todo en memoria)
- Callbacks para progreso (no accumular)
- CleanUp automático de EventSources

### Escalabilidad
- Currently: Sincrónico (bueno para < 50k items)
- Future: Async queue (BullMQ) para > 100k items

## 🚀 Deployment

### Environment Variables
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hot-wheels
```

### Build
```bash
npm run build:backend
npm run build:frontend
```

### Running
```bash
npm start  # Backend on port 3001
npm run dev:frontend  # Frontend on port 5173
```

## 📝 Logging Sample

```
🔄 Iniciando enriquecimiento de catálogo maestro...
✅ Catálogos cargados: 15341 items
📥 Cargados 13245 items de Hot Wheels
📥 Cargados 1240 items de Mini GT
... (otras marcas)
🔍 Clasificando tipos de series...
📊 Procesados 100/15341 items...
📊 Procesados 500/15341 items...
🎨 Normalizando colores...
📸 Validando fotos...
💾 Sincronizando con MongoDB...
✅ 15341 items sincronizados a MongoDB
✅ Enriquecimiento completado en 45s

📊 ===== ESTADÍSTICAS FINALES =====
{
  "totalProcessed": 15341,
  "brandBreakdown": { "Hot Wheels": 13245, "Mini GT": 1240, ... },
  "photosCoverage": {
    "withMainPhoto": 12450,
    "withCardedPhoto": 2100,
    "withGallery": 850,
    "withoutPhoto": 141,
    "percentWithMainPhoto": 81.2
  },
  "colorNormalization": {
    "totalUnique": 2045,
    "groupedInto": 15,
    "byGroup": { "Red": 1403, "Blue": 1152, ... }
  },
  ...
}
```

## 🔧 Troubleshooting

| Problema | Solución |
|----------|----------|
| "Enriquecimiento ya en progreso" | Esperar a que termine o reiniciar backend |
| SSE connection timeout | Verificar CORS headers en backend |
| MongoDB connection failed | Verificar MONGODB_URI y credentials |
| Memory leak en Node | Verificar EventSource cleanup en hook |

## 📚 Archivos Clave

```
backend/
├── src/
│   ├── scripts/
│   │   └── master-catalog-enrich.ts          ← MAIN
│   ├── services/
│   │   ├── catalogClassificationService.ts   ← Logic
│   │   └── catalogPhotoService.ts            ← Logic
│   └── routes/
│       └── catalogEnrichmentRoutes.ts        ← API
├── scripts-legacy/
│   └── README.md                             ← Documentación

frontend/
└── src/
    ├── components/
    │   ├── CatalogEnrichmentDialog.tsx       ← UI
    │   └── CatalogEnrichmentDialog.css       ← Styles
    └── hooks/
        └── useCatalogEnrichment.ts           ← Logic

shared/
└── catalog-types.ts                         ← Types
```

## 📞 Support

Para dudas o issues:
1. Revisar `scripts-legacy/README.md` para contexto histórico
2. Ejecutar tests: `npm run enrich:master`
3. Revisar logs en `/data/enrichment-stats-*.json`

---

**Última actualización:** 2026-03-09  
**Próxima fase:** Soporte para múltiples usuarios + Redis cache para progreso
