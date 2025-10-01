# 🎯 FINAL RAILWAY DEPLOYMENT INSTRUCTIONS

## ⚠️ THE PROBLEM

Your Railway deployment is failing with:
```
Cannot find module '@shared/types'
```

**Root Cause**: Railway is building from the `backend/` directory instead of the repository root.

---

## ✅ THE SOLUTION (3 Steps)

### Step 1: Fix Railway Dashboard Setting

**THIS IS THE MOST IMPORTANT STEP!**

1. Go to: https://railway.app/dashboard
2. Open your project → Click backend service
3. Go to **Settings** tab
4. Find **"Root Directory"** (might be under "Service Settings" or "Deploy")
5. **Change from `backend` to `/`** (just a forward slash)
   - Or **clear it completely** (empty = root)
6. **Save changes**

### Step 2: Verify Environment Variables

In Railway Settings → Variables, ensure you have:

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
```

(Railway auto-adds `PORT`)

### Step 3: Redeploy

- Click **"Deploy"** or **"Redeploy"**
- OR push a new commit to trigger deployment:
  ```bash
  git commit --allow-empty -m "Trigger Railway redeploy"
  git push
  ```

---

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
