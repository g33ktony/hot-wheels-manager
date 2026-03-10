# Scripts Legacy - Depreciados por Master Catalog Enrichment

Este directorio contiene scripts que han sido reemplazados por el sistema maestro de enriquecimiento de catálogos.

## Scripts Depreciados

### 1. `enrich-casting-galleries.ts`
**Función Original:** Descargaba galerías de fotos de Fandom Wiki para Hot Wheels
**Reemplazado por:** `master-catalog-enrich.ts` - Maneja todo tipo de fotos + validaciones
**Razón:** Ahora integrado en el proceso maestro con priorización de fotos (main → carded → gallery)

### 2. `complete-scraper.ts`
**Función Original:** Scraper completo de datos de Hot Wheels
**Reemplazado por:** `master-catalog-enrich.ts` - Carga desde JSON existente
**Razón:** El data ya está en JSON, el master enriquece lo existente

### 3. `discover-deep.ts`
**Función Original:** Descubrimiento profundo de páginas en Fandom
**Reemplazado por:** `master-catalog-enrich.ts` + clasificación mejorada
**Razón:** Función de descubrimiento ahora integrada en clasificación

### 4. `fandom-scraper.ts`
**Función Original:** Scraper básico de Fandom Wiki
**Reemplazado por:** `master-catalog-enrich.ts` (foto service)
**Razón:** Funcionalidad de foto integrada en servicio unificado

### 5. `scrape-amazon-premium-brands.ts`
**Función Original:** Scraping de marcas premium desde Amazon.jp (Mini GT, Pop Race, Kaido House, Tomica)
**Reemplazado por:** `master-catalog-enrich.ts` (load & classify)
**Razón:** Ahora carga desde JSONs locales, no scraping repetido

### 6. `scrape-premium-brands.ts`
**Función Original:** Scraper de marcas premium
**Reemplazado por:** `master-catalog-enrich.ts`
**Razón:** Mismo propósito, ahora unificado

### 7. `scrape-intelligent.ts`
**Función Original:** Scraping inteligente con lógica condicional
**Reemplazado por:** `master-catalog-enrich.ts`
**Razón:** Lógica de scraping integrada en clasificación

### 8. `scrape-all-categories.ts`
**Función Original:** Scraping de todas las categorías
**Reemplazado por:** `master-catalog-enrich.ts`
**Razón:** Ahora maneja múltiples marcas en una ejecución unificada

### Photo-related (Cleanup Scripts)
**Scripts:** 
- `enrich-photo-urls.ts`
- `fix-incomplete-urls.ts`
- `fix-incomplete-urls-v2.ts`
- `fix-truncated-photos.ts`
- `fix-shared-photos.ts`
- `clean-photo-urls.ts`
- `decode-photo-urls.ts`
- `reencode-photo-urls.ts`

**Reemplazados por:** Validación de fotos integrada en `master-catalog-enrich.ts`
**Razón:** Las fotos se validan y normalizan durante enriquecimiento, no después

## Sistema Nuevo: Master Catalog Enrichment

El nuevo sistema unificado (`master-catalog-enrich.ts`) realiza:

1. **Loading** - Carga de todos los datos JSON disponibles
2. **Classification** - Clasificación de tipos de series (STH/TH/Premium/Team Transport/etc)
3. **Color Normalization** - Normalización a grupos de colores estandardizados
4. **Photo Validation** - Priorización y validación de fotos (main → carded → gallery)
5. **Enrichment** - Agregar metadatos (colorGroup, hwSeriesType, photoValidation)
6. **Sync** - Sincronización con MongoDB
7. **Progress Tracking** - Emisión de eventos SSE en tiempo real

## Cómo Migrar (Desarrolladores)

Si necesitas usar un script legacy por alguna razón:

1. El archivo original está en `scripts-legacy/[nombre].ts.bak`
2. Restaurar: `cp scripts-legacy/[nombre].ts.bak [nombre].ts`
3. ⚠️ NOTA: No recomendado. Preferir usar el endpoint API: `POST /api/catalog/enrich`

## Integración del Frontend

Para mostrar progreso en el frontend:

```typescript
// React component
useEffect(() => {
  const eventSource = new EventSource('/api/catalog/enrich');
  
  eventSource.onmessage = (event) => {
    const progress = JSON.parse(event.data);
    setProgress(progress);
    
    if (progress.step === 'complete' || progress.step === 'error') {
      eventSource.close();
    }
  };
  
  return () => eventSource.close();
}, []);
```

## Statistics

- **Antes:** 8+ scripts diferentes, ejecuciones secuenciales, validación dispersa
- **Después:** 1 script maestro, ejecución centralizada, validación integrada
- **Beneficio:** 
  - ✅ Control centralizado
  - ✅ Progreso en tiempo real
  - ✅ Mejor mantenimiento
  - ✅ Funcionalidad extendida (colores, clasificación, validación)
  - ✅ Performance mejorado

## Contacto

Para dudas sobre la migración o scripts legacy: ver `ARCHITECT_NOTES.md`
