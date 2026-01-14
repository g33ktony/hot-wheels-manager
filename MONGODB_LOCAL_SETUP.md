# Configuración de MongoDB Local

## Pasos para migrar de MongoDB Atlas a MongoDB Local

### 1. Instalar MongoDB en tu máquina (macOS)

```bash
# Instalar MongoDB usando Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Iniciar MongoDB como servicio
brew services start mongodb-community

# Verificar que MongoDB está corriendo
brew services list | grep mongodb
```

### 2. Verificar la instalación

```bash
# Conectar a MongoDB usando mongosh
mongosh

# Deberías ver algo como:
# Current Mongosh Log ID: ...
# Connecting to: mongodb://127.0.0.1:27017/?directConnection=true
# Using MongoDB: 7.x.x
```

### 3. Configurar las variables de entorno

Edita tu archivo `.env` en el directorio `backend`:

```env
# Cambiar de:
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# A:
MONGODB_URI=mongodb://localhost:27017/hot-wheels-manager
```

### 4. (Opcional) Migrar datos de Atlas a Local

Si quieres mantener tus datos existentes:

```bash
# 1. Exportar datos desde Atlas
mongodump --uri="mongodb+srv://usuario:password@cluster.mongodb.net/database" --out=./backup

# 2. Importar datos a MongoDB local
mongorestore --uri="mongodb://localhost:27017/hot-wheels-manager" ./backup
```

### 5. Reiniciar el backend

```bash
cd backend
npm run dev
```

Deberías ver en los logs:
```
🔗 Connecting to database: hot-wheels-manager
✅ MongoDB connected successfully to hot-wheels-manager database
```

### 6. Crear usuario administrador (si es necesario)

Si migras sin datos, necesitarás crear un nuevo usuario administrador:

```bash
cd backend
npm run create-admin
```

## Comandos útiles de MongoDB

```bash
# Ver bases de datos
mongosh
show dbs

# Usar una base de datos
use hot-wheels-manager

# Ver colecciones
show collections

# Ver documentos de una colección
db.inventoryitems.find().limit(5)

# Parar MongoDB
brew services stop mongodb-community

# Reiniciar MongoDB
brew services restart mongodb-community

# Ver logs de MongoDB
tail -f /opt/homebrew/var/log/mongodb/mongo.log
```

## Ventajas de MongoDB Local

✅ **Sin costos**: No pagas por hosting de base de datos  
✅ **Más rápido**: Conexión local sin latencia de red  
✅ **Privacidad**: Tus datos están en tu máquina  
✅ **Desarrollo**: Ideal para desarrollo y pruebas  
✅ **Sin límites**: No hay límites de almacenamiento o transferencia  

## Desventajas

⚠️ **No accesible remotamente**: Solo funciona en tu máquina local  
⚠️ **Sin respaldo automático**: Debes hacer backups manualmente  
⚠️ **Sin alta disponibilidad**: Si tu máquina se apaga, la DB también  
⚠️ **No para producción**: No recomendado para apps en producción  

## Backups recomendados

Crea backups periódicos:

```bash
# Crear script de backup automático
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://localhost:27017/hot-wheels-manager" --out="./backups/backup_$DATE"
echo "Backup created: backup_$DATE"
```

Guarda este script como `backup-db.sh` y ejecútalo regularmente:

```bash
chmod +x backup-db.sh
./backup-db.sh
```
