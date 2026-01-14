#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
DB_NAME="hot-wheels-manager"
DB_URI="mongodb://localhost:27017"
BACKUP_DIR="./backend/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="$BACKUP_DIR/backup_$DATE"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🔄 Iniciando backup de MongoDB...${NC}"
echo ""
echo -e "Base de datos: ${YELLOW}$DB_NAME${NC}"
echo -e "Destino: ${YELLOW}$BACKUP_PATH${NC}"
echo ""

# Verificar que MongoDB está corriendo
if ! mongosh --eval "db.version()" --quiet > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  MongoDB no está corriendo. Iniciando...${NC}"
    brew services start mongodb-community
    sleep 3
fi

# Hacer el backup
if mongodump --uri="$DB_URI/$DB_NAME" --out="$BACKUP_PATH" --quiet; then
    # Calcular tamaño del backup
    BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
    
    echo ""
    echo -e "${GREEN}✅ Backup completado exitosamente${NC}"
    echo -e "Tamaño: ${YELLOW}$BACKUP_SIZE${NC}"
    echo -e "Ubicación: ${YELLOW}$BACKUP_PATH${NC}"
    echo ""
    
    # Listar backups existentes
    echo -e "${BLUE}📁 Backups disponibles:${NC}"
    ls -lht "$BACKUP_DIR" | grep "backup_" | head -5 | awk '{print "  " $9 " (" $5 ")"}'
    echo ""
    
    # Contar backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR" | grep "backup_" | wc -l | tr -d ' ')
    echo -e "Total de backups: ${YELLOW}$BACKUP_COUNT${NC}"
    
    # Sugerencia de limpieza si hay muchos backups
    if [ "$BACKUP_COUNT" -gt 10 ]; then
        echo ""
        echo -e "${YELLOW}💡 Tip: Tienes $BACKUP_COUNT backups. Considera eliminar los antiguos:${NC}"
        echo "  cd $BACKUP_DIR && ls -t | grep backup_ | tail -n +6 | xargs rm -rf"
    fi
else
    echo ""
    echo -e "${YELLOW}❌ Error al crear el backup${NC}"
    exit 1
fi
