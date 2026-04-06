#!/bin/bash

# Script para Vercel - Ejecutar build solo con cambios de frontend.
# Uso: En Vercel Settings → Git → Ignored Build Step → bash ignore-build-step.sh

echo "🔍 Verificando cambios de frontend..."

# Obtener el commit anterior
if git rev-parse HEAD^ >/dev/null 2>&1; then
  PREVIOUS_COMMIT="HEAD^"
else
  PREVIOUS_COMMIT="4b825dc642cb6eb9a060e54bf8d69288fbee4904"
fi

# Soportar rutas desde raíz (frontend/...) y desde Root Directory=frontend (src/...)
if git diff --name-only "$PREVIOUS_COMMIT" HEAD | grep -qE "^(frontend/|shared/|src/|public/|index\.html|vite\.config\.|package\.json|tsconfig\.)"; then
  echo "✅ Cambios de frontend detectados - Ejecutando build en Vercel"
  exit 0
else
  echo "⏭️  Sin cambios de frontend - Saltando build en Vercel"
  exit 1
fi
