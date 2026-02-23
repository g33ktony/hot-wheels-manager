# 🔐 Sistema de Cambio de Contraseña

## Descripción
Los usuarios pueden cambiar su contraseña de forma segura desde la aplicación.

## Acceso
1. En la barra lateral izquierda, busca el botón **"Cambiar contraseña"** (con ícono de candado 🔒)
2. O navega directamente a: `/change-password`

## Características de Seguridad
- ✅ **Verificación de contraseña actual**: Debes ingresar tu contraseña actual para cambiarla
- ✅ **Validación de contraseña**: Mínimo 6 caracteres
- ✅ **Confirmación doble**: Debes confirmar la nueva contraseña
- ✅ **Token JWT**: Solo usuarios autenticados pueden acceder
- ✅ **Contra-reutilización**: No se permite usar la contraseña anterior

## Proceso
1. **Haz clic** en "Cambiar contraseña" en el menú lateral
2. **Ingresa** tu contraseña actual para verificación
3. **Ingresa** tu nueva contraseña (mín. 6 caracteres)
4. **Confirma** la nueva contraseña
5. **Haz clic** en "Actualizar Contraseña"

## Validaciones
- Campo vacío → Error
- Contraseña < 6 caracteres → Error
- Contraseñas no coinciden → Error  
- Contraseña actual incorrecta → Error 401
- Nueva contraseña = actual → Error

## Respuestas del Sistema
- ✅ **Éxito**: "Contraseña actualizada exitosamente" → Redirige a dashboard
- ❌ **Error**: Mensaje claro del problema
- ⚠️ **Advertencia**: Si uses letras/números/símbolos débiles

## Comportamiento Visual
- **Mostrar/Ocultar contraseña**: Click en el ícono de ojo (👁️)
- **Tema oscuro/claro**: Se adapta automáticamente
- **Responsivo**: Funciona en mobile, tablet y desktop

## Endpoint Backend
```
PATCH /api/auth/change-password
Headers: Authorization: Bearer {token}
Body: {
  "currentPassword": "string",
  "newPassword": "string"
}
```

## Rutas Relacionadas
- `/login` - Inicio de sesión
- `/signup` - Registro de nuevo usuario
- `/dashboard` - Panel principal

## Cambios Realizados
1. ✅ Backend: Endpoint `/api/auth/change-password` (PATCH)
2. ✅ Frontend: Página `ChangePassword.tsx` con validaciones completas
3. ✅ Layout: Botón "Cambiar contraseña" en sidebar
4. ✅ Rutas: Agregado en App.tsx
5. ✅ Seguridad: Validación de token JWT y contraseña actual
