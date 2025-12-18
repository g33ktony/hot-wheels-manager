#!/bin/bash

# Script para resetear la base de datos de Hot Wheels Manager
# Este script eliminará TODOS los datos

echo "🚀 Iniciando script de reseteo de base de datos..."
echo ""

# Cambiar al directorio del backend
cd "$(dirname "$0")"

# Verificar que existe el archivo .env
if [ ! -f .env ]; then
    echo "⚠️  Advertencia: No se encontró el archivo .env"
    echo "   Asegúrate de tener configurado MONGODB_URI"
    echo ""
fi

# Ejecutar el script con ts-node
npx ts-node src/scripts/reset-database.ts
