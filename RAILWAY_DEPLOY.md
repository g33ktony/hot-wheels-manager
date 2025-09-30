# Instrucciones para Deploy en Railway

## 1. Crear cuenta en Railway
- Ve a https://railway.app
- Regístrate con tu cuenta personal

## 2. Crear nuevo proyecto
- Click en 'New Project'
- Selecciona 'Deploy from GitHub repo'

## 3. Conectar GitHub
- Autoriza Railway para acceder a tus repositorios
- Selecciona el repositorio 'hot-wheels-manager'

## 4. Configurar variables de entorno
En Railway Dashboard > Variables:
- NODE_ENV=production
- PORT=3001 (Railway lo asigna automáticamente)
- MONGODB_URI=tu-conexion-mongodb-atlas
- JWT_SECRET=genera-un-jwt-secret-seguro
- FRONTEND_URL=https://tu-frontend.vercel.app
- UPLOAD_PATH=uploads
- MAX_FILE_SIZE=5242880
- ALLOWED_FILE_TYPES=jpeg,jpg,png,webp

## 5. Deploy automático
Railway detectará automáticamente el package.json y hará el deploy.

## 6. Verificar funcionamiento
- Revisa los logs en Railway Dashboard
- Prueba los endpoints de la API

## Notas importantes:
- Asegúrate de que tu .env local NO se suba al repositorio
- Las variables sensibles van en Railway, no en el código
- Railway asigna automáticamente el puerto y dominio
