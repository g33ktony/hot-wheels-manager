#!/bin/bash

echo "🔍 Verificando instalación de MongoDB..."
echo ""

# Verificar si MongoDB está instalado
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB no está instalado"
    echo ""
    echo "Para instalar MongoDB en macOS:"
    echo "  brew tap mongodb/brew"
    echo "  brew install mongodb-community"
    exit 1
fi

echo "✅ MongoDB está instalado"
mongod --version | head -n 1
echo ""

# Verificar si MongoDB está corriendo
if brew services list | grep -q "mongodb-community.*started"; then
    echo "✅ MongoDB está corriendo"
else
    echo "⚠️  MongoDB no está corriendo"
    echo ""
    echo "Para iniciar MongoDB:"
    echo "  brew services start mongodb-community"
    exit 1
fi

echo ""
echo "🔗 Intentando conectar a MongoDB..."

# Intentar conectar
if mongosh --eval "db.version()" --quiet > /dev/null 2>&1; then
    echo "✅ Conexión exitosa a MongoDB"
    echo ""
    echo "📊 Información de la base de datos:"
    mongosh --eval "
        print('Versión:', db.version());
        print('Bases de datos disponibles:');
        db.adminCommand('listDatabases').databases.forEach(function(db) {
            print('  -', db.name, '(' + (db.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB)');
        });
    " --quiet
    echo ""
    echo "✅ Todo está listo para usar MongoDB local"
else
    echo "❌ No se pudo conectar a MongoDB"
    echo ""
    echo "Verifica que MongoDB esté corriendo:"
    echo "  brew services restart mongodb-community"
    exit 1
fi
