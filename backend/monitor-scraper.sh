#!/bin/bash

for i in {1..120}; do
  clear
  echo ""
  echo "🔄 MONITOREO DEL SCRAPER - $(date '+%H:%M:%S')"
  echo "======================================================================"
  echo ""
  
  # Count lines to estimate progress
  LINES=$(wc -l < scraper-run.log 2>/dev/null || echo "0")
  
  # Get last lote processed
  LAST_LOTE=$(tail -50 scraper-run.log 2>/dev/null | grep "Lote" | tail -1 | grep -o "Lote [0-9]*/[0-9]*" || echo "N/A")
  
  # Get last items found
  ITEMS=$(tail -50 scraper-run.log 2>/dev/null | grep "nuevos" | tail -1 | grep -o "[0-9]* nuevos" | head -1 || echo "N/A")
  
  echo "📊 ESTADO ACTUAL:"
  echo "   Lote procesando: $LAST_LOTE"
  echo "   Últimos items encontrados: $ITEMS"
  echo "   Total líneas log: $LINES"
  echo ""
  
  echo "✅ VERIFICACIÓN DE PROCESO:"
  if pgrep -f "ts-node.*run-scrape" > /dev/null; then
    CPU=$(ps aux | grep "ts-node.*run-scrape" | grep -v grep | awk '{print $3}%'}' | head -1)
    MEM=$(ps aux | grep "ts-node.*run-scrape" | grep -v grep | awk '{print $6}' | head -1 | numfmt --to=iec-i --suffix=B 2>/dev/null || echo "N/A")
    echo "   ✅ Scraper ACTIVO"
    echo "   CPU: $CPU"
    echo "   RAM: ${MEM}K"
  else
    echo "   ❌ Scraper TERMINADO"
    echo ""
    echo "🎉 Esperando sincronización con MongoDB..."
  fi
  
  echo ""
  echo "📝 ÚLTIMAS 5 LÍNEAS DE PROGRESO:"
  tail -5 scraper-run.log | sed 's/^/   /'
  
  echo ""
  echo "⏳ Ciclo $i/120 (próxima actualización en 30 segundos)"
  echo "   Presiona Ctrl+C para salir"
  sleep 30
done
