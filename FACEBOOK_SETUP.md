# Configuración de Facebook para Hot Wheels Manager

Esta guía te ayudará a configurar la integración con Facebook para publicar automáticamente tu inventario.

## 📋 Requisitos

- Una página de Facebook de negocios
- Acceso como administrador de la página
- Cuenta de desarrollador de Facebook (gratis)

## 🚀 Paso 1: Crear una App de Facebook

1. Ve a [Facebook Developers](https://developers.facebook.com/apps/)
2. Haz clic en "Create App" (Crear aplicación)
3. Selecciona "Business" como tipo de app
4. Dale un nombre a tu app (ej: "Hot Wheels Manager")
5. Completa los datos requeridos

## 🔑 Paso 2: Obtener el Page Access Token

### Opción A: Usando Graph API Explorer (Recomendado)

1. En tu app, ve a "Tools" > "Graph API Explorer"
2. En "User or Page", selecciona tu página de Facebook
3. En "Permissions", agrega los siguientes permisos:
   - `pages_manage_posts`
   - `pages_read_engagement`
4. Haz clic en "Generate Access Token"
5. Acepta los permisos cuando se te solicite
6. **IMPORTANTE**: Este token es de corta duración (1-2 horas)

### Generar un Token de Larga Duración

Para que el token no expire, necesitas convertirlo a uno de larga duración:

1. En Graph API Explorer, selecciona tu página
2. Genera el token con los permisos mencionados
3. Copia el token
4. Ve a [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
5. Pega tu token y haz clic en "Debug"
6. Haz clic en "Extend Access Token"
7. Copia el nuevo token (este durará 60 días)

### Opción B: Token que no expire (Recomendado para producción)

1. Genera un User Access Token de larga duración (60 días)
2. Usa este token para obtener un Page Access Token que no expire:

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/me/accounts?access_token=TU_USER_TOKEN_DE_LARGA_DURACION"
```

3. En la respuesta, busca tu página y copia su `access_token`
4. Este token de página no expirará mientras la app siga activa

## 📝 Paso 3: Obtener el Page ID

Hay dos formas de obtener el ID de tu página:

### Método 1: Desde la página

1. Ve a tu página de Facebook
2. Haz clic en "About" (Acerca de)
3. Desplázate hacia abajo y verás "Page ID"
4. Copia el número

### Método 2: Usando Graph API

1. Ve a [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Selecciona tu página
3. En el campo de consulta, escribe: `/me?fields=id,name`
4. Haz clic en "Submit"
5. Verás el ID en la respuesta

## ⚙️ Paso 4: Configurar Variables de Entorno

### Backend (Railway/Vercel)

Agrega estas variables de entorno en tu plataforma de hosting:

```bash
FACEBOOK_PAGE_ID=tu_page_id_aqui
FACEBOOK_ACCESS_TOKEN=tu_access_token_de_larga_duracion_aqui
```

### Backend (Local)

Crea o edita el archivo `/backend/.env`:

```bash
FACEBOOK_PAGE_ID=tu_page_id_aqui
FACEBOOK_ACCESS_TOKEN=tu_access_token_de_larga_duracion_aqui
```

## ✅ Paso 5: Verificar la Configuración

1. Inicia tu backend
2. En el frontend, ve a la página de Inventario
3. Selecciona algunos items con fotos
4. Haz clic en el botón "Publicar en Facebook"
5. Si la configuración es correcta, verás el modal de publicación

## 🔒 Seguridad

- **NUNCA** subas tu `.env` al repositorio
- El Access Token da acceso a tu página, mantenlo seguro
- Los tokens de larga duración duran 60 días, tendrás que renovarlos
- Considera usar tokens que no expiren para producción

## 🐛 Solución de Problemas

### Error: "Token inválido"

- Verifica que el token no haya expirado
- Asegúrate de estar usando un Page Access Token, no un User Access Token
- Regenera el token siguiendo los pasos anteriores

### Error: "No se pueden publicar fotos"

- Verifica que las fotos sean accesibles públicamente
- Asegúrate de que las URLs de las imágenes sean HTTPS
- Verifica que el permiso `pages_manage_posts` esté activo

### Error: "Página no encontrada"

- Verifica que el Page ID sea correcto
- Asegúrate de ser administrador de la página
- Verifica que la página esté publicada (no en modo borrador)

## 📚 Recursos Adicionales

- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Obtener Access Tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/)
- [Publicar en Páginas](https://developers.facebook.com/docs/pages-api/posts)

## 🎉 ¡Listo!

Una vez configurado, podrás:

✅ Seleccionar items de tu inventario
✅ Escribir un mensaje personalizado
✅ Publicar automáticamente con fotos y precios
✅ Compartir la publicación en grupos desde Facebook

---

**Nota**: Esta funcionalidad está diseñada para publicar en TU página de Facebook. Si necesitas que otros usuarios publiquen en sus propias páginas, la configuración sería diferente (requeriría OAuth para cada usuario).
