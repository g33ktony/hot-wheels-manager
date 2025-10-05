#!/bin/bash

# Script para Railway - Solo hace deploy si hay cambios en backend o shared
# Este script puede usarse como check antes del deploy

echo "🔍 Verificando si hay cambios en backend o shared..."

# Obtener el commit anterior
if git rev-parse HEAD^ >/dev/null 2>&1; then
  PREVIOUS_COMMIT="HEAD^"
else
  # Si es el primer commit, comparar con un árbol vacío
  PREVIOUS_COMMIT="4b825dc642cb6eb9a060e54bf8d69288fbee4904"
fi

# Verificar cambios en backend/ o shared/
if git diff --name-only $PREVIOUS_COMMIT HEAD | grep -qE "^(backend/|shared/|railway.toml|start.sh|package.json)"; then
  echo "✅ Cambios detectados en backend, shared o configuración - Ejecutando deploy"
  exit 0  # Exit code 0 = hacer deploy
else
  echo "⏭️  No hay cambios en backend - Saltando deploy"
  exit 1  # Exit code 1 = saltar deploy
fi
