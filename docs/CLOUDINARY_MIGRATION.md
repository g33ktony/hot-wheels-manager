# Migración de Imágenes a Cloudinary

## 📋 Overview

Este proceso migra todas las imágenes base64 almacenadas en MongoDB a Cloudinary (servicio de almacenamiento en la nube), reemplazando los datos en la BD con URLs.

**Beneficios:**
- 🚀 90% menos espacio en BD
- 🌍 CDN global (imágenes más rápidas)
- 💰 Gratis (5GB/mes)
- 🖼️ Optimización automática de imágenes

---

## 🔧 Setup Inicial (15 minutos)

### 1. Crear cuenta Cloudinary (Gratis)
```bash
# Ve a https://cloudinary.com
# Click "Sign Up" → crea cuenta gratis
# Confirma email
```

### 2. Obtener Cloud Name y Upload Preset

**Paso A: Cloud Name**
```
Dashboard > Settings > Account > Cloud Name
Copiar el valor (ej: hwm-production)
```

**Paso B: Upload Preset**
```
Dashboard > Settings > Upload > Add upload preset

Crear preset con estos valores:
- Preset name: unsigned_upload
- Unsigned: ✓ (Sin autenticación)
- Folder: hot-wheels-manager/inventory

Guardar
```

### 3. Variables de Entorno

**Backend (.env)**
```env
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_UPLOAD_PRESET=unsigned_upload
```

**Frontend (.env)**
```env
VITE_CLOUDINARY_CLOUD_NAME=tu-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=unsigned_upload
```

---

## 🚀 Ejecutar Migración

### Pre-requisitos
```bash
# Instalar dependencias si no las tienes
npm install node-fetch --save
```

### Comando de Migración
```bash
# Desde la carpeta /backend
cd backend

# Ejecutar script (crea backup automático en /backups/)
npx ts-node src/scripts/migrateImagesToCloudinary.ts
```

### Qué hace el script
1. ✅ **Crea backup** de todas las imágenes originales
2. 📤 **Sube imágenes** a Cloudinary en lotes
3. 🔄 **Reemplaza datos** en BD con URLs de Cloudinary
4. 📊 **Genera reporte** de éxito/fallos

### Ejemplo de Output
```
🚀 Starting image migration to Cloudinary...
Cloud: hwm-production
Preset: unsigned_upload

📡 Connecting to database...
✅ Connected

💾 Creating backup...
📦 Backup created: backups/inventory-backup-2025-12-29-14-30-45.json

🔄 Migrating inventory items...
✅ Uploaded image for item 12345: https://res.cloudinary.com/hwm-production/...
📊 Progress: 50% (125/250)
✅ All 250 items migrated!

============================================================
📋 MIGRATION SUMMARY
============================================================
Total items scanned: 250
Items with photos: 200
✅ Successful uploads: 800
❌ Failed uploads: 0

✅ No errors! Migration completed successfully.
============================================================
```

---

## ✅ Verificación Post-Migración

### 1. Verificar en BD
```bash
# Conectar a MongoDB
# Seleccionar colección inventoryitems
# Revisar que fotos ahora son URLs Cloudinary:

{
  "_id": "...",
  "photos": [
    "https://res.cloudinary.com/hwm-production/image/upload/v123/..."
  ]
}
```

### 2. Verificar en Frontend
```bash
# Iniciar la app
npm run dev

# Ir a Inventario
# Las imágenes deben cargar con lazy loading
# Abrir DevTools > Network
# Ver que las imágenes se cargan desde Cloudinary
```

### 3. Backup de Seguridad
```bash
# El script guarda backup automáticamente en:
backend/backups/inventory-backup-TIMESTAMP.json

# Descargar este archivo en caso de emergencia
```

---

## 🖼️ Usar Cloudinary en Nuevos Uploads

### Opción A: Usar Cloudinary (Recomendado)
```typescript
// En Inventory.tsx - Modal de agregar item
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'

const { uploadImage } = useCloudinaryUpload()

const handleImageSelect = async (file: File) => {
  const result = await uploadImage(file)
  if (result) {
    setNewItem({
      ...newItem,
      photos: [...newItem.photos, result.url]
    })
    toast.success('Imagen cargada a Cloudinary')
  }
}
```

### Opción B: Almacenar en BD (No Recomendado)
```typescript
// Si necesitas base64 local (menos escalable)
const handleImageSelect = async (file: File) => {
  const base64 = await fileToBase64(file)
  setNewItem({
    ...newItem,
    photos: [...newItem.photos, base64]
  })
}
```

---

## 🔧 Troubleshooting

### Error: "CLOUDINARY_CLOUD_NAME not configured"
```bash
# Solución: Asegúrate de tener variables de entorno en .env

# Backend:
export CLOUDINARY_CLOUD_NAME=tu-cloud-name
export CLOUDINARY_UPLOAD_PRESET=unsigned_upload

# O agregarlo en .env del backend
```

### Error: "Upload failed: 401 Unauthorized"
```bash
# Solución: Verifica que el Upload Preset existe y está sin autenticación
# Dashboard > Settings > Upload > Verificar preset
# Debe tener "Unsigned: ✓"
```

### Algunas imágenes no se subieron
```bash
# El script crea backup automático
# Re-ejecuta el script - solo migra imágenes que falten
# Las URLs ya migradas se saltan automáticamente
```

### La BD sigue siendo grande después de migración
```bash
# Las imágenes base64 quedan en el backup
# Para limpiar completamente la BD:
db.inventoryitems.deleteMany({ photos: /^data:image/ })

# ⚠️ Hazlo SOLO después de verificar que Cloudinary tiene copias
```

---

## 📊 Estadísticas Esperadas

Antes:
- BD: 500+ MB
- Foto promedio: 500 KB (base64)

Después:
- BD: 50 MB
- Foto promedio: URL (50 bytes)
- CDN Cloudinary: 500 MB (gratuito 5GB/mes)

**Ahorro: 90% en espacio de BD** 🎉

---

## 🔄 Rollback (Si Algo Sale Mal)

```bash
# Si necesitas volver a las imágenes originales:

# 1. Restaurar backup
mongorestore --archive=inventory-backup-2025-12-29.json

# 2. El backup se guardó automáticamente en:
backend/backups/inventory-backup-*.json

# 3. Contact support si algo falla criticamente
```

---

## 📝 Notas

- ✅ El script es **seguro** - crea backup antes de cambiar BD
- ✅ Puedes **re-ejecutar** sin problemas - detecta URLs ya migradas
- ✅ **Sin downtime** - puedes migrar mientras la app está en uso
- ⚠️ **Primero staging** - prueba en ambiente de desarrollo antes

---

## 🆘 Necesitas Ayuda?

1. Revisa el backup creado
2. Re-ejecuta el script
3. Contacta soporte con el error exacto
