# Deployment en Railway con MongoDB

Railway es una plataforma de deployment que facilita el despliegue de aplicaciones. Tienes dos opciones principales para MongoDB:

## Opción 1: MongoDB Plugin en Railway (Recomendado) ⭐

Railway ofrece MongoDB como un plugin que puedes agregar a tu proyecto.

### Pasos:

1. **Ve a tu proyecto en Railway**
   - https://railway.app/dashboard

2. **Agrega el servicio de MongoDB**
   - Click en "+ New Service"
   - Selecciona "Database"
   - Elige "MongoDB"
   
3. **Railway creará automáticamente:**
   - Una instancia de MongoDB
   - Variables de entorno para la conexión
   - Una URL de conexión en formato: `mongodb://[usuario]:[password]@[host]:[puerto]/[database]`

4. **Configura tu aplicación backend**
   - Ve a tu servicio backend en Railway
   - En "Variables", Railway ya habrá creado automáticamente:
     - `MONGO_URL` o similar
   - Si no está, cópiala desde el servicio de MongoDB

5. **Actualiza tus variables de entorno en Railway**
   - En tu servicio backend, agrega/actualiza:
     ```
     MONGODB_URI=${{MongoDB.MONGO_URL}}
     ```
   - O usa la URL directamente que te da Railway

6. **Deploy automático**
   - Railway detectará los cambios y hará redeploy automáticamente

### Ventajas:
✅ Integración nativa con Railway  
✅ Backups automáticos  
✅ Variables de entorno automáticas  
✅ Fácil de configurar  
✅ Escalable  

### Desventajas:
❌ Costo adicional (después del tier gratuito)  
❌ Menos flexible que MongoDB Atlas  

---

## Opción 2: Continuar con MongoDB Atlas

Si prefieres seguir usando Atlas (por ejemplo, para tier gratuito más generoso):

### Pasos:

1. **Mantén tu cluster de Atlas activo**
   - Ve a https://cloud.mongodb.com

2. **Configura IP Whitelist**
   - En Atlas, ve a Network Access
   - Click "Add IP Address"
   - Selecciona "Allow access from anywhere" (0.0.0.0/0)
   - Esto permite que Railway se conecte

3. **En Railway, configura las variables de entorno**
   - Ve a tu servicio backend
   - En "Variables", agrega:
     ```
     MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/hot-wheels-manager?retryWrites=true&w=majority
     ```

4. **Asegúrate de que las demás variables estén configuradas:**
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=tu-secreto-seguro-aqui
   FRONTEND_URL=https://tu-frontend-url.vercel.app
   ```

### Ventajas:
✅ Tier gratuito generoso (512 MB)  
✅ Interfaz amigable  
✅ Backups automáticos  
✅ Monitoreo y alertas  

### Desventajas:
❌ Configuración adicional de IP whitelist  
❌ Requiere cuenta separada  

---

## Opción 3: Migrar tus datos de Local a Atlas/Railway

### A. Migrar de Local a Railway MongoDB

Si ya tienes el plugin de MongoDB en Railway:

```bash
# 1. Obtener la URL de Railway MongoDB
# Copia la MONGO_URL desde Railway dashboard

# 2. Exportar desde local
mongodump --uri="mongodb://localhost:27017/hot-wheels-manager" --out=./backup-for-railway

# 3. Importar a Railway
mongorestore --uri="RAILWAY_MONGO_URL_AQUI" --dir=./backup-for-railway/hot-wheels-manager
```

### B. Migrar de Local a Atlas

```bash
# 1. Exportar desde local
mongodump --uri="mongodb://localhost:27017/hot-wheels-manager" --out=./backup-for-atlas

# 2. Importar a Atlas
mongorestore --uri="mongodb+srv://usuario:password@cluster.mongodb.net/hot-wheels-manager" --dir=./backup-for-atlas/hot-wheels-manager
```

---

## Configuración Recomendada para Producción

### Variables de Entorno en Railway (Backend)

```env
# Entorno
NODE_ENV=production
PORT=3001

# Database (opción 1: Railway MongoDB Plugin)
MONGODB_URI=${{MongoDB.MONGO_URL}}

# O (opción 2: MongoDB Atlas)
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# JWT
JWT_SECRET=genera-un-secreto-muy-seguro-aqui

# CORS - Frontend URL
FRONTEND_URL=https://tu-app.vercel.app

# Rate Limiting (opcional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cloudinary (si lo usas)
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# Facebook (si lo usas)
FACEBOOK_PAGE_ID=tu-page-id
FACEBOOK_ACCESS_TOKEN=tu-access-token
```

---

## Checklist de Deployment

### Antes del Deploy:

- [ ] MongoDB configurado (Railway Plugin o Atlas)
- [ ] Variables de entorno configuradas en Railway
- [ ] CORS configurado para tu frontend
- [ ] JWT_SECRET generado (seguro y único)
- [ ] Datos migrados (si es necesario)

### Después del Deploy:

- [ ] Verificar logs en Railway
- [ ] Probar conexión a base de datos
- [ ] Crear usuario administrador (si es necesario)
- [ ] Verificar que el frontend se conecta correctamente

---

## Comandos Útiles

### Crear usuario admin en Railway/Atlas:

```bash
# Usar variables de entorno de producción
MONGODB_URI="tu-url-de-produccion" npm run create-admin
```

### Ver logs en Railway:

```bash
# Instalar CLI de Railway
npm install -g @railway/cli

# Login
railway login

# Ver logs
railway logs
```

### Verificar conexión a MongoDB:

```bash
# Conectar a MongoDB de Railway/Atlas
mongosh "tu-mongo-uri-aqui"
```

---

## Solución de Problemas

### Error: "No se puede conectar a MongoDB"

1. Verifica que la variable `MONGODB_URI` esté correctamente configurada
2. Si usas Atlas, verifica el IP whitelist (debe incluir 0.0.0.0/0)
3. Verifica usuario y password en la URL de conexión
4. Revisa los logs en Railway: `railway logs`

### Error: "Database not found"

- Asegúrate de que el nombre de la base de datos en la URI sea correcto
- Para Railway: `/railway` suele ser el default
- Para Atlas: el nombre que configuraste

### Variables de entorno no se aplican

1. Asegúrate de hacer redeploy después de cambiar variables
2. En Railway: Click en "Deploy" después de cambiar variables
3. Verifica que uses el formato correcto: `${{service.VARIABLE}}`

---

## Recomendación Final

Para producción, recomiendo:

1. **Backend en Railway** con **MongoDB Plugin de Railway**
   - Todo en un solo lugar
   - Variables de entorno automáticas
   - Fácil de mantener

2. **Frontend en Vercel** (como ya tienes)

3. **Backup manual periódico** usando los scripts que creamos:
   ```bash
   # Desde tu máquina local, hacer backup de producción
   mongodump --uri="$RAILWAY_MONGO_URL" --out=./backups/prod-$(date +%Y%m%d)
   ```

Esto te da lo mejor de ambos mundos: simplicidad y control.
