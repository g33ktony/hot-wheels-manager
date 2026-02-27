# Postman Collection Setup - Hot Wheels Manager API

## 📦 Archivos Incluidos

1. **Hot-Wheels-Manager.postman_collection.json** - Colección completa de endpoints
2. **Hot-Wheels-Manager-Local.postman_environment.json** - Variables de entorno para desarrollo local

## 🚀 Instrucciones de Instalación

### Paso 1: Importar la Colección en Postman

1. Abre Postman
2. Click en **"File"** → **"Import"**
3. Selecciona **"Hot-Wheels-Manager.postman_collection.json"**
4. Click en **"Import"**

### Paso 2: Importar el Entorno

1. Click en el icono de **Environment** (engranaje) en la esquina superior derecha
2. Click en **"Import"**
3. Selecciona **"Hot-Wheels-Manager-Local.postman_environment.json"**
4. Click en **"Import"**

### Paso 3: Seleccionar el Entorno

1. En la esquina superior derecha, click en el dropdown donde dice **"No Environment"**
2. Selecciona **"Hot-Wheels-Manager - Local"**

## 🔐 Flujo de Autenticación

### Paso 1: Actualizar credenciales de Login

1. En la carpeta **"Auth"** → **"Login"**
2. En el body (JSON), actualiza:
   ```json
   {
     "email": "tu-email@example.com",
     "password": "tu-contraseña"
   }
   ```

### Paso 2: Ejecutar Login

1. Click en **"Send"**
2. **Automáticamente**, el token se guardará en la variable de entorno `token`
3. También se guardarán:
   - `userId` - ID del usuario
   - `userRole` - Rol del usuario (sys_admin, store_admin, etc.)
   - `userStore` - ID de la tienda del usuario

### Paso 3: Usar Token en Otros Endpoints

Todos los endpoints que necesitan autenticación ya tienen el header:
```
Authorization: Bearer {{token}}
```

El `{{token}}` se reemplazará automáticamente con el token guardado.

## 📝 Estructura de la Colección

### Auth
- **Login** - Obtiene token (ejecutar primero)
- **Sign Up** - Crear nueva cuenta
- **Verify Token** - Verificar que el token es válido
- **Change Password** - Cambiar contraseña

### Inventory (Requiere Auth)
- Get All Items
- Get Item By ID
- Add Item
- Update Item
- Delete Item
- Delete Permanently
- Analyze Image
- Get Series Items

### Sales (Requiere Auth)
- Get All Sales
- Get Sale By ID
- Create Sale
- Update Sale
- Delete Sale
- Create POS Sale

### Dashboard (Requiere Auth)
- Get Metrics
- Get Stats

### Customers (Requiere Auth)
- Get All
- Get By ID
- Create
- Update
- Delete

### Deliveries (Requiere Auth)
- Get All
- Get By ID
- Create
- Update
- Mark as Prepared
- Mark as Completed
- Mark as Pending
- Delete
- Get Stats

### Stores (Requiere Auth)
- Get All
- Create
- Update
- Get Settings
- Update Settings

### Users (Requiere Auth)
- Get All
- Get By ID
- Create
- Update
- Delete

### Hot Wheels Catalog (No requiere Auth)
- Get All Cars
- Get By ID
- Search
- Get Series
- Get Years
- Update Catalog

### Purchases (Requiere Auth)
- Get All
- Create
- Update

## 🔑 Variables de Entorno

Las siguientes variables se crean automáticamente:

| Variable | Descripción | Set By |
|----------|-------------|---------|
| `baseUrl` | URL base de la API (localhost:3001) | Manual |
| `token` | JWT token de autenticación | Login Test |
| `userId` | ID del usuario logueado | Login Test |
| `userRole` | Rol del usuario | Login Test |
| `userStore` | ID de la tienda del usuario | Login Test |

## 🧪 Testing

### Ver resultados de los Tests

Después de ejecutar el **Login**, abre la pestaña **"Tests"** para ver:

```
✅ Status code es 200
✅ Response tiene token
✅ Token guardado: eyJhbGc...
```

## 🔧 Cambiar a Entorno de Producción

1. Importa el mismo archivo de colección
2. Crea un nuevo Environment:
   - Name: "Hot Wheels Manager - Production"
   - baseUrl: `https://your-production-url.com`
3. Actualiza las credenciales de login para producción
4. Selecciona el nuevo environment desde el dropdown

## 💡 Tips y Trucos

### Ver variables guardadas
- Click en el icono de Environment (engranaje)
- Selecciona tu environment
- Haz click en el ojo para ver valores

### Usar variables en Request Body
```json
{
  "customerId": "{{userId}}",
  "storeId": "{{userStore}}"
}
```

### Usar variables en Query Params
```
?storeId={{userStore}}&limit=15
```

### Debug de Headers
- En la pestaña de Headers, verás el Authorization header con el token
- El token está encriptado en las variables "secret"

## ❌ Troubleshooting

### Error: "No environment selected"
- Solución: Click en el dropdown de environments (esquina superior derecha) y selecciona tu environment

### Error: "Authorization failed" (401)
- Solución: Asegúrate de haber ejecutado primero el endpoint de **Login**
- Verifica que el token no esté expirado
- Revisa que el email/password en Login sean correctos

### Error: "Token no se guardó"
- Asegúrate de que la respuesta del Login tiene status code 200
- Abre la pestaña "Test Results" del Login para ver los detalles y logs
- Verifica que el backend esté corriendo: `npm run build && npm start` en `/backend`
- El token debe estar en la respuesta como `response.data.token`
- Si ves "❌ Token no encontrado", revisa que la respuesta tenga la estructura:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGc...",
      "user": {
        "id": "...",
        "email": "...",
        "role": "...",
        "storeId": "..."
      }
    }
  }
  ```

### Error: "Forbidden" (403)
- Solo puedes acceder a datos de tu propia tienda (salvo sys_admin)
- Verifica que el rol del usuario tiene permisos para esa acción

## 📚 Documentación Adicional

Para más detalles de los endpoints, consulta la documentación en:
- Backend: `/backend/src/routes/`
- Frontend: `/frontend/src/hooks/` (para ver ejemplos de cómo se usan)

## 🎯 Flujo de Trabajo Recomendado

1. ✅ Ejecuta **Login** primero
2. ✅ Prueba **Dashboard Metrics** para verificar token
3. ✅ Prueba **Get All Inventory** para ver datos
4. ✅ Prueba **Create Item** con datos válidos
5. ✅ Prueba **Update Item** con el ID de arriba
6. ✅ Prueba **Delete Item** al final

## 🆘 Soporte

Si hay problemas con algún endpoint:
1. Verifica que el backend esté corriendo (`npm run build && npm start`)
2. Verifica que el token sea válido (ejecuta **Verify Token**)
3. Revisa la consola del backend para ver logs de error
4. Consulta el archivo `POSTMAN_SETUP.md` en el repo

---

**Last Updated:** February 26, 2026
**API Version:** v1.0
