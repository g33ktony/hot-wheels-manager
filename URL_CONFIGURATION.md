# 🔧 Configuración de URLs en Hot Wheels Manager

## Resumen Rápido

### ✅ Configuración Correcta

```bash
# .env (Frontend - Vercel)
VITE_API_URL=http://localhost:3001/api          # Local
VITE_API_URL=https://tu-backend.railway.app/api # Producción
```

**Importante**: `VITE_API_URL` **SÍ incluye `/api`** al final.

---

## 📁 Estructura de URLs

### Backend (Express)

```
http://localhost:3001/
├── /health                    ✅ Health check (público)
├── /api/
│   ├── /auth/
│   │   ├── /login            ✅ Login (público)
│   │   ├── /verify           🔒 Verificar token
│   │   └── /change-password  🔒 Cambiar contraseña
│   ├── /inventory            🔒 Requiere auth
│   ├── /sales                🔒 Requiere auth
│   ├── /purchases            🔒 Requiere auth
│   ├── /deliveries           🔒 Requiere auth
│   ├── /customers            🔒 Requiere auth
│   ├── /suppliers            🔒 Requiere auth
│   ├── /hotwheels            🔒 Requiere auth
│   ├── /market-prices        🔒 Requiere auth
│   └── /dashboard            🔒 Requiere auth
```

---

## 🎯 Configuración en el Código

### 1. Axios (api.ts)

```typescript
// ✅ CORRECTO
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
})

// Uso:
api.get('/inventory')           → http://localhost:3001/api/inventory
api.post('/sales')              → http://localhost:3001/api/sales
```

### 2. AuthContext (fetch directo)

```typescript
// ✅ CORRECTO
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Uso:
fetch(`${API_URL}/auth/login`)   → http://localhost:3001/api/auth/login
fetch(`${API_URL}/auth/verify`)  → http://localhost:3001/api/auth/verify
```

### 3. Login Page (fetch directo)

```typescript
// ✅ CORRECTO
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Uso:
fetch(`${API_URL}/auth/login`)   → http://localhost:3001/api/auth/login
```

---

## ❌ Errores Comunes

### Error 1: Doble `/api`

```typescript
// ❌ INCORRECTO
const API_URL = 'http://localhost:3001'  // Sin /api
fetch(`${API_URL}/api/auth/login`)       // → /api/auth/login ✅

// Pero si VITE_API_URL ya tiene /api:
// → http://localhost:3001/api/api/auth/login ❌ ERROR!
```

**Solución**: Asegurarse de que `VITE_API_URL` incluya `/api` y no agregarlo en las rutas.

### Error 2: Falta `/api`

```typescript
// ❌ INCORRECTO
const API_URL = 'http://localhost:3001/api'
fetch(`${API_URL}/inventory`)  // → /api/inventory

// Si el servidor espera:
// → /api/api/inventory ❌ ERROR!
```

**Solución**: Si `VITE_API_URL` no incluye `/api`, agregarlo en las rutas.

---

## 🚀 Variables de Entorno

### Local (Development)

```bash
# frontend/.env.local
VITE_API_URL=http://localhost:3001/api

# backend/.env
PORT=3001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=tu_jwt_secret_aqui
CORS_ORIGIN=http://localhost:5173
```

### Producción

```bash
# Vercel (Frontend)
VITE_API_URL=https://hot-wheels-backend.up.railway.app/api

# Railway (Backend)
PORT=3001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=2GCEa9QdtGPxenXGWypOeSzwe+UBc5E/1uPV9Aw0OUKZ3rmJOeQeVg9bDxabWewU
CORS_ORIGIN=https://hot-wheels-manager.vercel.app
```

---

## 🧪 Testing

### Verificar la URL correcta en el navegador

```javascript
// En la consola del navegador (Dev Tools)
console.log(import.meta.env.VITE_API_URL)
// Debería mostrar: "http://localhost:3001/api"
```

### Probar con cURL

```bash
# Health check (sin /api)
curl http://localhost:3001/health

# Login (con /api)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"antonio@hotwheels.com","password":"HotWheels2025!"}'

# Inventory (con /api y token)
curl http://localhost:3001/api/inventory \
  -H "Authorization: Bearer tu_token_jwt_aqui"
```

---

## 📋 Checklist de Verificación

- [ ] `VITE_API_URL` en Vercel incluye `/api`
- [ ] Backend en Railway tiene `CORS_ORIGIN` configurado
- [ ] Backend en Railway tiene `JWT_SECRET` configurado
- [ ] No hay doble `/api` en las rutas
- [ ] Todos los fetch/axios usan la misma configuración de URL
- [ ] El health check funciona sin autenticación
- [ ] El login funciona (ruta pública)
- [ ] Las rutas protegidas requieren token JWT

---

## 🔍 Debug

Si algo no funciona, revisa:

1. **Network Tab** en DevTools → ver la URL completa de la petición
2. **Console** → buscar errores de CORS o 404
3. **Backend logs** en Railway → ver qué ruta está recibiendo
4. **Variables de entorno** → verificar que estén correctas

---

## ✅ Resumen

| Concepto | Valor |
|----------|-------|
| **VITE_API_URL** | `http://localhost:3001/api` ✅ Incluye `/api` |
| **Rutas en código** | `/auth/login`, `/inventory` ❌ No agregar `/api` |
| **URL final** | `http://localhost:3001/api/auth/login` ✅ |

**Regla de oro**: Si `VITE_API_URL` termina en `/api`, NO agregar `/api` en las rutas del código.
