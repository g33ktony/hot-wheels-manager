# 🔐 Sistema de Autenticación JWT

## Descripción General

Se ha implementado un sistema de autenticación JWT (JSON Web Token) completo para proteger la aplicación Hot Wheels Manager. El sistema incluye:

- ✅ Autenticación basada en JWT (tokens válidos por 30 días)
- ✅ Protección de todas las rutas del backend
- ✅ Página de login en el frontend
- ✅ Context API para manejo de estado de autenticación
- ✅ Interceptores de Axios para agregar tokens automáticamente
- ✅ Redireccionamiento automático al login en caso de token inválido/expirado
- ✅ Botón de logout en el sidebar
- ✅ Hasheo seguro de contraseñas con bcrypt

---

## 📁 Estructura de Archivos Creados

### Backend

```
backend/src/
├── models/
│   └── User.ts                    # Modelo de usuario con email, password, role
├── middleware/
│   └── auth.ts                    # Middleware JWT para proteger rutas
├── controllers/
│   └── authController.ts          # Login, verify token, change password
├── routes/
│   └── auth.routes.ts             # Rutas de autenticación
└── scripts/
    └── createAdmin.ts             # Script para crear usuario admin
```

### Frontend

```
frontend/src/
├── pages/
│   └── Login.tsx                  # Página de inicio de sesión
├── contexts/
│   └── AuthContext.tsx            # Context para estado de autenticación
├── components/
│   └── PrivateRoute.tsx           # HOC para proteger rutas
└── services/
    └── api.ts                     # Actualizado con interceptores JWT
```

---

## 🚀 Configuración Inicial

### 1. Configurar Variable de Entorno (IMPORTANTE)

En **Railway** (backend), agregar la variable de entorno:

```bash
JWT_SECRET=tu_clave_secreta_super_segura_aqui
```

⚠️ **Recomendación**: Generar una clave segura aleatoria de al menos 32 caracteres.

### 2. Crear el Primer Usuario Admin

Después de desplegar el backend, ejecutar el script para crear el primer usuario:

```bash
# Compilar TypeScript
cd backend
npm run build

# Crear usuario admin
node dist/scripts/createAdmin.js admin@hotwheels.com TuContraseñaSegura123 "Tu Nombre"
```

Parámetros:
- **Email**: Email del administrador
- **Password**: Contraseña (mínimo 6 caracteres)
- **Name**: Nombre completo del administrador

---

## 🔑 Endpoints de Autenticación

### POST `/api/auth/login`

Iniciar sesión y obtener token JWT.

**Request:**
```json
{
  "email": "admin@hotwheels.com",
  "password": "TuContraseña123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f...",
      "email": "admin@hotwheels.com",
      "name": "Tu Nombre",
      "role": "admin"
    }
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### GET `/api/auth/verify`

Verificar si el token actual es válido (mantener sesión).

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64f...",
      "email": "admin@hotwheels.com",
      "name": "Tu Nombre",
      "role": "admin"
    }
  }
}
```

### POST `/api/auth/change-password`

Cambiar la contraseña del usuario actual.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request:**
```json
{
  "currentPassword": "ContraseñaActual123",
  "newPassword": "NuevaContraseña456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 🛡️ Rutas Protegidas

Todas las siguientes rutas ahora requieren autenticación:

- `/api/inventory/*`
- `/api/sales/*`
- `/api/purchases/*`
- `/api/deliveries/*`
- `/api/customers/*`
- `/api/suppliers/*`
- `/api/hotwheels/*`
- `/api/market-prices/*`
- `/api/dashboard/*`

Para acceder, incluir el header:
```
Authorization: Bearer <tu_token_jwt>
```

---

## 🎨 Frontend - Flujo de Autenticación

### 1. Inicio de Sesión

El usuario accede a `/login` y proporciona email/password. Al autenticarse exitosamente:

- El token JWT se guarda en `localStorage`
- Los datos del usuario se guardan en `localStorage`
- El `AuthContext` actualiza el estado de autenticación
- El usuario es redirigido a `/dashboard`

### 2. Persistencia de Sesión

Al recargar la página:

1. `AuthContext` verifica si hay un token en `localStorage`
2. Llama a `/api/auth/verify` para validar el token
3. Si es válido, mantiene la sesión activa
4. Si es inválido, limpia el localStorage y redirige a `/login`

### 3. Peticiones API Automáticas

Todas las peticiones a la API incluyen automáticamente el token JWT gracias al interceptor de Axios:

```typescript
// En services/api.ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### 4. Manejo de Errores 401

Si el servidor responde con 401 (Unauthorized):

1. El interceptor detecta el error
2. Limpia el localStorage
3. Redirige automáticamente a `/login`

### 5. Cierre de Sesión

Al hacer clic en "Cerrar sesión":

1. Se limpia el localStorage
2. Se resetea el estado del `AuthContext`
3. El usuario es redirigido a `/login`

---

## 🔄 Uso del AuthContext

### En un componente:

```typescript
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Bienvenido, {user?.name}!</p>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      ) : (
        <p>No autenticado</p>
      )}
    </div>
  )
}
```

---

## 🧪 Testing con Postman/cURL

### 1. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotwheels.com","password":"TuContraseña123"}'
```

### 2. Acceder a ruta protegida

```bash
curl -X GET http://localhost:3001/api/inventory \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📋 Checklist de Implementación

- [x] Modelo de Usuario creado
- [x] Middleware JWT implementado
- [x] Controlador de autenticación con login/verify/change-password
- [x] Rutas de autenticación configuradas
- [x] Todas las rutas del backend protegidas
- [x] Script para crear admin
- [x] Página de login en frontend
- [x] AuthContext implementado
- [x] PrivateRoute para proteger rutas frontend
- [x] Interceptores de Axios configurados
- [x] Botón de logout en el sidebar
- [x] Manejo automático de errores 401

---

## 🚀 Próximos Pasos Recomendados

1. **Desplegar cambios a Railway y Vercel**
2. **Configurar JWT_SECRET en Railway**
3. **Crear usuario admin usando el script**
4. **Probar el flujo completo de login**
5. **Verificar que todas las rutas están protegidas**

---

## ⚠️ Notas de Seguridad

- Los tokens JWT expiran en **30 días**
- Las contraseñas se hashean con **bcrypt (10 rounds)**
- El JWT_SECRET debe ser **único y seguro** en producción
- No compartir el JWT_SECRET públicamente
- Cambiar el JWT_SECRET invalidará todos los tokens existentes

---

## 📝 Variables de Entorno Requeridas

### Backend (Railway)

```bash
JWT_SECRET=tu_clave_secreta_super_segura_aqui
MONGODB_URI=mongodb+srv://...
CORS_ORIGIN=https://tu-app.vercel.app
```

### Frontend (Vercel)

```bash
VITE_API_URL=https://tu-backend.up.railway.app/api
```

---

## 🎉 ¡Listo!

Tu aplicación ahora está protegida con autenticación JWT. Solo los usuarios autenticados podrán acceder a las funcionalidades de la app.
