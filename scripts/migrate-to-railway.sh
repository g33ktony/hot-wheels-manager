#!/bin/bash

# Script para migrar datos locales a Railway MongoDB
# Uso: ./scripts/migrate-to-railway.sh

set -e

echo "🚀 Migración de MongoDB Local a Railway"
echo "========================================"
echo ""

# Verificar que mongodump y mongorestore están instalados
if ! command -v mongodump &> /dev/null; then
    echo "❌ Error: mongodump no está instalado"
    echo "   Instala con: brew install mongodb-database-tools"
    exit 1
fi

if ! command -v mongorestore &> /dev/null; then
    echo "❌ Error: mongorestore no está instalado"
    echo "   Instala con: brew install mongodb-database-tools"
    exit 1
fi

# Solicitar la URL de Railway MongoDB
echo "📝 Necesito la URL de conexión PÚBLICA de Railway MongoDB"
echo ""
echo "⚠️  IMPORTANTE: Necesitas la URL PÚBLICA (no la interna)"
echo ""
echo "Para obtenerla:"
echo "1. Ve a https://railway.app/dashboard"
echo "2. Abre tu servicio de MongoDB"
echo "3. Ve a la pestaña 'Connect'"
echo "4. Busca 'Public URL' o 'TCP Proxy URL'"
echo "5. Debe verse como: mongodb://mongo:pass@monorail.proxy.rlwy.net:XXXXX"
echo "   (NO debe contener 'railway.internal')"
echo ""
read -p "Pega aquí la URL PÚBLICA de Railway MongoDB: " RAILWAY_MONGO_URL

# Validar que no sea URL interna
if [[ "$RAILWAY_MONGO_URL" == *"railway.internal"* ]]; then
    echo ""
    echo "❌ Error: Esta es la URL interna de Railway"
    echo "   La URL interna solo funciona desde dentro de Railway"
    echo "   Necesitas la URL PÚBLICA que incluye 'monorail.proxy.rlwy.net'"
    echo ""
    echo "   Intenta de nuevo con la URL pública"
    exit 1
fi

if [ -z "$RAILWAY_MONGO_URL" ]; then
    echo "❌ Error: La URL no puede estar vacía"
    exit 1
fi

# Crear backup temporal
BACKUP_DIR="./temp-backup-for-railway"
echo ""
echo "📦 Creando backup de base de datos local..."
mongodump --uri="mongodb://localhost:27017/hot-wheels-manager" --out="$BACKUP_DIR"

if [ $? -ne 0 ]; then
    echo "❌ Error al crear backup local"
    exit 1
fi

# Contar documentos en backup
TOTAL_DOCS=$(find "$BACKUP_DIR/hot-wheels-manager" -name "*.bson" -exec wc -c {} + | awk '{s+=$1} END {print s}')
echo "✅ Backup creado: $TOTAL_DOCS bytes"
echo ""

# Confirmar antes de continuar
echo "⚠️  IMPORTANTE: Esto va a importar todos los datos a Railway MongoDB"
echo ""
ls -lh "$BACKUP_DIR/hot-wheels-manager"
echo ""
read -p "¿Continuar con la migración? (si/no): " CONFIRM

if [ "$CONFIRM" != "si" ]; then
    echo "❌ Migración cancelada"
    rm -rf "$BACKUP_DIR"
    exit 0
fi

# Restaurar en Railway
echo ""
echo "🚀 Migrando datos a Railway..."
# Extraer el nombre de la base de datos de la URL de Railway
# Railway usa la base de datos "railway" por defecto
mongorestore --uri="$RAILWAY_MONGO_URL" --nsInclude="hot-wheels-manager.*" --nsFrom="hot-wheels-manager.*" --nsTo="railway.*" --dir="$BACKUP_DIR" --drop

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Migración completada exitosamente!"
    echo ""
    echo "📊 Verificando datos en Railway..."
    mongosh "$RAILWAY_MONGO_URL" --eval "db.getCollectionNames().forEach(function(col) { print(col + ': ' + db[col].countDocuments() + ' documentos'); })"
    
    echo ""
    echo "🎉 Todo listo. Próximos pasos:"
    echo "1. Ve a Railway → Tu servicio Backend"
    echo "2. En 'Variables', asegúrate de que MONGODB_URI use la URL de Railway"
    echo "3. Haz redeploy si es necesario"
    
    # Limpiar backup temporal
    rm -rf "$BACKUP_DIR"
else
    echo "❌ Error al migrar datos a Railway"
    echo "El backup local se mantiene en: $BACKUP_DIR"
    exit 1
fi
