# 🚀 Optimización de Deployments

Esta guía explica cómo configurar builds condicionales para que solo se ejecuten cuando hay cambios relevantes.

## 📋 Configuración

### ✅ Railway (Backend) - Ya Configurado

Railway usa un **script de verificación** antes del build que cancela el deploy si no hay cambios relevantes.

**Cómo funciona:**
1. Antes de `npm install`, ejecuta `backend/ignore-deploy-step.sh`
2. El script verifica si hay cambios en `backend/`, `shared/`, o archivos de configuración
3. Si NO hay cambios → exit 1 (cancela el build)
4. Si hay cambios → exit 0 (continúa con npm install)

**Solo hace deploy cuando cambian:**
- `backend/**`
- `shared/**`
- `package.json`
- `railway.toml`
- `railway.json`
- `start.sh`

✨ **No requiere configuración adicional** - Funciona automáticamente con el buildCommand modificado.

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

### Railway (`backend/ignore-deploy-step.sh`)

```bash
# Compara el commit actual con el anterior
# Si hay cambios en backend/ o shared/ → CONTINUAR (exit 0)
# Si NO hay cambios → CANCELAR BUILD (exit 1)
```

**Exit Codes:**
- `exit 0` = Continuar con deploy ✅
- `exit 1` = Cancelar deploy (falla el build intencionalmente) ⏭️

**Configuración en `railway.toml`:**
```toml
buildCommand = "bash backend/ignore-deploy-step.sh && npm install"
```

El script se ejecuta ANTES de npm install. Si falla (exit 1), el build completo se cancela.

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
