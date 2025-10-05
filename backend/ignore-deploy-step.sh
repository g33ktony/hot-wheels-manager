#!/bin/bash

# Script para Railway - Solo hace deploy si hay cambios en backend o shared
# Railway usa shallow clones, así que verificamos de diferentes maneras

echo "🔍 Verificando cambios relevantes para backend..."

# Método 1: Verificar si existe .git y tiene historia
if [ ! -d ".git" ] || ! git rev-parse HEAD^ >/dev/null 2>&1; then
  echo "⚠️  No hay historia git disponible (shallow clone)"
  echo "🔍 Verificando usando Railway environment variables..."
  
  # Si no hay historia, verificar usando variables de Railway
  # RAILWAY_GIT_COMMIT_SHA contiene el SHA actual
  if [ -n "$RAILWAY_GIT_COMMIT_SHA" ]; then
    # Fetch para obtener historia reciente
    git fetch --unshallow --quiet 2>/dev/null || git fetch --depth=2 --quiet 2>/dev/null || true
  fi
fi

# Método 2: Comparar con commit anterior si está disponible
if git rev-parse HEAD^ >/dev/null 2>&1; then
  PREVIOUS_COMMIT="HEAD^"
  
  # Verificar cambios en backend/ o shared/ o archivos de configuración
  if git diff --name-only $PREVIOUS_COMMIT HEAD | grep -qE "^(backend/|shared/|railway\.toml|railway\.json|start\.sh|package\.json)"; then
    echo "✅ Cambios detectados en backend, shared o configuración"
    echo "🚀 Procediendo con el deploy..."
    exit 0  # Exit code 0 = continuar con deploy
  else
    echo "⏭️  No hay cambios en backend - Cancelando deploy"
    echo "💡 Solo hubo cambios en frontend, no es necesario rebuildir backend"
    exit 1  # Exit code 1 = cancelar deploy
  fi
else
  # Método 3: Si no podemos comparar, verificar si existen archivos de backend modificados recientemente
  echo "⚠️  No se puede obtener commit anterior"
  echo "🔍 Verificando modificaciones recientes en backend..."
  
  # Verificar si hay archivos de backend (fallback seguro)
  if [ -d "backend" ] && [ "$(find backend -type f -mmin -10 | wc -l)" -gt 0 ]; then
    echo "✅ Archivos en backend/ modificados recientemente"
    echo "🚀 Procediendo con el deploy por seguridad..."
    exit 0
  else
    echo "⚠️  No se pueden verificar cambios con certeza"
    echo "🚀 Procediendo con el deploy por seguridad..."
    exit 0  # Por seguridad, hacer deploy si no estamos seguros
  fi
fi
