#!/bin/bash

# Simple monitoring script for scraper progress
while true; do
  clear
  echo ""
  echo "🔄 MONITOREO DEL SCRAPER - $(date '+%H:%M:%S')"
  echo "================================================================"
  echo ""
  
  # Get last lote
  LOTE=$(tail -50 scraper-run.log | grep "Lote" | tail -1 | awk '{print $3}' | head -c 20)
  echo "📊 Último Lote: $LOTE"
  
  # Get last item processed
  ITEM=$(tail -10 scraper-run.log | tail -1)
  echo "📄 Última línea: ${ITEM:0:80}"
  
  echo ""
  echo "📊 Estadísticas del log:"
  echo "   Líneas procesadas: $(wc -l < scraper-run.log)"
  echo "   Tamaño: $(du -h scraper-run.log | awk '{print $1}')"
  
  echo ""
  echo "✅ Scraper status:"
  if pgrep -f "ts-node.*run-scrape" > /dev/null; then
    echo "   ✅ ACTIVO"
  else
    echo "   ❌ TERMINADO"
  fi
  
  echo ""
  echo "⏳ Próxima actualización en 60 segundos..."
  echo "   (Presiona Ctrl+C para salir)"
  sleep 60
done
