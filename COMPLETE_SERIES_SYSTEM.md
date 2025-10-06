# ✅ Sistema de Series Completas - Implementación Completa

## 🎯 Nueva Funcionalidad

Se ha implementado un **sistema dual para manejar series**:

### 📦 **Modo 1: Serie Completa**
Cuando compras una caja/set completo y quieres registrar todas las piezas de una vez.

### 🔧 **Modo 2: Pieza Individual** 
Cuando compras una pieza suelta pero quieres especificar que forma parte de una serie.

---

## 🎨 Interfaz del Modal de Compras

### Dos Botones de Agregado

```
┌─────────────────────────────────────┐
│ Items de la Compra                  │
│                                      │
│  [+ Item Individual] [+ Serie Completa] │
└─────────────────────────────────────┘
```

### **+ Item Individual**
- Abre el formulario actual
- Para agregar piezas sueltas
- Puede incluir datos de serie si la pieza pertenece a una

### **+ Serie Completa**  
- Abre modal especial para series
- Registra todas las piezas de la serie de una vez
- Cada pieza con sus propios datos

---

## 📋 Modal de Serie Completa

### Sección 1: Información General de la Serie

**Campos compartidos** (aplican a todas las piezas):

1. **Nombre de la Serie** * (requerido)
   - Ej: "Fast & Furious", "Mainline 2024"
   - Se asigna automáticamente a todas las piezas

2. **Cantidad de Piezas** * (requerido)
   - Selector: 5, 8, o 10 piezas
   - Al cambiar, ajusta automáticamente el número de formularios

3. **Marca** * (requerido)
   - Selector con marcas predefinidas
   - Se aplica a todas las piezas de la serie

4. **Tipo de Pieza** * (requerido)
   - Básico / Premium / RLC
   - Controla opciones TH/STH/Chase

5. **Condición**
   - Mint / Good / Fair / Poor
   - Aplica a toda la serie

6. **Ubicación Física**
   - Con icono de pin
   - Ej: "Caja A", "Estante 3"
   - Se aplica a todas las piezas

7. **Precio por Pieza** * (requerido)
   - Precio unitario de cada pieza
   - **Muestra total automático**: 
     ```
     Total de la serie: $40.00 (5 piezas × $8.00)
     ```

---

### Sección 2: Piezas Individuales

Para cada pieza de la serie (1 de 5, 2 de 5, etc.):

#### **Campos por Pieza:**

1. **ID del Auto** * (requerido)
   - Identificador único de esa pieza específica
   - Ej: "GT-FF-001", "HW-ML24-045"

2. **TH/STH** (Condicional - Solo Hot Wheels Básico)
   - ☑️ Treasure Hunt (TH)
   - ☑️ Super Treasure Hunt ($TH)
   - Mutuamente excluyentes
   - Cada pieza puede tener su propio TH/STH

3. **Chase** (Condicional - Mini GT/Kaido/M2/HW Premium)
   - ☑️ Chase
   - Marca piezas especiales dentro de la serie

4. **Fotos de esta pieza**
   - Subida múltiple con compresión
   - Preview con eliminación individual
   - Cada pieza puede tener sus propias fotos

5. **Notas de esta pieza**
   - Observaciones específicas
   - Ej: "Tiene variante de color", "Chase de la serie"

---

## 🔄 Flujo de Uso - Serie Completa

### Ejemplo Real: Mini GT Fast & Furious (5 piezas)

1. **Click en "+ Serie Completa"**
   
2. **Llenar información general**:
   - Nombre: "Fast & Furious"
   - Cantidad: 5 piezas
   - Marca: Mini GT
   - Tipo: Premium
   - Condición: Mint
   - Ubicación: "Estante Principal"
   - Precio: $8.00 por pieza
   - **Total mostrado: $40.00**

3. **Llenar cada pieza**:

   **Pieza 1 de 5**:
   - ID: GT-FF-001 (Nissan Skyline)
   - Fotos: [3 fotos del Skyline]
   - Notas: "Azul brillante, edición especial"

   **Pieza 2 de 5**:
   - ID: GT-FF-002 (Toyota Supra)
   - Fotos: [2 fotos del Supra]
   - Notas: "Naranja, spolier metálico"

   **Pieza 3 de 5**:
   - ID: GT-FF-003 (Dodge Charger)
   - ☑️ **Chase** (es el Chase de la serie!)
   - Fotos: [4 fotos del Chase]
   - Notas: "CHASE - Negro mate, llantas especiales"

   **Pieza 4 de 5**:
   - ID: GT-FF-004 (Mazda RX-7)
   - Fotos: [2 fotos]
   - Notas: "Amarillo neón"

   **Pieza 5 de 5**:
   - ID: GT-FF-005 (Honda Civic)
   - Fotos: [3 fotos]
   - Notas: "Verde racing, calcomanías originales"

4. **Click en "Agregar 5 Piezas"**

5. **Resultado**: Se agregan 5 items a la compra
   - Cada uno con su propio carId
   - Marca: Mini GT (compartida)
   - Tipo: Premium (compartido)
   - Serie: Fast & Furious, 5/5 (compartida)
   - Posición: 1, 2, 3, 4, 5 (individual)
   - Fotos: Propias de cada pieza
   - Notas: Propias + nota de serie
   - Uno marcado como Chase (pieza 3)

6. **Puedes seguir agregando**:
   - Más series completas
   - Items individuales
   - Todo en la misma compra

---

## 🎯 Flujo de Uso - Item Individual con Serie

### Ejemplo: Pieza suelta de una serie

1. **Click en "+ Item Individual"**

2. **Llenar campos básicos**:
   - ID: HW-TH24-012
   - Cantidad: 1
   - Precio: $1.50
   - Condición: Mint

3. **Especificar marca/tipo**:
   - Marca: Hot Wheels
   - Tipo: Básico
   - ☑️ Super Treasure Hunt ($TH)

4. **Información de Serie** (Opcional):
   - Nombre: "Treasure Hunt 2024"
   - Tamaño: 12 piezas
   - Posición: 7 (esta es la pieza 7 de 12)

5. **Ubicación, fotos, notas**...

6. **Resultado**: 
   - 1 item con toda la info
   - Marcado como parte de "Treasure Hunt 2024"
   - Posición 7/12
   - Cuando lo recibas, aparecerá en inventario con serie completa

---

## ✨ Ventajas del Sistema

### Para Series Completas:
✅ **Capturas todas las piezas de una vez**  
✅ **Datos compartidos** (marca, tipo, ubicación, precio)  
✅ **Datos individuales** (carId, fotos, notas, TH/Chase)  
✅ **Ahorro de tiempo** - No repites info común  
✅ **Organización automática** - Todas vinculadas a la serie  
✅ **Total calculado** en tiempo real

### Para Items Individuales:
✅ **Flexibilidad** - Registra lo que necesites  
✅ **Opcional especificar serie** - Solo si aplica  
✅ **Mezcla en una compra** - Series + individuales juntos

---

## 🔄 Auto-Sincronización con Inventario

Cuando marcas la compra como "recibida":

### Serie Completa → Inventario
```
Serie "Fast & Furious" (5 piezas)
  ↓
Backend recibe 5 items individuales
  ↓
Cada item se procesa individualmente:
  - Verifica si existe (carId + condition + brand)
  - Si existe: suma cantidad, merge fotos
  - Si es nuevo: crea con todos los datos
  ↓
Resultado: 5 piezas en inventario
  - Todas con seriesName: "Fast & Furious"
  - Todas con seriesSize: 5
  - Cada una con su seriesPosition: 1, 2, 3, 4, 5
  - Propias fotos y notas
  - Chase marcado en pieza 3
```

### Item Individual → Inventario
```
Item con serie opcional
  ↓
Si tiene seriesName + seriesPosition:
  - Se registra como parte de la serie
  - Posición 7/12 visible
  ↓
Si no tiene serie:
  - Se registra como pieza suelta
  - Sin información de serie
```

---

## 📊 Visualización en la Lista

Cuando agregas items (antes de guardar):

```
Items de la Compra:

Item 1 - GT-FF-001 (Nissan Skyline)
  Serie: Fast & Furious (1/5)
  $8.00

Item 2 - GT-FF-002 (Toyota Supra)
  Serie: Fast & Furious (2/5)
  $8.00

Item 3 - GT-FF-003 (Dodge Charger) 💎 CHASE
  Serie: Fast & Furious (3/5)
  $8.00

Item 4 - GT-FF-004 (Mazda RX-7)
  Serie: Fast & Furious (4/5)
  $8.00

Item 5 - GT-FF-005 (Honda Civic)
  Serie: Fast & Furious (5/5)
  $8.00

Item 6 - HW-ML-123 (Pieza suelta)
  $1.50

Total: $41.50
```

---

## 🎯 Casos de Uso Reales

### Caso 1: Compras caja completa de tienda
- Usas **"+ Serie Completa"**
- Registras las 5/8/10 piezas
- Cada una con su carId y fotos
- Una sola operación

### Caso 2: Compras pieza suelta en mercado
- Usas **"+ Item Individual"**
- Si sabes la serie, la especificas
- Si no, lo dejas sin serie

### Caso 3: Compras mixtas
- Serie completa de Mini GT (5 piezas)
- 3 Hot Wheels sueltos (TH, STH, regular)
- 2 Kaido House sueltos
- Todo en una compra
- Usas ambos botones según necesites

### Caso 4: Te falta completar una serie
- Ya tienes 4 de 5 en inventario
- Compras la pieza faltante
- Usas **"+ Item Individual"**
- Especificas: Serie "Fast & Furious", Posición 3/5
- Al recibir, el sistema detecta que ya tienes las otras
- Ahora tienes la serie completa

---

## 🛠️ Implementación Técnica

### Nuevos Estados
```typescript
const [showSeriesModal, setShowSeriesModal] = useState(false)
const [seriesData, setSeriesData] = useState({
    seriesName: '',
    seriesSize: 5,
    brand: '',
    pieceType: '',
    condition: 'mint',
    location: '',
    unitPrice: 0,
    pieces: Array<{
        carId: string;
        position: number;
        isTreasureHunt?: boolean;
        isSuperTreasureHunt?: boolean;
        isChase?: boolean;
        photos?: string[];
        notes?: string;
    }>
})
```

### Nuevas Funciones
- `handleAddCompleteSeries()` - Abre modal de serie
- `handleSeriesDataChange()` - Actualiza datos generales
- `handleSeriesPieceChange()` - Actualiza pieza individual
- `handleSeriesPhotoUpload()` - Sube fotos de pieza
- `handleSaveCompleteSeries()` - Guarda todas las piezas

### Ajuste Dinámico
- Al cambiar `seriesSize`, ajusta array de `pieces`
- 5 → 8: Agrega 3 piezas vacías
- 10 → 5: Elimina últimas 5 piezas

### Validación
- Verifica que todas las piezas tengan carId
- Alerta si falta alguno antes de guardar

---

## 📱 Responsive Design

### Desktop
- Grid de 3 columnas para info general
- Grid de 2 columnas para cada pieza
- Modal ancho completo (max-w-6xl)

### Mobile
- Grids se colapsan a 1 columna
- Modal con scroll vertical
- Botones apilados

---

## ✅ Estado Actual

- ✅ **Modal de serie completa** implementado
- ✅ **Dos botones** de agregado
- ✅ **Ajuste dinámico** de piezas (5/8/10)
- ✅ **Campos condicionales** (TH/STH/Chase)
- ✅ **Subida de fotos** con compresión
- ✅ **Validación** antes de guardar
- ✅ **Auto-sync** al recibir compra
- ✅ **Zero errores** TypeScript

---

## 🚀 Para Usar

1. Ve a Compras
2. Click "Agregar Compra"
3. Elige:
   - **"+ Item Individual"** → Pieza suelta
   - **"+ Serie Completa"** → Caja/Set completo
4. Llena la información
5. Agrega más items si necesitas
6. Guarda compra
7. Marca como "recibida"
8. ✅ Todo aparece en inventario automáticamente

---

¡Sistema completo y listo para usar! 🎉
