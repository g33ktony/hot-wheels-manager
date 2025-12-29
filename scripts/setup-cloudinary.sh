#!/bin/bash

# Script de Setup para Cloudinary
# Este script guía la configuración paso a paso

echo "🎉 Setup Cloudinary para Hot Wheels Manager"
echo "=============================================="
echo ""
echo "Este script te ayudará a configurar Cloudinary"
echo ""
echo "Necesitarás:"
echo "  1. Crear cuenta en https://cloudinary.com"
echo "  2. Tu Cloud Name (del dashboard)"
echo "  3. Un Upload Preset sin autenticación"
echo ""

# Preguntar si ya tiene cuenta
read -p "¿Ya tienes cuenta Cloudinary? (s/n): " has_account

if [ "$has_account" != "s" ]; then
    echo ""
    echo "📝 Abriendo Cloudinary en el navegador..."
    open "https://cloudinary.com/users/register/free" 2>/dev/null || xdg-open "https://cloudinary.com/users/register/free" 2>/dev/null || echo "Abre https://cloudinary.com/users/register/free"
    read -p "Presiona Enter cuando hayas creado tu cuenta..."
fi

echo ""
echo "🔍 Obteniendo Cloud Name..."
echo "Ve a: https://cloudinary.com/console"
read -p "¿Cuál es tu Cloud Name? (ejemplo: hwm-production): " cloud_name

if [ -z "$cloud_name" ]; then
    echo "❌ Cloud Name requerido"
    exit 1
fi

echo ""
echo "🔑 Creando Upload Preset..."
echo "Ve a: https://cloudinary.com/console/settings/upload"
echo ""
echo "Debes crear un preset con estos valores:"
echo "  - Preset name: unsigned_upload"
echo "  - Unsigned: ✓ (activado)"
echo "  - Folder: hot-wheels-manager/inventory"
echo ""
read -p "¿Ya creaste el preset? (s/n): " preset_created

if [ "$preset_created" != "s" ]; then
    echo "⚠️ El preset es necesario para continuar"
    exit 1
fi

# Actualizar archivo .env del frontend
echo ""
echo "📝 Actualizando frontend/.env..."

if [ ! -f "frontend/.env" ]; then
    cat > "frontend/.env" << EOF
# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=$cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=unsigned_upload
EOF
    echo "✅ Creado frontend/.env"
else
    # Actualizar si ya existe
    if grep -q "VITE_CLOUDINARY_CLOUD_NAME" "frontend/.env"; then
        sed -i '' "s/VITE_CLOUDINARY_CLOUD_NAME=.*/VITE_CLOUDINARY_CLOUD_NAME=$cloud_name/" "frontend/.env"
    else
        echo "" >> "frontend/.env"
        echo "# Cloudinary Configuration" >> "frontend/.env"
        echo "VITE_CLOUDINARY_CLOUD_NAME=$cloud_name" >> "frontend/.env"
        echo "VITE_CLOUDINARY_UPLOAD_PRESET=unsigned_upload" >> "frontend/.env"
    fi
    echo "✅ Actualizado frontend/.env"
fi

# Actualizar archivo .env del backend
echo "📝 Actualizando backend/.env..."

if [ ! -f "backend/.env" ]; then
    cat > "backend/.env" << EOF
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=$cloud_name
CLOUDINARY_UPLOAD_PRESET=unsigned_upload
EOF
    echo "✅ Creado backend/.env"
else
    if grep -q "CLOUDINARY_CLOUD_NAME" "backend/.env"; then
        sed -i '' "s/CLOUDINARY_CLOUD_NAME=.*/CLOUDINARY_CLOUD_NAME=$cloud_name/" "backend/.env"
    else
        echo "" >> "backend/.env"
        echo "# Cloudinary Configuration" >> "backend/.env"
        echo "CLOUDINARY_CLOUD_NAME=$cloud_name" >> "backend/.env"
        echo "CLOUDINARY_UPLOAD_PRESET=unsigned_upload" >> "backend/.env"
    fi
    echo "✅ Actualizado backend/.env"
fi

echo ""
echo "=============================================="
echo "✅ Setup Completo!"
echo "=============================================="
echo ""
echo "Próximos pasos:"
echo ""
echo "1️⃣  Para migrar imágenes existentes:"
echo "   cd backend"
echo "   npx ts-node src/scripts/migrateImagesToCloudinary.ts"
echo ""
echo "2️⃣  Inicia la app:"
echo "   npm run dev"
echo ""
echo "3️⃣  Las nuevas imágenes se subirán a Cloudinary automáticamente"
echo ""
echo "📖 Ver documentación: docs/CLOUDINARY_MIGRATION.md"
echo ""
