# 🚀 Optimización de Deployments

Esta guía explica cómo configurar builds condicionales para que solo se ejecuten cuando hay cambios relevantes.

## 📋 Configuración

### ✅ Railway (Backend) - Ya Configurado

Railway usa **watchPatterns** en `railway.toml` para detectar cambios automáticamente.

**Cómo funciona:**
```toml
[build]
watchPatterns = ["backend/**", "shared/**", "railway.toml", "package.json", "start.sh"]
```

Railway compara los archivos cambiados en el commit con los patrones definidos. Si ningún archivo coincide, **no hace deploy**.

**Solo hace deploy cuando cambian:**
- `backend/**`
- `shared/**`
- `package.json`
- `railway.toml`
- `start.sh`

✨ **Funciona automáticamente** - No requiere configuración adicional.

### ✅ Railway - Configuración Requerida

Railway requiere que especifiques el path al archivo de configuración en el Dashboard.

#### Paso 1: Ve a tu servicio en Railway
1. https://railway.app/dashboard
2. Selecciona tu servicio backend

#### Paso 2: Configura el Railway Config File
1. Ve a **Settings → Deploy → Config-as-code**
2. En **"Railway Config File"**, ingresa:
   ```
   railway.toml
   ```
3. Click **Save**

Esto le indica a Railway que use el archivo `railway.toml` con los `watchPatterns` configurados.

---

### 🔧 Vercel (Frontend) - Requiere Configuración Manual

#### Paso 1: Accede a tu proyecto en Vercel
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto "hot-wheels-manager"

#### Paso 2: Configura Ignored Build Step
1. Ve a **Settings** → **Git**
2. En la sección **Ignored Build Step**, selecciona **Custom**
3. Pega este comando:
   ```bash
   bash frontend/ignore-build-step.sh
   ```
4. Click en **Save**

![Vercel Ignored Build Step](https://vercel.com/_next/image?url=%2Fdocs-proxy%2Fstatic%2Fdocs%2Fconcepts%2Fgit%2Fignored-build-step.png&w=3840&q=75)

---

## 🎯 Cómo Funciona

### Script de Vercel (`frontend/ignore-build-step.sh`)

```bash
# Compara el commit actual con el anterior
# Si hay cambios en frontend/ o shared/ → BUILD (exit 1)
# Si NO hay cambios → SKIP BUILD (exit 0)
```

**Exit Codes:**
- `exit 1` = Hacer build ✅
- `exit 0` = Saltar build ⏭️

### Railway (`railway.toml` con watchPatterns)

```toml
[build]
watchPatterns = ["backend/**", "shared/**", "railway.toml", "package.json", "start.sh"]
```

Railway verifica si los archivos cambiados en el commit coinciden con algún patrón. Si no hay coincidencias, **no hace deploy**.

**Importante**: Debes configurar el path del archivo en Railway Dashboard (Settings → Deploy → Config-as-code → `railway.toml`)

---

## 🧪 Prueba

### Test 1: Cambio solo en Frontend
```bash
# Edita algo en frontend/
echo "test" >> frontend/src/App.tsx
git add . && git commit -m "test: frontend only" && git push
```

**Resultado esperado:**
- ✅ Vercel hace build
- ⏭️ Railway NO hace deploy

### Test 2: Cambio solo en Backend
```bash
# Edita algo en backend/
echo "test" >> backend/src/index.ts
git add . && git commit -m "test: backend only" && git push
```

**Resultado esperado:**
- ⏭️ Vercel NO hace build
- ✅ Railway hace deploy

### Test 3: Cambio en Shared
```bash
# Edita shared/types.ts
echo "test" >> shared/types.ts
git add . && git commit -m "test: shared types" && git push
```

**Resultado esperado:**
- ✅ Vercel hace build (shared afecta frontend)
- ✅ Railway hace deploy (shared afecta backend)

---

## 💡 Beneficios

1. **⚡ Deploys más rápidos** - Solo builds necesarios
2. **💰 Ahorro de recursos** - Menos builds = menos consumo
3. **🎯 Logs más claros** - Solo logs relevantes
4. **🔒 Menos errores** - No se rompe frontend por cambios en backend

---

## 🔍 Debugging

Si un build no se ejecuta cuando debería:

### Vercel
```bash
# En tu terminal local, prueba el script:
cd frontend
bash ignore-build-step.sh
echo $?  # 1 = build, 0 = skip
```

### Railway
- Ve a Railway Dashboard → Deployments
- Si no se triggereó, verifica que el archivo cambiado esté en `watchPaths`

---

## 📚 Referencias

- [Vercel Ignored Build Step](https://vercel.com/docs/projects/overview#ignored-build-step)
- [Railway Watch Paths](https://docs.railway.app/deploy/deployments#watch-paths)

---

## ✅ Checklist de Configuración

- [x] Script `frontend/ignore-build-step.sh` creado
- [x] Script `backend/ignore-deploy-step.sh` creado (referencia)
- [x] `railway.toml` con `watchPaths` configurado
- [ ] **TODO**: Configurar Ignored Build Step en Vercel Dashboard
- [ ] **TODO**: Probar con commits de prueba

---

## 🎉 Una vez configurado

Simplemente haz push de tus cambios como siempre:

```bash
git add .
git commit -m "feat: nueva funcionalidad en frontend"
git push
```

El sistema automáticamente decidirá qué servicios necesitan rebuild. 🚀
