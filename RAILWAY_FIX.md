# 🚨 URGENT: RAILWAY ROOT DIRECTORY FIX REQUIRED

## ❌ CURRENT STATUS: Railway is building from WRONG directory

Your build logs show Railway is running `npm run build` from `backend/` directory, but it needs to run from repository root to access the `shared/` folder.

## ✅ CRITICAL FIX: Change Railway Root Directory

### IMMEDIATE ACTION REQUIRED:

1. **Go to Railway Dashboard NOW**
2. **Open your backend service**
3. **Go to Settings tab**
4. **Find "Root Directory" setting**
5. **Change it from `backend` to `/` (forward slash)**
6. **Save and redeploy**

### 📍 Exact Location:
Railway Dashboard → Your Project → Backend Service → Settings → Root Directory

### 🎯 What to Change:
```
❌ WRONG: backend
✅ CORRECT: /
```

---

## 🔍 Why This Matters

Your project structure:
```
/ (repository root)
├── backend/     ← Railway currently building HERE
├── shared/      ← But needs access to HERE
└── package.json ← Workspaces defined HERE
```

When Railway builds from `backend/`, it can't see `../shared/` or run `npm install` from root.

---

## 📋 Complete Checklist

- [ ] **Railway Root Directory** = `/` (NOT `backend`)
- [ ] **Environment Variables** set:
  - `MONGODB_URI`
  - `NODE_ENV=production`
  - `CORS_ORIGIN`
- [ ] **Push latest code** to trigger redeploy
- [ ] **Check build logs** for workspace installation

---

## 🚀 Expected Build Logs (After Fix)

```
🔧 Installing workspace dependencies from root...
npm install
🏗️  Building backend...
cd backend
npm run build
✅ Build complete!
```

---

## 🆘 Still Having Issues?

If you still get `@shared/types` errors after changing Root Directory:

1. **Double-check** Root Directory is `/`
2. **Delete and recreate** the Railway service
3. **Contact Railway support** - mention you're using npm workspaces

---

## 📞 Need Help Finding the Setting?

Screenshots of Railway dashboard locations:
- Service Settings are usually under the service name dropdown
- Root Directory might be called "Source Directory" or "Working Directory"
- If you can't find it, search Railway docs for "root directory"

**This is the ONLY remaining issue - everything else is configured correctly!**

## 🔍 HOW TO VERIFY IT'S FIXED

### Check Build Logs

After deploying, check Railway build logs. You should see:

```bash
✅ CORRECT ORDER:
1. npm install              # ← Installing workspaces from ROOT
2. cd backend && npm run build
3. TypeScript compiles successfully
```

If you see this, it's WRONG:

```bash
❌ WRONG (still building from backend only):
1. npm run build            # ← Missing "npm install" from root!
2. Cannot find module '@shared/types'
```

---

## 📁 Project Structure (Why Root Matters)

```
hot-wheels-manager/          ← Railway must build from HERE (root)
│
├── package.json             ← Has "workspaces": ["backend", "frontend", "shared"]
├── node_modules/
│   └── @shared/types/       ← Symlink created by "npm install" from root
│       └── → ../shared      
│
├── shared/                  ← Shared TypeScript types
│   ├── package.json         ← Makes this a workspace package
│   └── types.ts
│
└── backend/                 ← Backend code imports from @shared/types
    ├── package.json
    ├── tsconfig.json        ← Has path: "@shared/*": ["../shared/*"]
    └── src/
        └── *.ts             ← import { ... } from '@shared/types';
```

**When Railway builds from `backend/` only:**
- ❌ Can't access `../shared/`
- ❌ No workspace symlinks
- ❌ TypeScript can't find `@shared/types`

**When Railway builds from `/` (root):**
- ✅ `npm install` creates workspace symlinks
- ✅ Backend can access parent `node_modules/@shared/types`
- ✅ TypeScript finds the module
- ✅ Build succeeds!

---

## 🛠️ Configuration Files (Already in Repo)

These files are already set up to tell Railway how to build from root:

1. **`nixpacks.toml`** - Railway/Nixpacks configuration
2. **`railway.toml`** - Alternative Railway config
3. **`build.sh`** - Custom build script
4. **`Procfile`** - Start command
5. **Root `package.json`** - Workspaces definition

**But these files are IGNORED if Root Directory is set to `backend`!**

---

## 🧪 Test Locally (What Railway Should Do)

```bash
# Go to repository ROOT
cd /Users/antonio/Documents/personal_projects/hot-wheels-manager

# Run the build script (what Railway will run)
./build.sh

# Should output:
# 🔧 Installing workspace dependencies from root...
# 🏗️  Building backend...
# ✅ Build complete!
```

If this works locally but fails on Railway → **Root Directory is wrong!**

---

## 🚨 If Still Failing After Changing Root Directory

### Option A: Clear Railway Cache

1. Go to Railway service → Settings
2. Find "Restart" or "Clear Build Cache"
3. Click it
4. Redeploy

### Option B: Delete and Recreate Service

Railway sometimes caches old configurations. If changing Root Directory doesn't work:

1. **Note your environment variables** (copy them somewhere)
2. Delete the backend service in Railway
3. Create a **New Service**:
   - Deploy from GitHub repo
   - Select `hot-wheels-manager`
   - **BEFORE first deploy**: Set Root Directory to `/`
4. Add environment variables back
5. Deploy

---

## 📊 Success Checklist

- [ ] Railway Root Directory set to `/` (confirmed in Settings)
- [ ] Saved and redeployed
- [ ] Build logs show `npm install` as first command
- [ ] Build logs show `cd backend && npm run build` second
- [ ] No "Cannot find module '@shared/types'" errors
- [ ] Deployment succeeds
- [ ] Backend API responds (test with curl or browser)

---

## 💡 Why This Setup?

**npm workspaces** is the standard way to structure monorepos with shared code. It:

- Creates symlinks automatically (`npm install` does this)
- Works with TypeScript path mappings
- No manual file copying needed
- Clean, maintainable structure

The only requirement is that **`npm install` runs from the repository root** to set up the workspaces.

---

## 🆘 Still Need Help?

1. **Screenshot** your Railway Settings showing Root Directory
2. **Copy** your Railway build logs (first 20 lines)
3. **Share** in Railway Discord or GitHub issue

The logs will show whether Railway is building from root or not.

---

## 🎉 Once Working

Your Railway deployment will:
1. Pull code from GitHub
2. Run `npm install` (sets up workspaces)
3. Run `cd backend && npm run build`
4. Start with `cd backend && npm start`
5. Backend API live at `https://your-service.railway.app`

**Just make sure Root Directory = `/` !** 🚀
