# 🚨 Vercel No Auto-Deploya

## Problema
Vercel no está detectando automáticamente los pushes a GitHub.

## Posibles Causas

### 1. **Integración de GitHub No Configurada**
- Ve a: https://vercel.com/dashboard
- Selecciona tu proyecto "hot-wheels-manager"
- Settings → Git
- Verifica que esté conectado a tu repo de GitHub

### 2. **Branch Protegida o Configuración Manual**
- En Vercel → Settings → Git
- Verifica "Production Branch" = `main`
- Asegúrate que "Auto Deploy" esté ENABLED

### 3. **Webhook No Configurado**
- Ve a GitHub: https://github.com/g33ktony/hot-wheels-manager/settings/hooks
- Debería haber un webhook de Vercel
- Si no existe o está en error, reconecta desde Vercel

## Soluciones

### Opción 1: Deploy Manual desde Vercel (Más Rápido)
1. Ve a: https://vercel.com/dashboard
2. Selecciona "hot-wheels-manager"
3. Tab "Deployments"
4. Click botón **"Redeploy"**
5. **IMPORTANTE**: Desmarca "Use existing Build Cache"
6. Click "Redeploy"

### Opción 2: Reconectar GitHub Integration
1. Vercel Dashboard → hot-wheels-manager
2. Settings → Git
3. Click "Disconnect" (si está conectado)
4. Click "Connect Git Repository"
5. Selecciona tu repo
6. Autoriza permisos

### Opción 3: Usar Vercel CLI
```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy directo (desde carpeta raíz del proyecto)
vercel --prod

# Seguir las instrucciones interactivas
```

## Verificación Rápida

### En GitHub
```bash
# Ver webhooks
https://github.com/g33ktony/hot-wheels-manager/settings/hooks

# Debería haber uno de Vercel con:
- Payload URL: https://api.vercel.com/...
- Content type: application/json
- Status: ✓ Recent Delivery
```

### En Vercel
```
Dashboard → Project → Settings → Git Integration

Debería mostrar:
✓ Connected to GitHub
✓ Repository: g33ktony/hot-wheels-manager
✓ Production Branch: main
✓ Auto Deploy: Enabled
```

## Último Recurso: Deploy Manual

Si ninguna solución funciona, puedes hacer deploy manual cada vez:

```bash
cd /Users/antonio/Documents/personal_projects/hot-wheels-manager
vercel --prod
```

O usar el botón "Redeploy" en el dashboard de Vercel.

---

## 🎯 Acción Inmediata Recomendada

**Ve a Vercel Dashboard y haz "Redeploy" manual** (Opción 1)

Esto deployará todos los cambios que están en GitHub, incluyendo:
- ✅ Sistema de cajas completo
- ✅ Fix de react-query
- ✅ Fix de routing SPA

Una vez que funcione manualmente, podemos investigar por qué no auto-deploya.
