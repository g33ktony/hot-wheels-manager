# Sistema de Actualización de Catálogo Hot Wheels

## Descripción

Este sistema permite actualizar automáticamente la base de datos de Hot Wheels descargando datos desde la Wiki de Fandom (https://hotwheels.fandom.com/). Incluye tanto un script de línea de comando como una interfaz web en el Dashboard.

## Características

✅ Descarga datos de Hot Wheels desde 1995 hasta el año actual
✅ Actualiza la base de datos MongoDB con los nuevos modelos
✅ Acceso desde la web (Dashboard)
✅ Ejecución desde línea de comandos
✅ Manejo robusto de errores
✅ Pausas automáticas para no sobrecargar el servidor

## Estructura del Sistema

### Backend

#### Script de Scraping
- **Ubicación:** `/backend/src/scripts/updateHotWheelsDatabase.ts`
- **Características:**
  - Descarga datos por año desde la Wiki
  - Parsea tablas HTML
  - Obtiene URLs de fotos desde Wikia CDN
  - Guarda los datos en `/backend/data/hotwheels_database.json`

#### Controlador
- **Ubicación:** `/backend/src/controllers/hotWheelsUpdateController.ts`
- **Endpoints:**
  - `POST /api/hotwheels/update-catalog` - Inicia la actualización
  - `GET /api/hotwheels/update-status` - Obtiene el estado de la última actualización

#### Rutas
- Registradas en `/backend/src/routes/hotWheelsRoutes.ts`

### Frontend

#### Hook de React
- **Ubicación:** `/frontend/src/hooks/useHotWheelsUpdate.ts`
- **Proporciona:**
  - `useUpdateHotWheelsCatalog()` - Mutation para ejecutar la actualización
  - `useGetUpdateStatus()` - Query para obtener el estado

#### UI
- **Ubicación:** `/frontend/src/pages/Dashboard.tsx`
- **Componentes:**
  - Botón en el header del Dashboard
  - Modal con información y estado de actualización

## Uso

### Opción 1: Dashboard Web (Recomendado)

1. Abre el Dashboard
2. Haz clic en el botón "Actualizar Catálogo" (arriba a la derecha)
3. Aparecerá un modal con la información
4. Haz clic en "Actualizar Ahora"
5. Espera a que se complete (2-5 minutos)

### Opción 2: Línea de Comandos

```bash
# Desde la carpeta backend
cd backend

# Ejecutar el script directamente
npm run ts-node src/scripts/updateHotWheelsDatabase.ts

# O si tienes tsx instalado
npx tsx src/scripts/updateHotWheelsDatabase.ts
```

## Datos que se Descargan

Cada modelo incluye:

```json
{
  "toy_num": "14841",
  "col_num": "378",
  "model": "1996 Mustang GT",
  "series": "First Editions",
  "series_num": "01/12",
  "photo_url": "https://static.wikia.nocookie.net/hotwheels/images/...",
  "year": "1996"
}
```

## Estructura de la Wiki de Fandom

El script espera encontrar datos en:

- **Por año:** `https://hotwheels.fandom.com/wiki/{YEAR}_Hot_Wheels_models`
- **Treasure Hunts:** `https://hotwheels.fandom.com/wiki/Treasure_Hunt`
- **Super Treasure Hunts:** `https://hotwheels.fandom.com/wiki/Super_Treasure_Hunt`

### ⚠️ IMPORTANTE: Ajustar Selectores CSS

La estructura HTML de la Wiki puede cambiar. Si el script no obtiene datos:

1. Abre https://hotwheels.fandom.com/wiki/2015_Hot_Wheels_models
2. Inspecciona el HTML (F12)
3. Identifica dónde están las tablas con los datos
4. Actualiza los selectores CSS en `updateHotWheelsDatabase.ts`:

```typescript
// Ejemplo de parseo - NECESITA SER AJUSTADO
const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/g;
const tables = html.match(tableRegex) || [];
```

## Mantenimiento

### Problemas Comunes

**Error: "No se obtuvieron datos"**
- Los selectores CSS no coinciden con la estructura actual de la Wiki
- Necesitas inspeccionar el HTML y actualizar el script

**Error: "Timeout"**
- La Wiki puede estar lenta
- Intenta más tarde

**Error: "Base de datos"**
- MongoDB no está conectado
- Verifica que MONGODB_URI esté configurado

## Variables de Entorno Requeridas

```env
MONGODB_URI=mongodb+srv://...
```

## Rendimiento

- **Tiempo:** 2-5 minutos por actualización completa
- **Datos:** ~12,000 modelos desde 1995-2025
- **Tamaño:** ~3-4 MB JSON

## Seguridad

El endpoint `/api/hotwheels/update-catalog` debe ser protegido para solo administradores. Actualmente está abierto - agregar validación según sea necesario.

## Futuras Mejoras

- [ ] Usar Puppeteer para sitios con JavaScript dinámico
- [ ] Caché de datos para evitar downloads duplicados
- [ ] Soporte para múltiples fuentes de datos
- [ ] Validación e importación incremental
- [ ] Notificaciones por email de actualizaciones completadas
- [ ] Programación automática (cron jobs)
