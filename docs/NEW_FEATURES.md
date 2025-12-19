# 🚀 Nuevas Funcionalidades - Hot Wheels Manager

## 📦 Contenido

1. **Sistema POS (Punto de Venta)**
2. **Identificación con IA (Gemini Vision)**

---

## 🛒 Sistema POS (Punto de Venta)

### ¿Qué hace?
Permite crear ventas rápidas en el momento (en persona, en tu puesto) sin necesidad de crear entregas.

### Características:
- ✅ Selección rápida de piezas del inventario disponible
- ✅ Búsqueda de productos en tiempo real
- ✅ Carrito de compras visual
- ✅ **Modificación de precios** por pieza (importante para descuentos en sitio)
- ✅ Cálculo automático del total
- ✅ Selección de método de pago
- ✅ **Actualización automática del inventario** (marca como vendido)
- ✅ Creación instantánea de la venta

### Cómo usar:
1. Ve a **🛒 POS** en el menú
2. Busca y selecciona las piezas a vender
3. Modifica los precios si es necesario (aparecen en el carrito)
4. Selecciona el método de pago
5. Haz clic en **"Completar Venta"**
6. ¡Listo! Las piezas se marcan automáticamente como vendidas

### Cambios en el modelo:
- Nuevo campo `saleType`: `'delivery'` (por entrega) o `'pos'` (venta en sitio)
- Nuevo campo `originalPrice` en items para tracking del precio original
- Las ventas POS se crean con status `'completed'` automáticamente

---

## 🤖 Identificación con IA (Gemini Vision)

### ¿Qué hace?
Analiza fotos de Hot Wheels usando inteligencia artificial para identificar automáticamente el modelo y auto-completar el formulario de registro.

### Características:
- ✅ Análisis de imágenes con Google Gemini Flash (GRATIS hasta 1,500/día)
- ✅ Extrae información de:
  - Marca (Hot Wheels, Matchbox, etc.)
  - Modelo/nombre del vehículo
  - Año de producción
  - Color principal
  - Serie/colección
  - Casting ID (si es visible en la base)
  - Tipo de vehículo
- ✅ **Búsqueda inteligente** en `hotwheels_database.json`
- ✅ Sistema de coincidencias con porcentaje de confianza
- ✅ Auto-completado de formulario con un clic

### Cómo usar:
1. En el formulario de **Agregar Inventario**
2. Haz clic en **"Identificar con IA"**
3. Sube una foto del Hot Wheels
   - **Recomendado**: Foto de la base (contiene casting ID)
   - También funciona: Empaque completo, foto del auto
4. Espera el análisis (5-10 segundos)
5. Revisa las coincidencias encontradas
6. Haz clic en **"Usar este"** para auto-completar el formulario
7. Verifica y ajusta si es necesario
8. Guarda el item

### Tips para mejores resultados:
📸 **Fotos claras y bien iluminadas**
📸 **Enfoque en la base del auto** (tiene el casting ID)
📸 **Si está en caja, foto del empaque completo**
📸 **Evita fotos borrosas o con mucho reflejo**

---

## 🔧 Configuración Técnica

### Backend

#### Variables de Entorno Necesarias:

```env
# Obligatoria para identificación con IA
GEMINI_API_KEY=tu_api_key_aquí

# MongoDB (ya configurada)
MONGODB_URI=mongodb+srv://...
```

#### Obtener GEMINI_API_KEY (GRATIS):

1. Ve a https://ai.google.dev/
2. Haz clic en "Get API Key"
3. Crea un proyecto en Google AI Studio
4. Genera una API Key
5. Agrégala a tu `.env` y a las variables de Railway

**Límites gratuitos:**
- 1,500 requests por día
- 15 requests por minuto
- Suficiente para uso normal

### Nuevos Endpoints

#### POST `/api/sales/pos`
Crea una venta POS (punto de venta).

**Body:**
```json
{
  "items": [
    {
      "inventoryItemId": "...",
      "customPrice": 150.00
    }
  ],
  "paymentMethod": "cash",
  "notes": "Venta en sitio"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "saleType": "pos",
    "status": "completed",
    "totalAmount": 150.00,
    ...
  },
  "message": "Venta completada exitosamente"
}
```

#### POST `/api/inventory/analyze-image`
Analiza una imagen de Hot Wheels.

**Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "brand": "Hot Wheels",
      "model": "Nissan Skyline GT-R",
      "year": 2024,
      "color": "Azul",
      "series": "Fast & Furious",
      "castingId": "HW-12345",
      "confidence": 0.85
    },
    "matches": [
      {
        "car_name": "Nissan Skyline GT-R (R34)",
        "casting_id": "HW-12345",
        "year": 2024,
        "matchConfidence": 0.92,
        ...
      }
    ],
    "totalMatches": 5
  }
}
```

---

## 🎯 Flujo de Trabajo Recomendado

### Para Ventas en Puesto:
1. Configura tu inventario con precios de venta
2. En el puesto, usa **POS** para ventas rápidas
3. Ajusta precios según negociación
4. Completa venta → Inventario se actualiza automáticamente

### Para Agregar Inventario:
1. Toma foto clara de la pieza (especialmente la base)
2. Usa **Identificar con IA**
3. Selecciona la coincidencia correcta
4. Ajusta precio de compra y venta
5. Guarda

---

## 📊 Mejoras Futuras Sugeridas

### POS:
- [ ] Imprimir ticket de venta
- [ ] Descuentos por cantidad
- [ ] Historial de ventas del día
- [ ] Registro de cliente (opcional)

### IA:
- [ ] Integrar directamente en el formulario de inventario
- [ ] Análisis de múltiples imágenes
- [ ] Detección de treasure hunts y ediciones especiales
- [ ] Base de datos local de imágenes para matching visual

---

## 🐛 Troubleshooting

### POS no muestra inventario
- Verifica que haya items con `status: 'available'`
- Revisa la conexión a la base de datos

### IA no funciona
- Verifica que `GEMINI_API_KEY` esté configurada
- Revisa los logs del servidor para errores
- Asegúrate de no haber excedido el límite gratuito (1,500/día)

### Precios no se actualizan en POS
- El precio modificado en POS solo afecta esa venta
- El precio original del inventario se mantiene
- Se guarda el `originalPrice` para tracking

---

## 📝 Notas Importantes

1. **Las ventas POS son permanentes** - marcan el item como vendido inmediatamente
2. **Gemini requiere internet** - no funciona offline
3. **La búsqueda en DB es por similaridad** - puede no ser 100% exacta
4. **Los precios en POS son por transacción** - no modifican el inventario permanentemente

---

¿Preguntas? Revisa los logs del servidor o contacta al equipo de desarrollo.

**Versión:** 1.1.0  
**Fecha:** Diciembre 2024
