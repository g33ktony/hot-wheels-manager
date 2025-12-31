#!/bin/bash

# Script para verificar la configuración de Cloudinary
# Uso: bash scripts/verify-cloudinary.sh

echo "🔍 Verificando configuración de Cloudinary..."
echo ""

# Verificar backend
echo "📦 Backend (.env):"
if [ -f "backend/.env" ]; then
    if grep -q "CLOUDINARY_CLOUD_NAME" backend/.env; then
        CLOUD_NAME=$(grep "CLOUDINARY_CLOUD_NAME" backend/.env | cut -d '=' -f2)
        echo "  ✅ CLOUDINARY_CLOUD_NAME: $CLOUD_NAME"
    else
        echo "  ❌ CLOUDINARY_CLOUD_NAME no encontrado"
    fi
    
    if grep -q "CLOUDINARY_UPLOAD_PRESET" backend/.env; then
        PRESET=$(grep "CLOUDINARY_UPLOAD_PRESET" backend/.env | cut -d '=' -f2)
        echo "  ✅ CLOUDINARY_UPLOAD_PRESET: $PRESET"
    else
        echo "  ❌ CLOUDINARY_UPLOAD_PRESET no encontrado"
    fi
else
    echo "  ❌ backend/.env no existe"
fi

echo ""

# Verificar frontend
echo "🎨 Frontend (.env):"
if [ -f "frontend/.env" ]; then
    if grep -q "VITE_CLOUDINARY_CLOUD_NAME" frontend/.env; then
        CLOUD_NAME=$(grep "VITE_CLOUDINARY_CLOUD_NAME" frontend/.env | cut -d '=' -f2)
        echo "  ✅ VITE_CLOUDINARY_CLOUD_NAME: $CLOUD_NAME"
    else
        echo "  ❌ VITE_CLOUDINARY_CLOUD_NAME no encontrado"
    fi
    
    if grep -q "VITE_CLOUDINARY_UPLOAD_PRESET" frontend/.env; then
        PRESET=$(grep "VITE_CLOUDINARY_UPLOAD_PRESET" frontend/.env | cut -d '=' -f2)
        echo "  ✅ VITE_CLOUDINARY_UPLOAD_PRESET: $PRESET"
    else
        echo "  ❌ VITE_CLOUDINARY_UPLOAD_PRESET no encontrado"
    fi
else
    echo "  ❌ frontend/.env no existe"
fi

echo ""
echo "📋 Instrucciones:"
echo "  1. Crea cuenta en https://cloudinary.com"
echo "  2. Obtén Cloud Name en Dashboard > Settings > Account"
echo "  3. Crea Upload Preset en Dashboard > Settings > Upload"
echo "  4. Agrega las variables a los archivos .env"
echo ""
echo "📖 Ver documentación completa: docs/CLOUDINARY_MIGRATION.md"
