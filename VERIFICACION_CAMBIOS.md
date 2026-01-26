# Guía de Verificación - Corrección de Desfase de Fechas

## ✅ Pasos para Verificar la Corrección

### 1. Después del Deploy
```bash
# Reinicia el backend
npm run dev  # o el comando que uses

# Limpia cache del frontend
npm run build
```

### 2. Prueba Manual en el Dashboard

#### Prueba 1: Verifica "Entregas del Día"
- Abre `/dashboard`
- Mira la card "Entregas del Día"
- ✅ Debe mostrar SOLO entregas programadas para HOY
- ❌ Si muestra entregas de ayer o mañana = hay un problema

#### Prueba 2: Verifica "Ganancia Hoy"
- En el Dashboard
- Busca "Ganancia Ventas Hoy" o "Vendido Hoy"
- ✅ Debe mostrar SOLO ventas del día de hoy
- ❌ Si incluye ventas de ayer = hay un problema

### 3. Prueba Manual en Entregas

#### Prueba 3: Crear una entrega
1. Ve a `/deliveries`
2. Haz clic en "+ Crear Entrega"
3. Selecciona una fecha (ej: hoy)
4. Guarda la entrega
5. Verifica que aparezca con la fecha correcta
   - ✅ La fecha debe ser la que seleccionaste
   - ❌ Si aparece un día diferente = hay un problema

#### Prueba 4: Filtrar entregas por fecha
1. Ve a `/deliveries`
2. En el selector de fecha, selecciona "hace 7 días"
3. Verifica que se carguen entregas de los últimos 7 días
   - ✅ Debe haber entregas de hace 7 días hasta hoy
   - ❌ Si faltan algunas = hay un problema

### 4. Prueba en Ventas

#### Prueba 5: Verificar ventas del día
1. Ve a `/sales` (si existe)
2. Busca un contador de "Ventas Hoy"
3. ✅ Debe mostrar SOLO ventas de hoy
4. ❌ Si muestra ventas de ayer = hay un problema

## 🔍 Cómo Detectar Problemas

### Síntomas de que sigue habiendo problema
- Entregas/ventas aparecen un día adelantado o atrás
- El mismo registro aparece en dos días diferentes
- El widget "hoy" muestra datos inconsistentes
- Las fechas cambian cuando recargas la página

### Dónde revisar en la Base de Datos
```javascript
// Si tienes acceso directo a MongoDB:
db.deliveries.findOne({})
// Verifica que scheduledDate sea correcta en UTC

// En el navegador (DevTools):
// 1. Ve a Application/Storage -> Local Storage
// 2. Busca cualquier fecha guardada
// 3. Debe estar en formato "YYYY-MM-DD"
```

## 📊 Datos Históricos

### Si necesitas corregir datos anteriores:
```javascript
// Script MongoDB para ver desfase:
db.deliveries.aggregate([
  {
    $project: {
      _id: 1,
      scheduledDate: 1,
      dateString: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledDate" } }
    }
  },
  { $limit: 10 }
])
```

## 🛠️ Debugging

### Si algo sigue fallando:

1. **Revisa los logs del backend**:
   ```
   Busca: "CREATE DELIVERY REQUEST" o "DELIVERY CREATION DETAILS"
   Verifica que la fecha mostrada sea correcta
   ```

2. **Abre DevTools del navegador** (F12):
   ```javascript
   // Ejecuta en la consola:
   console.log(new Date().toISOString().split('T')[0])
   // Debe mostrar hoy en formato YYYY-MM-DD
   ```

3. **Revisa la solicitud de API**:
   - DevTools → Network tab
   - Crea una nueva entrega
   - Busca POST `/api/deliveries`
   - Verifica que `scheduledDate` sea correcto

## ✨ Señales de que está funcionando bien

- ✅ Las fechas en el formulario coinciden con las guardadas
- ✅ "Entregas del Día" solo muestra entregas de hoy
- ✅ "Ventas de Hoy" solo muestra ventas de hoy
- ✅ Al cambiar de zona horaria (si es aplicable), los datos se mantienen consistentes
- ✅ Los registros históricos permanecen sin cambios
- ✅ No hay datos duplicados entre días

## 📞 Si encuentras problemas

1. Nota la hora exacta cuando viste el problema
2. Toma un screenshot
3. Revisa los logs del backend
4. Verifica tu zona horaria del servidor vs. la local
5. Contacta al desarrollador con esta información
