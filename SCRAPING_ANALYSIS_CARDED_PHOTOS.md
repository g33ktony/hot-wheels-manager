# Análisis de Scripts de Scraping - Agregar Fotos "Carded"

## 📋 Resumen

El proyecto tiene múltiples scripts de scraping de Hot Wheels desde Fandom Wiki. Los modelos de datos YA soportan un campo `photo_url_carded` pero **los scripts actuales NO lo están populando**.

## 🏗️ Estructura de Scripts Disponibles

### 1. **fandom-scraper.ts** (PRINCIPAL - 562 líneas)
- **Propósito**: Scraping completo desde Fandom API (método oficial)
- **Método**: Usa API de MediaWiki (`https://hotwheels.fandom.com/api.php`)
- **Ventajas**:
  - Más estable (usa API en lugar de HTML parsing)
  - Rate limiting incorporado (1 req/seg)
  - Manejo de multi-packs
- **Desventajas**:
  - Solo extrae una imagen (main photo)
  - No busca fotos "carded"

### 2. **complete-scraper.ts** (299 líneas)
- **Propósito**: Scraping en paralelo de todas las categorías
- **Método**: Cheerio HTML parsing
- **Características**:
  - Scrapeea años 1999-2024
  - Soporta Premium, Team Transport, RLC, Elite 64
  - Base para búsqueda de múltiples imágenes

### 3. **scrape-intelligent.ts**
- Scraping inteligente con fallbacks

### 4. **scrape-premium-series.ts**
- Específico para series premium

### 5. **scrape-premium-brands.ts**
- Scraping de marcas premium

### 6. **scrape-all-categories.ts**
- Cobertura de todas las categorías

### 7. **scrape-amazon-premium-brands.ts**
- Integración con Amazon

---

## 📷 Modelo de Datos (Backend)

### Location: `backend/src/models/HotWheelsCar.ts`

```typescript
interface IHotWheelsCar {
  // Campos existentes
  toy_num: string
  carModel: string
  series: string
  
  // IMAGING (DOS CAMPOS)
  photo_url?: string           // 👈 Foto principal (auto sin tarjeta)
  photo_url_carded?: string    // 👈 Foto en tarjeta (VACÍO ACTUALMENTE)
  
  // Otros campos...
}

// La schema ya define ambos campos
photo_url: { type: String },
photo_url_carded: { type: String },
```

---

## 🎯 Cómo Obtener Fotos Carded desde Fandom Wiki

### Estructura de Páginas en Fandom
Las páginas de Hot Wheels en Fandom típicamente tienen:

```wikitext
==Images==
===NameOfCar===
[[File:Image-of-car.jpg|200px|Main toy image]]
[[File:Image-carded-or-boxed.jpg|200px|Carded version]]
[[File:Package-back.jpg|200px|Package back]]
```

O en formato de galerías:
```wikitext
<gallery>
File:MainImage.jpg|The loose car
File:Carded.jpg|On the original card
File:Loose.jpg|Alternate loose view
</gallery>
```

### Métodos para Extraer Múltiples Imágenes

#### **Opción 1: Modificar `fandom-scraper.ts` (RECOMENDADO)**

En la función `extractImageUrl()` (actualmente línea ~130):

```typescript
/**
 * Extrae URLs de imágenes (principal y carded) del wikitext
 */
function extractImages(wikitext: string): { main?: string, carded?: string } {
  const images = { main: undefined, carded: undefined };

  // Buscar sección ==Images==
  const imagesSection = wikitext.match(/==Images==([^]*?)(?===|$)/i)
  if (!imagesSection) return images

  const imageSectionText = imagesSection[1];

  // Método 1: Buscar en tabla de imágenes
  // [[File:FileName.jpg|200px|Main car]]
  // [[File:FileNameCarded.jpg|200px|Carded version]]
  const fileMatches = imageSectionText.match(/\[\[File:([^\]|]+)[^\]]*\|([^\]]+)\]\]/g)
  
  if (fileMatches && fileMatches.length > 0) {
    // Primera imagen = main
    let mainMatch = fileMatches[0].match(/File:([^\]|]+)/i)
    if (mainMatch) {
      images.main = `https://static.wikia.nocookie.net/hotwheels/images/${mainMatch[1]}`
    }

    // Segunda imagen = carded (si existe y contiene palabras como "carded", "card", "boxed", "box")
    for (let i = 1; i < fileMatches.length; i++) {
      const descMatch = fileMatches[i].match(/File:([^\]|]+)[^\]]*\|([^\]]+)/i)
      if (descMatch) {
        const description = descMatch[2].toLowerCase()
        if (description.includes('card') || description.includes('box') || 
            description.includes('original') || i === fileMatches.length - 1) {
          images.carded = `https://static.wikia.nocookie.net/hotwheels/images/${descMatch[1]}`
          break
        }
      }
    }
  }

  // Método 2: Si no encuentra en tabla, buscar en galería
  if (!images.carded) {
    const galleryMatch = imageSectionText.match(/<gallery[^>]*>([^]*?)<\/gallery>/i)
    if (galleryMatch) {
      const galleryContent = galleryMatch[1]
      const galleryFiles = galleryContent.match(/File:([^\n|]+)/g)
      if (galleryFiles && galleryFiles.length > 1) {
        // Second file in gallery is often carded
        const cardedMatch = galleryFiles[1].match(/File:([^\|]+)/i)
        if (cardedMatch) {
          images.carded = `https://static.wikia.nocookie.net/hotwheels/images/${cardedMatch[1]}`
        }
      }
    }
  }

  return images
}
```

#### **Cambios en el Interface `ParsedVehicle`**

```typescript
interface ParsedVehicle {
  toy_num: string
  col_num: string
  carModel: string
  series: string
  series_num: string
  year: string
  color?: string
  photo_url?: string           // Foto principal
  photo_url_carded?: string    // 👈 NUEVO CAMPO
  tampo?: string
  wheel_type?: string
  car_make?: string
  pack_contents?: Array<{ ... }>
}
```

#### **Cambios en `parseTemplate()`**

```typescript
function parseTemplate(wikitext: string): Partial<ParsedVehicle> {
  const params: any = {}
  const lines = wikitext.split('\n')
  
  for (const line of lines) {
    if (!line.includes('|')) continue
    const [key, value] = line.split('|').slice(1, 3)
    if (key && value) {
      params[key.trim()] = value.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    }
  }

  return {
    carModel: params.name,
    series: params.series,
    toy_num: params.number,
    year: params.years,
    // Cambio aquí: usar extractImages() en lugar de extractImageUrl()
    photo_url: extractImages(wikitext).main || 
               (params.image ? `https://static.wikia.nocookie.net/hotwheels/images/${params.image}` : undefined),
    photo_url_carded: extractImages(wikitext).carded
  }
}
```

#### **Cambios en `parsePage()`**

En la sección donde se retornan los vehículos parseados:

```typescript
// Línea ~280
return [{
  carModel: title,
  series: title.includes('5-Pack') ? '5-Packs' : 'Multi-Packs',
  toy_num: toyNumMatch[1],
  col_num: '',
  series_num: '',
  year: yearMatch[1],
  photo_url: extractImages(wikitext).main,      // 👈
  photo_url_carded: extractImages(wikitext).carded,  // 👈 NUEVO
  pack_contents: packContents
} as ParsedVehicle]
```

---

## 📊 Implementación Paso a Paso

### Paso 1: Actualizar Interface ParsedVehicle
- Añadir `photo_url_carded?: string` (línea ~28)

### Paso 2: Crear Función `extractImages()`
- Nueva función que busque múltiples imágenes en sección ==Images==
- Retorna objeto con `{ main, carded }`

### Paso 3: Integrar en `parseTemplate()`
- Reemplazar `extractImageUrl()` con múltiples llamadas a `extractImages()`
- Asignar valores a `photo_url` y `photo_url_carded`

### Paso 4: Integrar en `parsePage()`
- Actualizar retorno de vehicles con `photo_url_carded`

### Paso 5: Implementar en Base de Datos
- Campos ya existen en schema
- Solo necesita population desde scraper

### Paso 6: Exponer en API (frontend)
- Endpoints ya devuelven `photo_url_carded` si existe
- Frontend puede mostrar en galería de imágenes

---

## 🖼️ Integración Frontend (Ya Soportado)

### En `Inventory.tsx` o componentes de galería:

```tsx
// El campo ya existe en los datos
const item: IInventoryItem = {
  // campos existentes...
  hotwheelsRef?: {
    photo_url?: string        // Principal
    photo_url_carded?: string // Carded
  }
}

// Mostrar en galería
function ItemPhotoGallery({ item }) {
  const photos = [
    item.hotwheelsRef?.photo_url,
    item.hotwheelsRef?.photo_url_carded
  ].filter(Boolean)

  return (
    <div className="gallery">
      {photos.map((url, idx) => (
        <img key={idx} src={url} alt={`Photo ${idx + 1}`} />
      ))}
    </div>
  )
}
```

---

## 🧪 Testing

### Script de Testing
```bash
# Ejecutar fandom-scraper actualizado
cd backend
npm run build
npx ts-node src/scripts/fandom-scraper.ts

# Verificar que photo_url_carded se populate
db.hotwheelscars.findOne({ photo_url_carded: { $ne: null } })
```

---

## ⚠️ Consideraciones Importantes

### 1. **Rate Limiting**
- Fandom Wiki puede detectar scraping pesado
- Mantener delay de 1-2 segundos entre requests
- `fandom-scraper.ts` ya tiene `sleep(DELAY_MS)`

### 2. **Variabilidad de Páginas**
- No TODAS las páginas tienen fotos carded
- Algunas tienen solo 1 imagen
- Manejar gracefully cuando no exista

### 3. **URLs Dinámicas**
- Las URLs de Fandom cambien ocasionalmente
- La base `https://static.wikia.nocookie.net/hotwheels/images/` es estable
- Verificar formato de archivo en cada scraping

### 4. **Duplicación**
- MongoDB tiene índice único en `toy_num`
- Updates vs Inserts: usar `findByIdAndUpdate` si solo queremos actualizar fotos

---

## 📝 Sugerencias de Mejora

### Corto Plazo
1. ✅ Implementar `extractImages()` en fandom-scraper.ts
2. ✅ Recolectar fotos carded en próximo scraping
3. ✅ Verificar en base de datos

### Mediano Plazo
1. Agregar página de "gallery" en frontend para mostrar ambas fotos
2. Permitir al usuario subir fotos adicionales manualmente
3. Sistema de caché de imágenes en Cloudinary

### Largo Plazo
1. ML para detectar automáticamente si una imagen es "carded" vs "loose"
2. Integración con eBay/Amazon para precios según condición (carded vs loose)
3. Sistema de versionado de imágenes para historial

---

## 🔗 Referencias

- **Fandom API Docs**: `https://hotwheels.fandom.com/api.php?action=help`
- **MediaWiki Syntax**: `https://www.mediawiki.org/wiki/Wikitext`
- **Model**: `backend/src/models/HotWheelsCar.ts`
- **Scraper**: `backend/src/scripts/fandom-scraper.ts`

---

## 📌 Estado Actual

- ✅ **Modelo**: Soporta `photo_url_carded`
- ✅ **API**: Devuelve campo si existe
- ✅ **Frontend**: Puede mostrar si existe
- ❌ **Scraper**: NO está populando el campo
- ❌ **Datos**: `photo_url_carded` está NULL para la mayoría

**ACCIÓN**: Implementar `extractImages()` en fandom-scraper.ts para empezar a recolectar fotos carded.
