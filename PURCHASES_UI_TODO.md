# TODO: Actualizar UI de Compras con Funcionalidades de Inventario

## ⚡ IMPORTANTE: Sistema de Sincronización Automática

**Cuando una compra se marca como "Recibida", todos los items se agregan AUTOMÁTICAMENTE al inventario.**

### Flujo Automático:
1. ✅ Usuario crea compra con TODOS los detalles (marca, tipo, TH/STH, Chase, series, fotos, ubicación)
2. ✅ Cuando la compra llega físicamente, marca como "Received"
3. ✅ **Backend automáticamente crea/actualiza items en inventario**
4. ✅ Usuario NO tiene que volver a ingresar información

### Campos que se Transfieren Automáticamente:
- ✅ carId, quantity, unitPrice (→ purchasePrice)
- ✅ condition
- ✅ brand, pieceType
- ✅ isTreasureHunt, isSuperTreasureHunt, isChase
- ✅ seriesId, seriesName, seriesSize, seriesPosition, seriesPrice
- ✅ photos[] (se agregan sin duplicar)
- ✅ location
- ✅ notes (se concatenan)

### Lógica de Actualización:
- Si el item YA existe en inventario (mismo carId + condition + brand):
  - Suma la cantidad
  - Actualiza precio de compra
  - Merge fotos sin duplicar
  - Concatena notas
- Si el item NO existe:
  - Crea nuevo item con TODA la información

---

## Estado Actual ✅
- ✅ Tipos actualizados en `shared/types.ts`
- ✅ Backend compilado exitosamente
- ✅ Estado de Purchases.tsx con todos los campos nuevos
- ✅ Funciones auxiliares implementadas (handleBrandChange, handleSaveCustomBrand, handleFileUpload, removePhoto)
- ✅ handleAddPurchase limpia datos correctamente

## Pendiente: Actualizar Modal UI 🚧

### Ubicación del Cambio
Archivo: `frontend/src/pages/Purchases.tsx`
Línea aproximada: ~700-800 (sección "Items de la Compra")

### Campos a Agregar en el Modal por cada Item

Para cada item en `newPurchase.items`, agregar los siguientes campos en el formulario:

#### 1. **Tipo de Compra** (Similar a Inventory.tsx líneas 869-919)
```tsx
- Radio buttons:
  - Pieza Individual (1 modelo)
  - Caja (5, 8 o 10 piezas iguales)
```

#### 2. **Marca** (Similar a Inventory.tsx líneas 1286-1351)
```tsx
<select value={item.brand} onChange={(e) => handleBrandChange(index, e.target.value)}>
  <option value="">Seleccionar marca</option>
  {allBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
  <option value="custom">➕ Agregar otra marca...</option>
</select>

{showCustomBrandInput && (
  <div>
    <input value={customBrandInput} onChange={(e) => setCustomBrandInput(e.target.value)} />
    <Button onClick={() => handleSaveCustomBrand(index)}>Guardar</Button>
    <Button onClick={() => {setShowCustomBrandInput(false); setCustomBrandInput('')}}>Cancelar</Button>
  </div>
)}
```

#### 3. **Tipo de Pieza** (Solo si hay marca)
```tsx
{item.brand && (
  <select value={item.pieceType} onChange={(e) => handleItemChange(index, 'pieceType', e.target.value)}>
    <option value="">Seleccionar tipo</option>
    <option value="basic">Básico</option>
    <option value="premium">Premium</option>
    <option value="rlc">RLC</option>
  </select>
)}
```

#### 4. **TH/STH Checkboxes** (Solo para Hot Wheels + Básico)
```tsx
{item.brand?.toLowerCase() === 'hot wheels' && item.pieceType === 'basic' && (
  <div>
    <label>
      <input 
        type="checkbox" 
        checked={item.isTreasureHunt} 
        disabled={item.isSuperTreasureHunt}
        onChange={(e) => handleItemChange(index, 'isTreasureHunt', e.target.checked)}
      />
      🔍 Treasure Hunt (TH)
    </label>
    
    <label>
      <input 
        type="checkbox" 
        checked={item.isSuperTreasureHunt}
        disabled={item.isTreasureHunt}
        onChange={(e) => handleItemChange(index, 'isSuperTreasureHunt', e.target.checked)}
      />
      ⭐ Super Treasure Hunt (STH)
    </label>
  </div>
)}
```

#### 5. **Chase Checkbox** (Para Mini GT, Kaido, M2, o Hot Wheels Premium)
```tsx
{((item.brand && ['mini gt', 'kaido house', 'm2 machines'].includes(item.brand.toLowerCase())) ||
  (item.brand?.toLowerCase() === 'hot wheels' && item.pieceType === 'premium')) && (
  <label>
    <input 
      type="checkbox" 
      checked={item.isChase}
      onChange={(e) => handleItemChange(index, 'isChase', e.target.checked)}
    />
    🌟 Chase
  </label>
)}
```

#### 6. **Serie** (Campos opcionales)
```tsx
<input 
  placeholder="ID de Serie (opcional)"
  value={item.seriesId}
  onChange={(e) => handleItemChange(index, 'seriesId', e.target.value)}
/>

<input 
  placeholder="Nombre de Serie"
  value={item.seriesName}
  onChange={(e) => handleItemChange(index, 'seriesName', e.target.value)}
/>

<input 
  type="number"
  placeholder="Tamaño serie (ej: 5)"
  value={item.seriesSize}
  onChange={(e) => handleItemChange(index, 'seriesSize', parseInt(e.target.value))}
/>

<input 
  type="number"
  placeholder="Posición (ej: 1)"
  value={item.seriesPosition}
  onChange={(e) => handleItemChange(index, 'seriesPosition', parseInt(e.target.value))}
/>

<input 
  type="number"
  placeholder="Precio serie total"
  value={item.seriesPrice}
  onChange={(e) => handleItemChange(index, 'seriesPrice', parseFloat(e.target.value))}
/>
```

#### 7. **Ubicación Física**
```tsx
<div>
  <label>
    <MapPin size={16} />
    Ubicación Física (Opcional)
  </label>
  <input
    placeholder="ej: Caja 1, Estante A..."
    value={item.location}
    onChange={(e) => handleItemChange(index, 'location', e.target.value)}
  />
</div>
```

#### 8. **Fotos** (Similar a Inventory.tsx líneas 1486-1532)
```tsx
<div>
  <label>Fotos (Opcional)</label>
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => handleFileUpload(index, e.target.files)}
  />
  
  {/* Preview de fotos */}
  {item.photos && item.photos.length > 0 && (
    <div className="grid grid-cols-4 gap-2">
      {item.photos.map((photo, photoIndex) => (
        <div key={photoIndex} className="relative">
          <img src={photo} alt={`Foto ${photoIndex + 1}`} className="w-full h-20 object-cover rounded" />
          <button 
            onClick={() => removePhoto(index, photoIndex)}
            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

#### 9. **Notas por Item**
```tsx
<textarea
  placeholder="Notas adicionales para este item..."
  value={item.notes}
  onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
  className="w-full h-20 resize-none"
/>
```

### Importante: Lógica Condicional
- TH y STH deben ser mutuamente excluyentes (disabled cuando el otro está activo)
- Al marcar uno, desmarcar el otro automáticamente
- Chase solo aparece para marcas específicas
- Serie, ubicación y fotos son siempre opcionales

### Estilos Recomendados
- Usar la misma estructura de Tailwind que en Inventory.tsx
- Mantener consistencia visual
- Accordion/Collapse para campos opcionales si el formulario es muy largo

### Testing Checklist
- [ ] Crear compra con marca y tipo
- [ ] TH/STH exclusión mutua funciona
- [ ] Chase aparece correctamente según marca/tipo
- [ ] Fotos se comprimen y suben
- [ ] Serie completa se guarda correctamente
- [ ] Editar compra existente carga todos los campos
- [ ] Validación de campos requeridos

## Referencia
Ver `frontend/src/pages/Inventory.tsx` líneas 869-1620 para implementación completa de estos campos.
