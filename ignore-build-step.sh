#!/bin/bash

# Script para Vercel - Solo hace build si hay cambios en frontend, backend o shared
# Uso: En Vercel Settings → Git → Ignored Build Step → bash ignore-build-step.sh

echo "🔍 Verificando si hay cambios en frontend, backend o shared..."

# Obtener el commit anterior
if git rev-parse HEAD^ >/dev/null 2>&1; then
  PREVIOUS_COMMIT="HEAD^"
else
  # Si es el primer commit, comparar con un árbol vacío
  PREVIOUS_COMMIT="4b825dc642cb6eb9a060e54bf8d69288fbee4904"
fi

# Verificar cambios relevantes considerando dos escenarios:
# 1) Paths desde raíz del repo (frontend/, backend/, shared/)
# 2) Paths desde Root Directory=frontend en Vercel (src/, public/, etc.)
if git diff --name-only $PREVIOUS_COMMIT HEAD | grep -qE "^(frontend/|backend/|shared/|src/|public/|index\.html|vite\.config\.|package\.json|tsconfig\.)"; then
  echo "✅ Cambios relevantes detectados - Ejecutando build"
  exit 0  # Exit code 0 = SUCCESS → Vercel continúa con el build
else
  echo "⏭️  No hay cambios relevantes - Saltando build"
  exit 1  # Exit code 1 = ERROR → Vercel cancela el build
fi
