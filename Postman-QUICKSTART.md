# 🚀 Postman Collection - Quick Start

## Archivos Creados

✅ **Hot-Wheels-Manager.postman_collection.json** (35 KB)
- Contiene TODOS los endpoints de la API
- Incluye test automático de token en el login
- Estructura organizada por carpetas (Auth, Inventory, Sales, etc.)

✅ **Hot-Wheels-Manager-Local.postman_environment.json** (775 B)
- Variables de entorno preconfiguradasVarduables: `baseUrl`, `token`, `userId`, `userRole`, `userStore`

✅ **POSTMAN_SETUP.md** (5.8 KB)
- Documentación completa con screenshots y explicaciones

## ⚡ Quick Start (5 minutos)

### 1️⃣ Importar en Postman

```
Archivo → Import → Selecciona "Hot-Wheels-Manager.postman_collection.json"
```

### 2️⃣ Importar Entorno

```
Settings (engranaje) → Environments → Import → "Hot-Wheels-Manager-Local.postman_environment.json"
```

### 3️⃣ Seleccionar Entorno

```
Top Right: "No Environment" → Click → Select "Hot Wheels Manager - Local"
```

### 4️⃣ Login y Obtener Token

```
Auth → Login → Actualiza email/password → Send
```

**El token se guarda automáticamente en {{token}}** ✅

### 5️⃣ ¡Listo para usar!

Todos los endpoints ya tienen el header:
```
Authorization: Bearer {{token}}
```

## 📚 Endpoints Disponibles

| Carpeta | Endpoints | Auth |
|---------|-----------|------|
| **Auth** | Login, Signup, Verify, Change Password | No (Login sí) |
| **Inventory** | CRUD Items, Search, Analyze | ✅ Sí |
| **Sales** | CRUD Sales, POS Sales | ✅ Sí |
| **Dashboard** | Metrics, Stats | ✅ Sí |
| **Customers** | CRUD Customers | ✅ Sí |
| **Deliveries** | CRUD, Status Changes, Payments | ✅ Sí |
| **Stores** | CRUD, Settings | ✅ Sí |
| **Users** | CRUD Users | ✅ Sí |
| **Hot Wheels** | Search, Series, Years, Import | Parcial |
| **Purchases** | CRUD Purchases | ✅ Sí |

## 🔐 Secreto del Token

**¿Cómo funciona la magia del token automático?**

En el endpoint de **Login**, hay un "Test" que:

1. Recibe la respuesta con el token
2. Lo extrae usando `pm.response.json()`
3. Lo guarda en la variable de entorno: `pm.environment.set('token', ...)`
4. A partir de ahí, `{{token}}` está disponible en todos los requests

**Resultado:**
- ✅ No tienes que copiar/pegar el token
- ✅ Se actualiza automaticamente si ejecutas Login nuevamente
- ✅ También guarda userId, userRole, userStore

## 🧪 Testing

Después de ejecutar cualquier endpoint, Postman muestra:
- Status code (200, 400, 401, 403, 500, etc.)
- Response time
- Size de respuesta
- Body completo en JSON/HTML/XML

## 💾 Guardar Peticiones Personalizadas

Para agregar tus propios endpoints:

1. Click en "+" para crear nuevo request
2. Agrega el método (GET, POST, etc.)
3. URL: `{{baseUrl}}/api/ruta`
4. Headers con: `Authorization: Bearer {{token}}`
5. Body si es necesario (POST/PUT)
6. Guarda en una carpeta

## 🔄 Flujo de Testing Recomendado

```
1. Auth → Login          (Genera token)
2. Dashboard → Metrics   (Prueba que el token funciona)
3. Inventory → Get All   (Lee datos)
4. Inventory → Create    (Escribe datos con POST)
5. Inventory → Update    (Modifica datos con PUT)
6. Inventory → Delete    (Borra datos)
```

## 🛠️ Troubleshooting

### Error 401 - Unauthorized
**Solución:** Ejecuta primero el endpoint de **Login**

### Error 403 - Forbidden
**Solución:** Solo puedes acceder a datos de tu tienda (a menos que seas sys_admin)

### Error 404 - Not Found
**Solución:** Reemplaza IDs placeholder (como "item_id_here") con IDs reales

### La consola de Postman muestra errores
**Solución:** 
1. Abre "Console" (Cmd+Alt+C)
2. Ejecuta el request
3. Verifica qué salió mal en los logs

## 📍 Dónde están los archivos

```
/hot-wheels-manager/
├── Hot-Wheels-Manager.postman_collection.json
├── Hot-Wheels-Manager-Local.postman_environment.json
├── POSTMAN_SETUP.md
└── Postman-QUICKSTART.md (este archivo)
```

## 🎯 Próximos Pasos

1. ✅ Importa los archivos en Postman
2. ✅ Ejecuta Login con tus credenciales
3. ✅ Prueba algunos endpoints de Inventory
4. ✅ Experimenta con POST/PUT/DELETE
5. ✅ Lee la documentación completa en POSTMAN_SETUP.md

---

**¡Ahora tienes todos los endpoints listos para probar!** 🎉

Para preguntas o problemas, revisa POSTMAN_SETUP.md o consulta la documentación del backend.
