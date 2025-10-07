# 🚀 Plan de Implementación - Mejoras Formulario de Compra

## Cambios a Implementar (Opción C)

### ✅ Fase 1: Componentes Base (15 min)
1. Crear AutocompleteCarId.tsx ← YA HECHO ✅
2. Importar en Purchases.tsx
3. Agregar iconos Car y Box

### ✅ Fase 2: Estructura de Datos (10 min)
4. Agregar campo `itemType?: 'individual' | 'box' | 'series'` en el tipo de item
5. Inicializar con 'individual' por defecto en handleAddItem

### 🔄 Fase 3: Selector de Tipo (30 min) ← SIGUIENTE
6. Agregar selector de tipo al inicio del formulario (3 botones)
7. Lógica para cambiar entre tipos
8. Limpiar carId cuando cambie a caja

### 🔄 Fase 4: Formulario Condicional Caja (45 min)
9. Ocultar campos irrelevantes cuando `itemType === 'box'` o `isBox === true`
10. Mostrar solo:
    - Nombre de caja
    - Cantidad de cajas
    - Piezas por caja
    - Precio por caja
    - Cálculo automático: costo por pieza, total piezas, subtotal
    - Ubicación física
    - Notas

### 🔄 Fase 5: Formulario Mejorado Individual (60 min)
11. Reemplazar Input básico con AutocompleteCarId
12. Agregar validación en tiempo real (campos requeridos)
13. Mostrar subtotal siempre visible
14. Mantener todos los campos actuales

### 🔄 Fase 6: Validación y UX (30 min)
15. Mensajes de error en campos requeridos
16. Indicadores visuales de campos completos
17. Cálculos automáticos visibles

### 🔄 Fase 7: Resumen Total (15 min)
18. Mejorar visualización de totales
19. Desglose de costos

## Estado Actual

✅ AutocompleteCarId.tsx creado
✅ Imports agregados (revertidos)
❌ Purchases.tsx modificado (revertido para hacerlo incremental)

## Siguiente Paso

¿Prefieres?

**A) Implementación Completa de Una Vez** (2-3 horas)
- Hago todos los cambios en un solo commit
- Mayor riesgo de errores
- Resultado final inmediato

**B) Implementación Incremental** (mismas 2-3 horas, más seguro)
- Fase por fase, probando cada una
- Menos riesgo de romper cosas
- Puedes revisar y aprobar cada fase

**C) Solo el cambio principal** (30 min)
- Mover checkbox al inicio
- Ocultar campos cuando es caja
- Sin selector de tipo ni autocompletado

¿Qué prefieres? 🤔
