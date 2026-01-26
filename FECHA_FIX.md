# Corrección de Desfase de Fechas - Guía Completa

## Problema Reportado
Las fechas de ventas y entregas aparecían un día adelantado. Por ejemplo:
- Viernes: registra venta con fecha de sábado
- Sábado: los datos de viernes siguen apareciendo como si fuera el mismo día
- Resultado: datos cruzados de 2 días diferentes mostrados como uno solo en el widget

## Causa Raíz
JavaScript interpreta las cadenas de fecha en formato `YYYY-MM-DD` como **UTC**, no como hora local. Esto causaba:

```javascript
// Lo que sucedía:
new Date("2026-01-24")  // Se interpretaba como 2026-01-24T00:00:00Z (UTC)
// En México (UTC-6): eso es 2026-01-23T18:00:00 (6 PM del 23)
```

### Problemas Específicos

1. **Frontend enviaba fechas correctas**, pero como strings en formato ISO
2. **Backend interpretaba mal** esas fechas con `new Date(dateString)`, causando desfase de zona horaria
3. **Comparaciones de fechas** en MongoDB se hacían con los datos incorrectos
4. **Dashboard mostraba datos "hoy"** usando `new Date(year, month, day)` sin considerar timezone

## Solución Implementada

### 1. Backend: `/backend/src/utils/dateUtils.ts`
Creé funciones para manejar fechas correctamente:

```typescript
// Parsea "2026-01-24" como si fuera medianoche local
getDayRangeUTC(dateString: string) {
  return {
    startDate: getStartOfDayUTC(date),  // 00:00:00 UTC equivalente
    endDate: getEndOfDayUTC(date)       // 23:59:59 UTC equivalente
  }
}

// Convierte Date a "YYYY-MM-DD" en timezone local
dateToString(date: Date): string
```

### 2. Frontend: `/frontend/src/utils/dateUtils.ts`
Funciones equivalentes para mantener consistencia:

```typescript
dateToString(date: Date = new Date()): string
getDefaultStartDate(daysBack: number = 30): string
```

### 3. Correcciones en Controladores

#### `deliveriesController.ts`
- ✅ `getDeliveries`: Usa `getDayRangeUTC()` para filtrar por fecha correctamente
- ✅ `createDelivery`: Parsea `scheduledDate` como string local, no UTC

#### `dashboardController.ts`
- ✅ Reemplazó `setHours()` por `getDayRangeUTC()`
- ✅ Calcula correctamente "entregas de hoy" y "ventas de hoy"

#### `salesController.ts`
- ✅ Corrigió cálculo del inicio del mes

### 4. Correcciones en Frontend

#### `pages/Deliveries.tsx`
- ✅ Usa `dateToString()` en lugar de `.toISOString().split('T')[0]`
- ✅ Inicializa `selectedDate` con `getDefaultStartDate(30)`
- ✅ Resetea fechas correctamente en modales

## Archivos Modificados

### Backend
1. `/backend/src/utils/dateUtils.ts` - **NUEVO**
2. `/backend/src/controllers/deliveriesController.ts`
3. `/backend/src/controllers/dashboardController.ts`
4. `/backend/src/controllers/salesController.ts`

### Frontend
1. `/frontend/src/utils/dateUtils.ts` - **NUEVO**
2. `/frontend/src/pages/Deliveries.tsx`

## Resultado
✅ Las fechas ahora se interpretan correctamente en la zona horaria local
✅ Las entregas y ventas se asignan al día correcto
✅ El widget "hoy" muestra datos del día correcto sin solapamiento
✅ Los datos históricos no se cruzan entre días diferentes

## Próximas Acciones Recomendadas
1. **Limpiar datos históricos**: Considera corregir fechas de registros anteriores si es necesario
2. **Pruebas**: Verifica que los datos se muestren correctamente después del deploy
3. **Monitorear**: Sigue atento por si hay desfases en otros componentes que usen fechas

## Notas Técnicas
- Las funciones respetan la zona horaria local del servidor
- MongoDB almacena fechas en UTC, las funciones convierten correctamente
- Los filtros de fecha ahora usan rangos de 24 horas en UTC equivalente
