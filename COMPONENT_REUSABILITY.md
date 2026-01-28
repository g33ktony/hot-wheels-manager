# Component Reusability Architecture

## Overview
La aplicación Hot Wheels Manager ha sido refactorizada para maximizar la reutilización de componentes modales y detalle, reduciendo duplicación de código y mejorando la mantenibilidad.

## Modal Components - Core Reusable Modals

### 1. **SaleDetailsModal** (`/components/SaleDetailsModal.tsx`)
**Uso**: Mostrar detalles completos de ventas
**Props principales**:
- `sale`: Datos de la venta
- `isOpen`: Booleano para control de visibilidad
- `onClose`: Callback para cerrar
- `readonly?: boolean` - Prop para deshabilitar interactividad en búsqueda global
- `onOpenImageModal?: (photos: string[]) => void` - Callback para abrir galería

**Lugares donde se usa**:
- ✅ `pages/Sales.tsx` - Modo editable completo
- ✅ `pages/CustomerProfile.tsx` - Modo editable (ventas del cliente)
- ✅ `pages/Search.tsx` - Modo readonly (búsqueda global)

**Contenido**:
- Información general (cliente, email, teléfono)
- Resumen financiero (total venta, costo, ganancia, margen)
- Listado de items con fotos
- Galería de imágenes clickeable

---

### 2. **DeliveryDetailsModal** (`/components/DeliveryDetailsModal.tsx`)
**Uso**: Mostrar detalles completos de entregas
**Props principales**:
- `delivery`: Datos de la entrega
- `isOpen`: Booleano para control de visibilidad
- `onClose`: Callback para cerrar
- `readonly?: boolean` - Prop para deshabilitar acciones (solo lectura)
- `onMarkAsPrepared?: (id: string) => void` - Marcar como preparada
- `onMarkAsCompleted?: (id: string) => void` - Marcar como completada
- `onViewCustomer?: (customerId: string) => void` - Ver perfil del cliente
- `inventoryItems?: any[]` - Items para calcular costos
- `preSaleItems?: any[]` - Items de preventa

**Lugares donde se usa**:
- ✅ `pages/Deliveries.tsx` - Modo editable, con botones de acción
- ✅ `pages/CustomerProfile.tsx` - Modo editable (entregas del cliente)
- ✅ `pages/Search.tsx` - Modo readonly (búsqueda global, sin botones)

**Comportamiento por prop `readonly`**:
- `readonly=false` (default): Muestra todos los botones de acción, permite editar
- `readonly=true`: Oculta botones de acción, solo visualización

**Contenido**:
- Información general (cliente, fecha, ubicación, estado)
- Resumen financiero (total venta, costos, ganancia, margen)
- Estado de pago (total, pagado, pendiente)
- Historial de pagos con opciones de eliminar
- Listado de items con fotos
- Notas de la entrega
- Formulario de edición integrado

---

### 3. **GenericDetailModal** (`/pages/Search.tsx` - Componente local)
**Uso**: Mostrar detalles genéricos (Inventory y Customer) en búsqueda global
**Tipos soportados**:
- `inventory` - Detalles de items
- `customer` - Detalles de clientes

**Lugares donde se usa**:
- ✅ `pages/Search.tsx` - Únicamente en búsqueda global

**Contenido por tipo**:
**Inventory**:
- Nombre del car, marca, tipo
- Stock disponible
- Precio sugerido, precio actual, costo
- Ganancia estimada
- Galería de fotos

**Customer**:
- Nombre, email, teléfono, dirección
- Total gastado
- Total de órdenes

---

## Edit Forms - Componentes de Edición

### 1. **CustomerEditForm** (`/components/CustomerEditForm.tsx`)
**Campos editables**:
- Nombre (requerido)
- Email
- Teléfono
- Dirección
- Método de contacto (select: Email, Phone, WhatsApp)
- Notas

**Integrado en**:
- ✅ `pages/CustomerProfile.tsx` - Toggle entre vista y edición

---

### 2. **DeliveryEditForm** (`/components/DeliveryEditForm.tsx`)
**Campos editables**:
- Fecha programada
- Hora programada
- Ubicación
- Notas
- Estado (select: Programada, En Progreso, Completada, Cancelada)

**Integrado en**:
- ✅ `components/DeliveryDetailsModal.tsx` - Modal con edición integrada
- Solo visible cuando: `delivery.status !== 'completed'`

---

## Content Components - Componentes de Contenido

### 1. **SaleDetailContent** (`/components/SaleDetailContent.tsx`)
**Propósito**: Renderizar contenido formateado de detalles de venta
**Props**:
- `sale`: Datos de la venta
- `theme?: 'light' | 'dark'` - Tema visual
- `onOpenImageModal?: (photos: string[]) => void` - Callback para abrir galería

**Usado en**:
- `SaleDetailsModal` - Componente wrapper que lo renderiza

---

### 2. **DeliveryDetailContent** (`/components/DeliveryDetailContent.tsx`)
**Propósito**: Renderizar contenido formateado de detalles de entrega
**Props**:
- `delivery`: Datos de la entrega
- `theme?: 'light' | 'dark'` - Tema visual

**Usado en**:
- Potencialmente reutilizable en otros lugares

---

### 3. **ImageModal** (`/components/ImageModal.tsx`)
**Propósito**: Visor fullscreen de imágenes con navegación
**Props**:
- `isOpen`: Booleano
- `images: string[]` - Array de URLs
- `initialIndex?: number` - Índice inicial
- `onClose: () => void` - Callback al cerrar
- `title?: string` - Título opcional

**Usado en**:
- ✅ `pages/CustomerProfile.tsx` - Galería de fotos del cliente
- ✅ `components/SaleDetailsModal.tsx` - Galería de items vendidos
- ✅ `components/DeliveryDetailsModal.tsx` - Galería de items entregados

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│           MODAL CONSOLIDATION STRUCTURE                 │
└─────────────────────────────────────────────────────────┘

Sales Data:
  Sales.tsx ──┐
  CustomerProfile.tsx ├─► SaleDetailsModal (readonly prop)
  Search.tsx ─┘

Delivery Data:
  Deliveries.tsx ──┐
  CustomerProfile.tsx ├─► DeliveryDetailsModal (readonly prop)
  Search.tsx ─┘      (Edit: Only if status !== 'completed')

Search Results:
  Search.tsx ─►┬─► SaleDetailsModal (readonly=true)
               ├─► DeliveryDetailsModal (readonly=true)
               └─► GenericDetailModal (inventory/customer)

Edit Forms:
  CustomerEditForm ──► Integrated in CustomerProfile
  DeliveryEditForm ──► Integrated in DeliveryDetailsModal
```

---

## Benefits of This Architecture

### 1. **Reduced Code Duplication**
- ✅ Un solo `SaleDetailsModal` usado en 3 lugares
- ✅ Un solo `DeliveryDetailsModal` usado en 3 lugares
- ✅ Props flexibles (`readonly`) para adaptar comportamiento

### 2. **Consistent UX**
- ✅ Mismo modal con mismo contenido y comportamiento
- ✅ Solo cambia comportamiento según contexto (readonly prop)
- ✅ Todos los modales tienen funcionalidad de imágenes

### 3. **Easier Maintenance**
- ✅ Cambios en `SaleDetailsModal` afectan todos los lugares
- ✅ Una fuente única de verdad para cada tipo de modal
- ✅ Props bien documentadas

### 4. **Scalable Structure**
- ✅ Solo 3-4 componentes modales principales
- ✅ Componentes Content separados para lógica de presentación
- ✅ FormEdit componentes para edición con validación integrada

---

## Component Usage Pattern

### Pattern 1: Modal Reutilizable con Props (Recomendado)
```typescript
// En cualquier página
const [modalOpen, setModalOpen] = useState(false)
const [data, setData] = useState(null)

<SaleDetailsModal
    sale={data}
    isOpen={modalOpen}
    onClose={() => setModalOpen(false)}
    readonly={isSearchContext} // 👈 Prop para adaptar comportamiento
/>
```

### Pattern 2: Edición Integrada en Modal
```typescript
// En DeliveryDetailsModal
const [isEditing, setIsEditing] = useState(false)

{isEditing ? (
    <DeliveryEditForm ... />
) : (
    <DeliveryDetailContent ... />
)}
```

### Pattern 3: Componente Local para Casos Especiales
```typescript
// Solo si es necesario lógica completamente diferente
// Crear en pages/ como GenericDetailModal
```

---

## Current Modal Count by Feature

| Feature | Total Modals | Reusable | Page-Specific |
|---------|-------------|----------|----------------|
| Sales | 1 | 1 (SaleDetailsModal) | 0 |
| Deliveries | 1 | 1 (DeliveryDetailsModal) | 0 |
| Customers | 1 | 1 (CustomerEditForm) | 0 |
| Images | 1 | 1 (ImageModal) | 0 |
| Search | 1 | 1 (GenericDetailModal - local) | 1 |
| **TOTAL** | **5** | **4** | **1** |

---

## Future Improvements

1. **Move GenericDetailModal to Components**
   - Convertir `GenericDetailModal` de `Search.tsx` a `/components/`
   - Permitir reutilización en otros contextos

2. **Create ModalWrapper Component**
   - Componente genérico para envolver contenido
   - Manejar estado, tema, botones cerrar comúnmente

3. **Standardize Edit Forms**
   - Crear base reusable `EditForm` component
   - Heredar en `CustomerEditForm`, `DeliveryEditForm`, etc.

4. **ContentComponent Pattern**
   - Expandir `SaleDetailContent`, `DeliveryDetailContent`
   - Usar en más contextos

---

## Migration Guide (Si Necesario)

### Para cambiar SaleDetailsModal a readonly:
```typescript
// Antes
<SaleDetailsModal sale={data} isOpen={open} onClose={close} />

// Después
<SaleDetailsModal sale={data} isOpen={open} onClose={close} readonly={true} />
```

### Para cambiar DeliveryDetailsModal a readonly:
```typescript
// Antes - todos los callbacks opcionales
<DeliveryDetailsModal delivery={data} isOpen={open} onClose={close} />

// Después - agrega readonly
<DeliveryDetailsModal delivery={data} isOpen={open} onClose={close} readonly={true} />
```

---

## Summary

✅ **Objetivo Alcanzado**: La aplicación ahora reutiliza modales en múltiples lugares
✅ **Code Size**: Reducido mediante eliminación de duplicación
✅ **Maintainability**: Mejorada con componentes centralizados
✅ **Scalability**: Fácil agregar nuevos contextos con `readonly` props
