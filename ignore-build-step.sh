#!/bin/bash

# Script para Vercel - Solo hace build si hay cambios en frontend o shared
# Uso: En Vercel Settings → Git → Ignored Build Step → bash ignore-build-step.sh

echo "🔍 Verificando si hay cambios en frontend o shared..."

# Obtener el commit anterior
if git rev-parse HEAD^ >/dev/null 2>&1; then
  PREVIOUS_COMMIT="HEAD^"
else
  # Si es el primer commit, comparar con un árbol vacío
  PREVIOUS_COMMIT="4b825dc642cb6eb9a060e54bf8d69288fbee4904"
fi

# Verificar cambios en frontend/ o shared/
if git diff --name-only $PREVIOUS_COMMIT HEAD | grep -qE "^(frontend/|shared/)"; then
  echo "✅ Cambios detectados en frontend o shared - Ejecutando build"
  exit 0  # Exit code 0 = SUCCESS → Vercel continúa con el build
else
  echo "⏭️  No hay cambios en frontend ni shared - Saltando build"
  exit 1  # Exit code 1 = ERROR → Vercel cancela el build
fi
