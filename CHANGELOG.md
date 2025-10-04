# Changelog - Hot Wheels Manager

## [Unreleased] - 2025-10-03

### ✨ Added
- **Sistema completo de pagos para entregas**
  - Campos: `paidAmount`, `paymentStatus`, `payments[]`
  - Pagos parciales y completos
  - Historial de pagos con método, fecha y notas
  - Estados visuales: Pendiente (rojo), Parcial (naranja), Pagado (verde)
  - Modal de registro de pagos
  - Eliminación de pagos del historial

- **Pago automático al completar entregas**
  - Al marcar entrega como completada, se marca automáticamente como pagada
  - Registra pago automático por el monto restante
  - Identificado con nota: "Pago automático al completar entrega"
  - Al revertir entrega, elimina pago automático y recalcula estado

- **Optimizaciones móviles para Purchases**
  - Header responsive: flex-col en móvil, flex-row en desktop
  - Grid de estadísticas: 2 columnas en móvil, 3 en desktop
  - Touch targets de 44px en todos los botones
  - Texto responsive con tamaños ajustables

- **Optimizaciones móviles para Deliveries**
  - Select dropdown optimizado para touch
  - Touch targets de 44px
  - Layout responsive en formularios
  - Clase `touch-manipulation` para mejor respuesta táctil

### 🔧 Fixed
- **Compatibilidad con entregas existentes**
  - Campos de pago opcionales en tipos TypeScript
  - Frontend usa valores por defecto para entregas sin pagos
  - Manejo defensivo: `(delivery.paymentStatus || 'pending')`
  - Previene errores al cargar entregas antiguas

- **Dashboard - Cálculo de ganancias**
  - Ahora calcula ganancia real: `(precioVenta - precioCompra) * cantidad`
  - Populate de inventoryItems para obtener purchasePrice
  - Solo cuenta ventas completadas
  - Filtrado correcto de items con precio

- **Login - Navegación al dashboard**
  - Usa `AuthContext.login()` en lugar de localStorage directo
  - Navegación correcta después de autenticación
  - Estado de autenticación sincronizado

### 🛠️ Improved
- **Código más robusto**
  - Verificaciones de campos opcionales
  - Manejo de casos edge (entregas sin pagos)
  - Validación de montos de pago
  - Mejor manejo de errores

### 📚 Documentation
- **Script de migración de pagos**
  - `backend/src/scripts/migrateDeliveryPayments.ts`
  - README completo con instrucciones
  - Actualiza entregas existentes con valores por defecto
  - Documentación de troubleshooting

- **Instrucciones de autenticación**
  - `AUTHENTICATION.md` - Guía completa
  - `URL_CONFIGURATION.md` - Configuración de URLs
  - `TROUBLESHOOTING.md` - Solución de problemas

### 🔐 Security
- **Sistema de autenticación JWT**
  - Bcrypt con 10 rounds de salt
  - Tokens JWT con expiración de 30 días
  - Middleware de protección de rutas
  - Modelo de usuario con email único
  - Frontend: AuthContext con localStorage
  - Login page con validación

## Commits

### feat: Implementar sistema completo de pagos para entregas
**Commit:** `c8d6c80`
- Nuevo modelo Payment
- Controlador deliveryPaymentController
- Rutas API para pagos
- Modal de pagos en frontend
- Hooks y servicios de pagos

### fix: Hacer campos de pago opcionales para compatibilidad
**Commit:** `ae7ef39`
- Campos opcionales en interfaces
- Frontend defensivo con valores por defecto
- Script de migración creado

### docs: Agregar README para script de migración
**Commit:** `d5274d6`
- Documentación completa de migración
- Instrucciones de ejecución
- Troubleshooting

### feat: Marcar entregas como pagadas automáticamente al completarlas
**Commit:** `37bbc3f`
- Pago automático al completar
- Revertir pago automático al marcar como pendiente
- Mensajes actualizados en UI
- Mejor flujo de usuario

### fix: Dashboard profit calculation
**Commit:** `f773910` (anterior)
- Calcula ganancia real con precios de compra

### feat: Mobile optimizations
**Commit:** (varios anteriores)
- Purchases page responsive
- Deliveries select optimizado
- Touch targets 44px

### feat: Authentication system
**Commit:** (varios anteriores)
- JWT authentication
- User model
- Protected routes
- Login page
- Auth context

## Breaking Changes

### Entregas (Deliveries)
- Nuevos campos requeridos (con valores por defecto):
  - `paidAmount` (default: 0)
  - `paymentStatus` (default: 'pending')
  - `payments` (default: [])

### Migración Requerida
- Ejecutar `npm run migrate:delivery-payments` después de desplegar
- O simplemente desplegar (el código maneja entregas antiguas)

## Notas de Upgrade

### Desde versión sin pagos → Con sistema de pagos
1. **Backend**: Deploy con nuevos campos opcionales
2. **Frontend**: Deploy con manejo defensivo
3. **Base de datos** (opcional): Ejecutar script de migración
4. **Testing**: Verificar entregas existentes cargan correctamente

### Comportamiento nuevo
- **Completar entrega** ahora también marca como pagada
- **Revertir entrega** elimina pago automático
- **Pagos parciales** soportados antes de completar
- **Historial de pagos** visible en detalles de entrega

## TODO / Roadmap

### Próximas funcionalidades
- [ ] Reportes de pagos
- [ ] Exportar historial de pagos
- [ ] Múltiples métodos de pago por entrega
- [ ] Integración con sistemas de pago (Stripe, PayPal)
- [ ] Recordatorios de pagos pendientes
- [ ] Dashboard de flujo de caja

### Mejoras pendientes
- [ ] Tests unitarios para pagos
- [ ] Tests de integración para flujo completo
- [ ] Optimización de queries de pagos
- [ ] Cache de estados de pago
- [ ] Backup automático antes de migración

## Equipo

- **Developer**: Antonio
- **Repository**: g33ktony/hot-wheels-manager
- **Branch**: main
