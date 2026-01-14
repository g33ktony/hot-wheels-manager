#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuración
DB_NAME="hot-wheels-manager"
DB_URI="mongodb://localhost:27017"
BACKUP_DIR="./backend/backups"

echo -e "${BLUE}🔄 Restaurar backup de MongoDB${NC}"
echo ""

# Verificar que MongoDB está corriendo
if ! mongosh --eval "db.version()" --quiet > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  MongoDB no está corriendo. Iniciando...${NC}"
    brew services start mongodb-community
    sleep 3
fi

# Listar backups disponibles
echo -e "${BLUE}📁 Backups disponibles:${NC}"
echo ""

if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    echo -e "${RED}❌ No hay backups disponibles en $BACKUP_DIR${NC}"
    exit 1
fi

# Crear array con backups
backups=($(ls -t "$BACKUP_DIR" | grep "backup_"))
count=1

for backup in "${backups[@]}"; do
    backup_path="$BACKUP_DIR/$backup"
    backup_size=$(du -sh "$backup_path" | cut -f1)
    backup_date=$(echo "$backup" | sed 's/backup_//' | sed 's/_/ /' | sed 's/-/:/3' | sed 's/-/:/3')
    echo -e "${YELLOW}[$count]${NC} $backup_date (${YELLOW}$backup_size${NC})"
    count=$((count + 1))
done

echo ""
echo -e "${YELLOW}⚠️  ADVERTENCIA: Esto sobrescribirá los datos actuales de la base de datos${NC}"
echo ""
read -p "Selecciona el número del backup a restaurar (o 'c' para cancelar): " selection

if [ "$selection" == "c" ] || [ "$selection" == "C" ]; then
    echo "Operación cancelada"
    exit 0
fi

# Validar selección
if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt "${#backups[@]}" ]; then
    echo -e "${RED}❌ Selección inválida${NC}"
    exit 1
fi

# Obtener el backup seleccionado
selected_backup="${backups[$((selection - 1))]}"
backup_path="$BACKUP_DIR/$selected_backup"

echo ""
echo -e "${BLUE}📦 Restaurando backup: ${YELLOW}$selected_backup${NC}"
echo ""

# Confirmar
read -p "¿Estás seguro? Esto borrará todos los datos actuales (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Operación cancelada"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Eliminando datos actuales...${NC}"

# Eliminar datos actuales
mongosh "$DB_URI/$DB_NAME" --eval "
    db.getCollectionNames().forEach(function(col) {
        if (col !== 'system.indexes') {
            db[col].drop();
            print('  ✓ Eliminada colección: ' + col);
        }
    });
" --quiet

echo ""
echo -e "${BLUE}📥 Restaurando backup...${NC}"

# Restaurar backup
if mongorestore --uri="$DB_URI" --dir="$backup_path" --quiet; then
    echo ""
    echo -e "${GREEN}✅ Backup restaurado exitosamente${NC}"
    echo ""
    
    # Mostrar estadísticas
    echo -e "${BLUE}📊 Estadísticas de la base de datos:${NC}"
    mongosh "$DB_URI/$DB_NAME" --eval "
        db.getCollectionNames().forEach(function(col) {
            var count = db[col].countDocuments();
            if (count > 0) {
                print('  ' + col + ': ' + count + ' documentos');
            }
        });
    " --quiet
else
    echo ""
    echo -e "${RED}❌ Error al restaurar el backup${NC}"
    exit 1
fi
