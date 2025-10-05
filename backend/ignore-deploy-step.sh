#!/bin/bash

# Script para Railway - Solo hace deploy si hay cambios en backend o shared
# Si NO hay cambios, exit 1 causa que el build falle y Railway no deploya

echo "🔍 Verificando cambios relevantes para backend..."

# Obtener el commit anterior
if git rev-parse HEAD^ >/dev/null 2>&1; then
  PREVIOUS_COMMIT="HEAD^"
else
  # Si es el primer commit, comparar con un árbol vacío
  PREVIOUS_COMMIT="4b825dc642cb6eb9a060e54bf8d69288fbee4904"
fi

# Verificar cambios en backend/ o shared/ o archivos de configuración
if git diff --name-only $PREVIOUS_COMMIT HEAD | grep -qE "^(backend/|shared/|railway\.toml|railway\.json|start\.sh|package\.json)"; then
  echo "✅ Cambios detectados en backend, shared o configuración"
  echo "🚀 Procediendo con el deploy..."
  exit 0  # Exit code 0 = continuar con deploy
else
  echo "⏭️  No hay cambios en backend - Cancelando deploy"
  echo "💡 Solo hubo cambios en frontend, no es necesario rebuildir backend"
  exit 1  # Exit code 1 = cancelar deploy (build falla intencionalmente)
fi
