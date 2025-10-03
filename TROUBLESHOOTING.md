# 🔍 Troubleshooting - Sistema de Autenticación

## Problema Resuelto: "Bienvenido" pero no navega al Dashboard

### 🐛 **Síntoma**
- El login muestra el toast "¡Bienvenido!"
- El token se guarda correctamente
- Pero no redirige al dashboard
- El usuario se queda en la página de login

### 🔎 **Causa Raíz**
El componente `Login.tsx` estaba guardando el token y usuario directamente en `localStorage`, pero **NO** estaba actualizando el estado del `AuthContext`. 

Esto causaba que:
1. ✅ El token se guardaba en localStorage
2. ❌ El estado de `AuthContext` no se actualizaba (`isAuthenticated = false`)
3. ❌ El `PrivateRoute` verificaba el estado y encontraba `isAuthenticated = false`
4. ❌ Redirigía de vuelta a `/login`

### ✅ **Solución**
Usar el método `login()` del `AuthContext` en lugar de manipular directamente el localStorage:

**Antes (❌ Incorrecto):**
```typescript
// Login.tsx
const handleSubmit = async () => {
  const response = await fetch(`${API_URL}/auth/login`, { ... })
  const data = await response.json()
  
  // ❌ Solo guardaba en localStorage
  localStorage.setItem('token', data.data.token)
  localStorage.setItem('user', JSON.stringify(data.data.user))
  
  navigate('/dashboard') // No funcionaba
}
```

**Después (✅ Correcto):**
```typescript
// Login.tsx
import { useAuth } from '../contexts/AuthContext'

const { login } = useAuth()

const handleSubmit = async () => {
  // ✅ Usa el método del contexto que actualiza todo
  await login(email, password)
  
  navigate('/dashboard') // Ahora funciona
}
```

---

## Otros Problemas Comunes

### 1. **Ruta con doble `/api`**

**Síntoma:**
```
Route /api/api/auth/login not found
```

**Causa:**
`VITE_API_URL` ya incluye `/api` pero el código agrega otro `/api`

**Solución:**
```typescript
// ✅ Correcto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
fetch(`${API_URL}/auth/login`) // → /api/auth/login
```

---

### 2. **Token válido pero no autentica**

**Síntoma:**
- Token existe en localStorage
- Al recargar, vuelve a pedir login

**Causa:**
El `AuthContext` no verifica el token al cargar

**Verificar:**
```typescript
// AuthContext.tsx
useEffect(() => {
  const initAuth = async () => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      // ✅ Debe verificar el token
      const isValid = await verifyTokenAPI(storedToken)
      if (isValid) {
        setToken(storedToken)
        setUser(JSON.parse(localStorage.getItem('user')))
      }
    }
    setIsLoading(false) // ✅ Importante
  }
  initAuth()
}, [])
```

---

### 3. **CORS Error en producción**

**Síntoma:**
```
Access to fetch at 'https://backend.com/api/auth/login' has been blocked by CORS
```

**Solución en Railway:**
```bash
CORS_ORIGIN=https://tu-app.vercel.app
```

---

### 4. **JWT_SECRET no configurado**

**Síntoma:**
```
TypeError: Cannot read property 'verify' of undefined
```

**Solución en Railway:**
```bash
JWT_SECRET=tu_clave_secreta_aqui
```

---

### 5. **Usuario no existe en DB**

**Síntoma:**
```
Invalid email or password
```

**Verificar usuario existe:**
```bash
cd backend
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({
    email: String, name: String, role: String
  }));
  const users = await User.find({});
  console.log('Usuarios:', users);
  process.exit(0);
});
"
```

**Crear usuario:**
```bash
node dist/scripts/createAdmin.js email@ejemplo.com password123 "Nombre"
```

---

## Flujo Correcto de Autenticación

### 1. **Login**
```
Usuario → Login Page → useAuth().login()
  ↓
AuthContext.login()
  ↓
fetch(/api/auth/login)
  ↓
Guardar en localStorage + Actualizar estado
  ↓
isAuthenticated = true
  ↓
navigate('/dashboard')
  ↓
PrivateRoute verifica isAuthenticated ✅
  ↓
Muestra Dashboard
```

### 2. **Recarga de página**
```
App.tsx carga → AuthProvider useEffect()
  ↓
Lee localStorage.getItem('token')
  ↓
Verifica token con /api/auth/verify
  ↓
Si válido: setToken() + setUser()
  ↓
isAuthenticated = true
  ↓
PrivateRoute permite acceso
```

### 3. **Token expirado**
```
Request API → Interceptor axios
  ↓
Server responde 401
  ↓
Interceptor detecta error
  ↓
localStorage.clear()
  ↓
window.location.href = '/login'
```

---

## Checklist de Debugging

Cuando el login no funciona, verificar en orden:

- [ ] 1. **Backend está corriendo**
  ```bash
  curl http://localhost:3001/health
  ```

- [ ] 2. **Variables de entorno configuradas**
  ```bash
  # .env
  MONGODB_URI=mongodb+srv://...
  JWT_SECRET=...
  CORS_ORIGIN=...
  ```

- [ ] 3. **Usuario existe en DB**
  ```bash
  node script para verificar usuarios
  ```

- [ ] 4. **Endpoint de login funciona**
  ```bash
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"pass123"}'
  ```

- [ ] 5. **Frontend usa VITE_API_URL correcto**
  ```javascript
  console.log(import.meta.env.VITE_API_URL)
  ```

- [ ] 6. **Login usa useAuth() hook**
  ```typescript
  const { login } = useAuth()
  await login(email, password)
  ```

- [ ] 7. **AuthContext actualiza estado**
  ```typescript
  console.log('isAuthenticated:', isAuthenticated)
  ```

- [ ] 8. **PrivateRoute verifica estado**
  ```typescript
  if (!isAuthenticated) return <Navigate to="/login" />
  ```

---

## Comandos Útiles

### Ver logs del backend en Railway
```bash
railway logs --service=backend
```

### Ver build logs en Vercel
```bash
vercel logs
```

### Verificar token JWT localmente
```javascript
// En la consola del navegador
localStorage.getItem('token')
```

### Decodificar token JWT
```bash
# En https://jwt.io
# Pegar el token para ver el payload
```

---

## Contactos y Referencias

- **Documentación JWT**: `AUTHENTICATION.md`
- **Configuración URLs**: `URL_CONFIGURATION.md`
- **Repositorio**: https://github.com/g33ktony/hot-wheels-manager
- **Backend**: Railway
- **Frontend**: Vercel
