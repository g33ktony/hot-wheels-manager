# reCAPTCHA - Temporalmente Deshabilitado para Pruebas

## ✅ Ya Puedes Probar Sin reCAPTCHA

El proceso de reCAPTCHA ha sido **comentado temporalmente** para que puedas probar toda la funcionalidad del catálogo público sin necesidad de configurar las claves de Google reCAPTCHA primero.

---

## 📝 Qué Se Comentó

### Backend
**Archivo:** `/backend/src/controllers/publicController.ts`
- Líneas 219-257: Verificación de reCAPTCHA comentada
- Ahora acepta cualquier token (incluso 'test-token')

### Frontend
**Archivo:** `/frontend/src/components/public/LeadCaptureModal.tsx`
- Líneas 77-83: Obtención del token de reCAPTCHA comentada
- Líneas 245-257: Aviso de reCAPTCHA comentado
- Usa un token dummy 'test-token' para pruebas

**Archivo:** `/frontend/index.html`
- Línea 18: Script de reCAPTCHA comentado

---

## 🧪 Qué Puedes Probar Ahora

✅ Navegar a `/browse`
✅ Buscar en el catálogo
✅ Ver items disponibles con precios
✅ Llenar el formulario de lead (sin reCAPTCHA)
✅ Enviar el formulario exitosamente
✅ Ver detalles de items
✅ Click en "Contactar por Messenger"
✅ "Notificarme cuando esté disponible" para items sin stock

**Nota:** Todo funciona normalmente, solo no hay validación anti-spam por ahora.

---

## 🔄 Cómo Activar reCAPTCHA Después

Cuando tengas las claves de Google reCAPTCHA:

### 1. Backend
**Archivo:** `/backend/src/controllers/publicController.ts`

```typescript
// ANTES (comentado):
// Verify reCAPTCHA
// TODO: Descomentar cuando tengas las claves de reCAPTCHA configuradas
/*
if (!recaptchaToken) {
  res.status(400).json({
    success: false,
    error: 'reCAPTCHA token es requerido'
  })
  return
}
...
*/

// DESPUÉS (descomenta todo el bloque):
// Verify reCAPTCHA
if (!recaptchaToken) {
  res.status(400).json({
    success: false,
    error: 'reCAPTCHA token es requerido'
  })
  return
}

try {
  const recaptchaResponse = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify`,
    null,
    {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken
      }
    }
  )

  if (!recaptchaResponse.data.success || recaptchaResponse.data.score < 0.5) {
    res.status(400).json({
      success: false,
      error: 'Verificación de reCAPTCHA falló'
    })
    return
  }
} catch (recaptchaError) {
  console.error('reCAPTCHA verification error:', recaptchaError)
  res.status(500).json({
    success: false,
    error: 'Error al verificar reCAPTCHA'
  })
  return
}
```

### 2. Frontend - LeadCaptureModal
**Archivo:** `/frontend/src/components/public/LeadCaptureModal.tsx`

```typescript
// ANTES (comentado):
// Get reCAPTCHA token
// TODO: Descomentar cuando tengas las claves de reCAPTCHA configuradas
/*
const token = await window.grecaptcha.execute(
  import.meta.env.VITE_RECAPTCHA_SITE_KEY,
  { action: 'submit_lead' }
)
*/
const token = 'test-token' // Token temporal para pruebas

// DESPUÉS (descomenta y quita el test-token):
// Get reCAPTCHA token
const token = await window.grecaptcha.execute(
  import.meta.env.VITE_RECAPTCHA_SITE_KEY,
  { action: 'submit_lead' }
)
```

También descomentar el aviso de reCAPTCHA (líneas 245-257).

### 3. HTML Script
**Archivo:** `/frontend/index.html`

```html
<!-- ANTES (comentado): -->
<!-- TODO: Descomentar cuando tengas las claves de reCAPTCHA configuradas -->
<!-- <script src="https://www.google.com/recaptcha/api.js?render=explicit" async defer></script> -->

<!-- DESPUÉS (descomenta): -->
<!-- Google reCAPTCHA v3 -->
<script src="https://www.google.com/recaptcha/api.js?render=explicit" async defer></script>
```

### 4. Variables de Entorno

**Backend `.env`:**
```bash
RECAPTCHA_SECRET_KEY=tu_clave_secreta_aqui
```

**Frontend `.env`:**
```bash
VITE_RECAPTCHA_SITE_KEY=tu_clave_de_sitio_aqui
```

---

## 🔍 Cómo Obtener las Claves

1. **Ir a:** https://www.google.com/recaptcha/admin/create
2. **Seleccionar:** reCAPTCHA v3
3. **Agregar dominios:**
   - `localhost` (para desarrollo)
   - Tu dominio de producción (ej: `tuapp.com`)
4. **Copiar claves:**
   - **Clave del sitio** → `VITE_RECAPTCHA_SITE_KEY`
   - **Clave secreta** → `RECAPTCHA_SECRET_KEY`

---

## ⚠️ Importante

- **Para producción:** SIEMPRE activa reCAPTCHA para prevenir spam
- **Para desarrollo:** Puedes dejarlo comentado si estás probando localmente
- **Rate limiting:** Aún funciona aunque reCAPTCHA esté desactivado (5 envíos/hora por IP)

---

## 📋 Checklist de Activación

Cuando vayas a activar reCAPTCHA:

- [ ] Obtener claves de Google reCAPTCHA
- [ ] Agregar claves a `.env` (backend y frontend)
- [ ] Descomentar código en `publicController.ts` (backend)
- [ ] Descomentar código en `LeadCaptureModal.tsx` (frontend)
- [ ] Descomentar script en `index.html`
- [ ] Probar en localhost
- [ ] Verificar que funciona en producción
- [ ] Agregar dominio de producción a Google reCAPTCHA

---

🎉 **¡Ahora puedes probar todo el catálogo sin configurar reCAPTCHA primero!**
