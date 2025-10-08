# Configurar Facebook en Railway (Producción)

## 🚨 Variables Faltantes en Producción

El error indica que las variables de entorno de Facebook no están configuradas en Railway.

## 📋 Pasos para Configurar en Railway

### 1. Acceder a Railway
1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Busca tu proyecto `hot-wheels-manager-backend`
3. Haz clic en el proyecto para abrirlo

### 2. Agregar Variables de Entorno
1. En el proyecto, haz clic en la pestaña **"Variables"** o **"Settings"**
2. Busca la sección **"Environment Variables"** o **"Variables"**
3. Agrega las siguientes TRES variables:

#### Variable 1: FACEBOOK_PAGE_ID
```
Nombre: FACEBOOK_PAGE_ID
Valor: 745095845364456
```

#### Variable 2: FACEBOOK_ACCESS_TOKEN
```
Nombre: FACEBOOK_ACCESS_TOKEN
Valor: EAAL3TQU4nygBPkTCH4RvxpTXLmaZA9RA4Wxjh0fcmrjnYoMQ4WxRc8texZAkV72VcgJfjOeX0sWCix01dbYMFkvQoB6fdLhcwTN0k34jEt7ZCas3D7qfmjAhslG7FSu4mVRENXmSq8l4TJkWFpUQEkUH2SOfCIpPOy7bBk56Gwj5HJzZCvYaQZAfbvcxexz79tKZCaj0M67ZBcgzZBsvigRKXKNp7MFBSOG1e2TRLf0ZD
```

#### Variable 3: BACKEND_URL (IMPORTANTE)
```
Nombre: BACKEND_URL
Valor: https://hot-wheels-manager-production.up.railway.app
```

⚠️ **Nota:** Reemplaza `https://hot-wheels-manager-production.up.railway.app` con la URL real de tu backend en Railway.

### 3. Guardar y Redesplegar
1. Haz clic en **"Add"** o **"Save"** después de agregar cada variable
2. Railway debería redesplegar automáticamente el backend
3. Si no redespliega automáticamente:
   - Busca el botón **"Redeploy"** o **"Deploy"**
   - O ve a la pestaña **"Deployments"** y haz clic en **"Redeploy Latest"**

### 4. Verificar la Configuración
Después del redespliegue, prueba el endpoint de verificación:

```bash
# Reemplaza YOUR_AUTH_TOKEN con tu token de autenticación
curl https://tu-backend-railway.up.railway.app/api/facebook/verify \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Deberías recibir una respuesta similar a:
```json
{
  "success": true,
  "message": "Configuración de Facebook válida",
  "pageInfo": {
    "id": "745095845364456",
    "name": "Nombre de tu página",
    "category": "Categoría"
  }
}
```

## 📱 Captura de Pantalla de Referencia

En Railway, las variables de entorno se ven así:

```
┌─────────────────────────────────────────┐
│ Environment Variables                    │
├─────────────────────────────────────────┤
│ MONGODB_URI          mongodb+srv://...  │
│ JWT_SECRET           2GCEa9Q...         │
│ FRONTEND_URL         https://...        │
│ BACKEND_URL          https://hot-whe... │← AGREGAR ESTA
│ FACEBOOK_PAGE_ID     745095845364456    │← AGREGAR ESTA
│ FACEBOOK_ACCESS_TOKEN EAAL3TQU...       │← AGREGAR ESTA
└─────────────────────────────────────────┘
```

## ⚠️ Notas Importantes

1. **BACKEND_URL**: Debe ser la URL pública de tu backend en Railway (necesaria para que Facebook pueda acceder a las imágenes)
2. **Seguridad**: El Access Token es sensible, asegúrate de copiarlo completo
2. **Page Access Token**: El token que configuraste es un Page Access Token que no expira (a diferencia de User Access Tokens)
3. **Redespliegue Necesario**: Railway debe redesplegar para cargar las nuevas variables
4. **Tiempo**: El redespliegue puede tomar 1-3 minutos

## 🔍 Solución de Problemas

### Si sigue apareciendo el error:
1. Verifica que ambas variables están guardadas en Railway
2. Confirma que no hay espacios extra al copiar/pegar
3. Asegúrate de que el redespliegue se completó exitosamente
4. Revisa los logs de Railway para errores durante el arranque

### Verificar logs en Railway:
1. Ve a la pestaña **"Deployments"**
2. Haz clic en el último deployment
3. Ve a **"View Logs"** o **"Logs"**
4. Busca mensajes relacionados con Facebook

## ✅ Una Vez Configurado

Después de configurar estas variables, la función de publicar en Facebook funcionará en producción igual que en desarrollo.

---

**Documentación relacionada:**
- [FACEBOOK_SETUP.md](./FACEBOOK_SETUP.md) - Configuración inicial de Facebook
- [FACEBOOK_USAGE.md](./FACEBOOK_USAGE.md) - Guía de uso de la funcionalidad
