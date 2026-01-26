#!/bin/bash

# Script para ejecutar la migración de fechas
# Uso: ./fix-date-migration.sh [preview|fix]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

MODE="${1:-preview}"

echo "🔧 Herramienta de Migración de Fechas - Hot Wheels Manager"
echo "═══════════════════════════════════════════════════════"
echo ""

if [ "$MODE" = "preview" ]; then
    echo "📋 MODO PREVIEW: Simulando cambios sin guardar..."
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   - Este script corregirá todas las fechas con desfase de 6 horas"
    echo "   - Afecta: Entregas, Ventas, Items Pendientes, Compras"
    echo "   - En PREVIEW solo verás qué se cambiaría"
    echo ""
    echo "Para ejecutar el fix real, usa:"
    echo "   ./fix-date-migration.sh fix"
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    # Mostrar preview
    cd "$PROJECT_ROOT"
    node_modules/.bin/ts-node src/scripts/fixDateMigration.ts --preview
    
elif [ "$MODE" = "fix" ]; then
    echo "⚠️  ADVERTENCIA: Estás a punto de ejecutar la migración REAL"
    echo ""
    echo "✅ Esta acción:"
    echo "   1. Corregirá todas las fechas con desfase de 6 horas"
    echo "   2. Afectará Entregas, Ventas, Items Pendientes y Compras"
    echo "   3. Los cambios son PERMANENTES"
    echo ""
    echo "❌ IMPORTANTE:"
    echo "   - Asegúrate de tener un BACKUP de tu base de datos"
    echo "   - No interrumpas el proceso mientras se ejecuta"
    echo "   - Verifica los resultados después"
    echo ""
    read -p "¿Estás seguro de continuar? (escribe 'SÍ' para confirmar): " confirm
    
    if [ "$confirm" = "SÍ" ] || [ "$confirm" = "SI" ]; then
        echo ""
        echo "Iniciando migración... ⏳"
        echo "═══════════════════════════════════════════════════════"
        echo ""
        
        cd "$PROJECT_ROOT"
        node_modules/.bin/ts-node src/scripts/fixDateMigration.ts --fix
        
    else
        echo ""
        echo "❌ Migración cancelada"
        exit 1
    fi
    
else
    echo "❌ Modo inválido: $MODE"
    echo ""
    echo "Uso:"
    echo "   ./fix-date-migration.sh preview     (Ver qué se cambiaría)"
    echo "   ./fix-date-migration.sh fix         (Ejecutar cambios reales)"
    exit 1
fi
