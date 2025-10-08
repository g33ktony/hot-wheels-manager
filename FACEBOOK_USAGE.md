# 📱 Guía de Uso: Publicar en Facebook

## 🎯 Funcionalidad

Esta característica te permite publicar automáticamente items de tu inventario directamente en tu página de Facebook con un solo clic.

## ✨ Características

- ✅ Selección múltiple de items
- ✅ Publicación automática con fotos
- ✅ Mensaje personalizado
- ✅ Precios opcionales
- ✅ Badges automáticos (TH, STH, CHASE)
- ✅ Información de condición y serie
- ✅ Vista previa antes de publicar

## 📋 Antes de Empezar

1. **Configurar Facebook** (una sola vez)
   - Sigue la guía completa en `FACEBOOK_SETUP.md`
   - Obtén tu Page Access Token
   - Obtén tu Page ID
   - Configura las variables de entorno

2. **Variables de Entorno Necesarias**
   ```bash
   FACEBOOK_PAGE_ID=tu_page_id
   FACEBOOK_ACCESS_TOKEN=tu_access_token
   ```

## 🚀 Cómo Usar

### Paso 1: Seleccionar Items

1. Ve a la página de **Inventario**
2. Haz clic en el botón **"Seleccionar"** (esquina superior derecha)
3. Entra en modo de selección
4. Haz clic en los items que quieres publicar
   - Solo items con fotos pueden publicarse
   - Puedes seleccionar múltiples items

### Paso 2: Abrir Modal de Publicación

1. Con los items seleccionados, haz clic en **"Publicar en Facebook"**
2. Se abrirá el modal de publicación

### Paso 3: Configurar Publicación

En el modal verás:

1. **Mensaje de Publicación** (obligatorio)
   - Escribe el texto principal que aparecerá al inicio
   - Ejemplo: "🔥 Nuevos arrivals! Hot Wheels disponibles"
   - Los detalles de cada item se agregan automáticamente

2. **Incluir Precios** (checkbox)
   - ✅ Marcado: Muestra precio de cada item
   - ⬜ Sin marcar: Solo muestra info del item sin precio

3. **Vista Previa**
   - Verás thumbnail de cada item
   - Información de condición
   - Badges (TH, STH, CHASE) si aplica
   - Precio (si está habilitado)

### Paso 4: Publicar

1. Revisa que todo esté correcto
2. Haz clic en **"Publicar en Facebook"**
3. Espera unos segundos mientras se publica
4. Verás un mensaje de éxito o error
5. El modal se cierra automáticamente tras publicación exitosa

## 📝 Formato de Publicación

### Ejemplo de cómo se verá tu publicación:

```
🔥 Nuevos arrivals! Hot Wheels disponibles

1. Volvo 240 Drift Wagon - Hot City (2021) | Mint | $36.11 TH
2. DMC DeLorean - Back to the Future (2020) | Bueno | $72.22
3. Custom '77 Dodge Van - Premium (2024) | Mint | $45.00 $TH

📱 Envíame mensaje para más información
```

### Sin precios:

```
🔥 Nuevos arrivals! Hot Wheels disponibles

1. Volvo 240 Drift Wagon - Hot City (2021) | Mint TH
2. DMC DeLorean - Back to the Future (2020) | Bueno
3. Custom '77 Dodge Van - Premium (2024) | Mint $TH

📱 Envíame mensaje para más información
```

## 🎨 Tips de Uso

### Para Mejores Resultados:

1. **Usa fotos de calidad**
   - Solo items con fotos se pueden publicar
   - La primera foto de cada item se usa en la publicación
   - Asegúrate de que las fotos sean claras

2. **Mensajes Atractivos**
   - Usa emojis: 🔥 🚗 ⭐ ✨ 🎯
   - Menciona si hay ofertas o promociones
   - Sé breve pero descriptivo

3. **Agrupa items similares**
   - Publica items de la misma serie juntos
   - O items de la misma condición
   - O items del mismo precio

4. **Publicaciones frecuentes**
   - Publica regularmente para mantener engagement
   - Varía el contenido y los items
   - Comparte en grupos después de publicar

### Ejemplos de Mensajes:

**Para TH/STH:**
```
🔥 Super Treasure Hunt Alert! 🔥
Tengo estos STH/TH disponibles, envía mensaje!
```

**Para Premium:**
```
✨ Premium Collection ✨
Piezas premium de Hot Wheels, Kaido House y Mini GT
```

**Para Basic:**
```
🚗 Hot Wheels Mainline 2024
Últimos lanzamientos disponibles
```

**Para Chase:**
```
⭐ CHASE EDITION ⭐
Mini GT y Kaido House chase pieces!
```

## 🔄 Después de Publicar

1. **En Facebook:**
   - Ve a tu página de Facebook
   - Verás la publicación recién creada
   - Puedes editarla si es necesario
   - Comparte en grupos desde ahí

2. **En la App:**
   - El modo de selección se desactiva automáticamente
   - Los items se deseleccionan
   - Puedes hacer otra publicación cuando quieras

## ⚠️ Problemas Comunes

### "Ningún item tiene fotos"
**Solución:** Solo puedes publicar items con fotos. Agrega fotos a tus items antes de intentar publicar.

### "Token inválido" o "Error al publicar"
**Solución:** 
1. Verifica que las variables de entorno estén configuradas
2. Revisa que el token no haya expirado
3. Consulta `FACEBOOK_SETUP.md` para regenerar el token

### "No se encontraron items"
**Solución:** Asegúrate de que los items seleccionados existan en la base de datos.

### Las fotos no se publican
**Solución:**
1. Verifica que las URLs de las fotos sean públicas
2. Asegúrate de que sean URLs HTTPS
3. Revisa que las fotos estén accesibles

## 🎯 Flujo Completo de Ejemplo

1. **Recibes nuevos items** → Agregas al inventario con fotos
2. **Quieres publicar** → Vas a Inventario
3. **Click "Seleccionar"** → Entras en modo selección
4. **Seleccionas 5 items** → Con fotos de calidad
5. **Click "Publicar en Facebook"** → Se abre el modal
6. **Escribes:** "🔥 Nuevos Hot Wheels 2024! Disponibles ahora"
7. **Dejas marcado "Incluir precios"**
8. **Revisas la preview** → Todo se ve bien
9. **Click "Publicar en Facebook"** → Esperas 2-3 segundos
10. **✅ Éxito!** → Modal se cierra automáticamente
11. **Vas a Facebook** → Ves tu publicación
12. **Compartes en grupos** → Empiezan a llegar mensajes de clientes

## 🚀 Próximas Mejoras (Futuro)

- [ ] Programar publicaciones para más tarde
- [ ] Plantillas de mensajes guardadas
- [ ] Publicar en múltiples grupos automáticamente
- [ ] Estadísticas de engagement
- [ ] Respuestas automáticas a comentarios
- [ ] Integración con Instagram
- [ ] Exportar catálogo en PDF

## 💡 Ideas de Uso Creativo

1. **"Pieza de la Semana"**
   - Publica un item especial cada semana
   - Crea anticipación

2. **"Flash Sale"**
   - Selecciona items con descuento
   - Publicación urgente con emoji ⚡

3. **"Colección Completa"**
   - Publica series completas juntas
   - Atrae coleccionistas

4. **"Antes de Listar en Mercado Libre"**
   - Da primera oportunidad a tu audiencia
   - Crea exclusividad

---

**¿Preguntas o problemas?** Consulta `FACEBOOK_SETUP.md` o revisa los logs del backend.

¡Felices ventas! 🎉🚗
