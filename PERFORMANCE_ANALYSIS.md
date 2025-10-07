# 🚀 Análisis de Performance - Hot Wheels Manager

## 📊 Diagnóstico Inicial

### Problemas Detectados

#### 1. **Backend - MongoDB Queries Sin Optimizar**
- ❌ Falta índice compuesto para filtros múltiples
- ❌ Sin population selectivo (trae todos los campos)
- ❌ Queries sin proyección (trae campos innecesarios)
- ❌ No usa lean() en lecturas (mayor overhead de Mongoose)

#### 2. **Frontend - Re-renders Excesivos**
- ❌ Componentes grandes sin memoización
- ❌ Filtros causan re-fetch en cada keystroke
- ❌ Imágenes sin lazy loading
- ❌ Sin debounce en búsqueda

#### 3. **Network - Payload Grande**
- ❌ Enviando campos innecesarios (timestamps, __v)
- ❌ Sin compresión gzip
- ❌ Múltiples requests paralelos sin control

#### 4. **React Query - Configuración Subóptima**
- ⚠️ staleTime: 2min (podría ser 5min para inventario)
- ⚠️ Sin prefetching de páginas siguientes
- ⚠️ Cache sin límite de tamaño

---

## 🔧 Mejoras Propuestas

### **Fase 1: Quick Wins (Impacto Alto, Esfuerzo Bajo)** ⚡

#### 1.1 Backend - Índices Compuestos
```typescript
// backend/src/models/InventoryItem.ts

// Índice compuesto para filtros comunes
inventoryItemSchema.index({ 
  brand: 1, 
  condition: 1, 
  pieceType: 1,
  dateAdded: -1 
})

// Índice para búsqueda por texto
inventoryItemSchema.index({ 
  carId: 'text', 
  notes: 'text' 
})

// Índice para box queries
inventoryItemSchema.index({ 
  isBox: 1, 
  boxStatus: 1 
})
```

**Impacto:** 50-70% más rápido en queries con filtros

#### 1.2 Backend - Lean Queries
```typescript
// backend/src/controllers/inventoryController.ts

// Antes
const items = await InventoryItemModel.find(query)
  .limit(limit)
  .skip(skip)
  .sort({ dateAdded: -1 })

// Después
const items = await InventoryItemModel.find(query)
  .select('-__v -createdAt -updatedAt') // Excluir campos innecesarios
  .lean() // 30-40% más rápido
  .limit(limit)
  .skip(skip)
  .sort({ dateAdded: -1 })
```

**Impacto:** 30-40% reducción en tiempo de respuesta

#### 1.3 Frontend - Debounce en Búsqueda
```typescript
// frontend/src/pages/Inventory.tsx

import { useMemo } from 'react'
import debounce from 'lodash.debounce'

// Crear función debounced
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    handleFilterChange('search', value)
  }, 500), // Espera 500ms después del último keystroke
  []
)

// En el input
<Input
  value={searchTerm}
  onChange={(e) => {
    setSearchTerm(e.target.value) // Update UI inmediatamente
    debouncedSearch(e.target.value) // Fetch después de 500ms
  }}
/>
```

**Impacto:** 80% reducción en requests durante búsqueda

#### 1.4 Frontend - Lazy Loading de Imágenes
```typescript
// frontend/src/pages/Inventory.tsx

<img 
  src={item.photos[0]} 
  loading="lazy" // Nativo del navegador
  decoding="async"
  alt={item.carId}
/>
```

**Impacto:** 60% más rápido initial load

---

### **Fase 2: Optimizaciones Medias** 🎯

#### 2.1 React Query - Prefetching
```typescript
// frontend/src/hooks/useInventory.ts

export const useInventory = (options: UseInventoryOptions = {}) => {
  const queryClient = useQueryClient()
  
  const result = useQuery(
    ['inventory', ...], 
    () => inventoryService.getAll(...), 
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      keepPreviousData: true,
      onSuccess: (data) => {
        // Prefetch siguiente página
        if (data.pagination.currentPage < data.pagination.totalPages) {
          queryClient.prefetchQuery(
            ['inventory', options.page + 1, ...],
            () => inventoryService.getAll(options.page + 1, ...)
          )
        }
      }
    }
  )
  
  return result
}
```

**Impacto:** Navegación instantánea entre páginas

#### 2.2 Backend - Compression Middleware
```typescript
// backend/src/index.ts

import compression from 'compression'

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  },
  level: 6 // Balance entre compresión y CPU
}))
```

**Impacto:** 70-80% reducción en tamaño de response

#### 2.3 Frontend - Memoización de Componentes
```typescript
// frontend/src/pages/Inventory.tsx

import { memo, useMemo, useCallback } from 'react'

const InventoryCard = memo(({ item, onEdit, onDelete }) => {
  // Component code
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.item._id === nextProps.item._id &&
         prevProps.item.quantity === nextProps.item.quantity
})

// En el componente principal
const memoizedItems = useMemo(() => inventoryItems, [inventoryItems])

const handleEdit = useCallback((id: string) => {
  // Edit logic
}, [])
```

**Impacto:** 40-50% reducción en re-renders

---

### **Fase 3: Optimizaciones Avanzadas** 🚀

#### 3.1 Backend - Redis Cache
```typescript
// backend/src/config/redis.ts

import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
})

export const cacheMiddleware = (duration: number) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`
    const cached = await redis.get(key)
    
    if (cached) {
      return res.json(JSON.parse(cached))
    }
    
    // Intercept res.json to cache response
    const originalJson = res.json.bind(res)
    res.json = (data) => {
      redis.setex(key, duration, JSON.stringify(data))
      return originalJson(data)
    }
    
    next()
  }
}

// En routes
router.get('/inventory', 
  cacheMiddleware(60), // 1 minuto
  getInventoryItems
)
```

**Impacto:** 90% más rápido en queries repetidos

#### 3.2 Frontend - Virtual Scrolling
```typescript
// frontend/src/pages/Inventory.tsx

import { useVirtual } from '@tanstack/react-virtual'

const parentRef = useRef()

const rowVirtualizer = useVirtual({
  size: filteredItems.length,
  parentRef,
  estimateSize: useCallback(() => 300, []), // Altura estimada de card
  overscan: 5 // Render 5 items extra fuera de viewport
})

<div ref={parentRef} style={{ height: '800px', overflow: 'auto' }}>
  <div style={{ height: `${rowVirtualizer.totalSize}px`, position: 'relative' }}>
    {rowVirtualizer.virtualItems.map(virtualRow => (
      <div
        key={virtualRow.index}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`
        }}
      >
        <InventoryCard item={filteredItems[virtualRow.index]} />
      </div>
    ))}
  </div>
</div>
```

**Impacto:** Renderiza solo 10-15 items visibles (vs todos)

#### 3.3 Backend - Aggregation Pipeline
```typescript
// Para dashboard con stats
const stats = await InventoryItemModel.aggregate([
  {
    $facet: {
      totalItems: [{ $count: 'count' }],
      totalValue: [{ 
        $group: { 
          _id: null, 
          total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } }
        }
      }],
      byBrand: [
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]
    }
  }
])
```

**Impacto:** 1 query vs 3+ queries separadas

---

## 🧪 Testing de Performance

### Script de Pruebas

```typescript
// tests/performance/inventory.test.ts

import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

async function measurePerformance() {
  console.log('🧪 Testing Performance...\n')
  
  // Test 1: Inventory List (Sin filtros)
  console.time('GET /inventory (no filters)')
  await axios.get(`${API_URL}/inventory?page=1&limit=15`)
  console.timeEnd('GET /inventory (no filters)')
  
  // Test 2: Inventory List (Con filtros)
  console.time('GET /inventory (with filters)')
  await axios.get(`${API_URL}/inventory?page=1&limit=15&brand=Hot Wheels&condition=mint`)
  console.timeEnd('GET /inventory (with filters)')
  
  // Test 3: Búsqueda
  console.time('GET /inventory (search)')
  await axios.get(`${API_URL}/inventory?page=1&limit=15&search=Corvette`)
  console.timeEnd('GET /inventory (search)')
  
  // Test 4: Múltiples requests paralelos
  console.time('Multiple parallel requests')
  await Promise.all([
    axios.get(`${API_URL}/inventory`),
    axios.get(`${API_URL}/customers`),
    axios.get(`${API_URL}/deliveries`),
  ])
  console.timeEnd('Multiple parallel requests')
}

measurePerformance()
```

### Métricas Objetivo

| Métrica | Actual (estimado) | Objetivo |
|---------|-------------------|----------|
| **Inventory List** | ~800ms | <200ms |
| **Con Filtros** | ~1200ms | <300ms |
| **Búsqueda** | ~1500ms | <400ms |
| **First Paint** | ~2s | <1s |
| **Time to Interactive** | ~3s | <1.5s |

---

## 📦 Dependencias Necesarias

```json
// package.json (backend)
{
  "compression": "^1.7.4",
  "ioredis": "^5.3.2"
}

// package.json (frontend)
{
  "lodash.debounce": "^4.0.8",
  "@tanstack/react-virtual": "^3.0.0"
}
```

---

## 🎯 Plan de Implementación

### Semana 1: Quick Wins
- [ ] Agregar índices compuestos
- [ ] Implementar lean() queries
- [ ] Agregar debounce en búsqueda
- [ ] Lazy loading de imágenes
- [ ] Script de testing

### Semana 2: Optimizaciones Medias
- [ ] React Query prefetching
- [ ] Compression middleware
- [ ] Memoización de componentes
- [ ] Proyección en queries

### Semana 3: Avanzadas (Opcional)
- [ ] Redis cache
- [ ] Virtual scrolling
- [ ] Aggregation pipelines
- [ ] CDN para imágenes

---

## 📈 Monitoreo Continuo

### Backend
```typescript
// middleware/performance.ts
export const performanceLogger = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} - ${duration}ms`)
    
    if (duration > 1000) {
      console.warn(`⚠️ Slow endpoint: ${req.path} took ${duration}ms`)
    }
  })
  
  next()
}
```

### Frontend
```typescript
// React Query DevTools
import { ReactQueryDevtools } from 'react-query/devtools'

<ReactQueryDevtools initialIsOpen={false} />
```

---

## 🔍 Herramientas de Diagnóstico

1. **Chrome DevTools**
   - Performance tab
   - Network tab (filtrar por "Fetch/XHR")
   - React Profiler

2. **MongoDB Compass**
   - Explain Plan
   - Query Performance

3. **Bundle Analyzer**
   ```bash
   npm run build -- --analyze
   ```

4. **Lighthouse**
   - Performance score
   - First Contentful Paint
   - Time to Interactive

---

## 💡 Tips Adicionales

1. **Imágenes Optimizadas**
   - Usar WebP format
   - Comprimir con TinyPNG
   - Max size: 100KB por imagen

2. **Code Splitting**
   ```typescript
   const Deliveries = lazy(() => import('./pages/Deliveries'))
   const Purchases = lazy(() => import('./pages/Purchases'))
   ```

3. **Service Worker**
   - Cache assets estáticos
   - Offline support

4. **Database Sharding**
   - Si >1M registros, considerar sharding por brand o year

---

## 🎓 Recursos

- [React Query Performance](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [MongoDB Indexing Strategies](https://www.mongodb.com/docs/manual/indexes/)
- [Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/reference/react/memo)

---

**Próximo paso:** Implementar Fase 1 (Quick Wins) y medir mejora con script de testing.
