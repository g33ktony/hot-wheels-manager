# ⚠️ RAILWAY SETUP REQUIRED - READ THIS FIRST! ⚠️

## 🚨 CRITICAL STEP: Railway Dashboard Configuration

**YOUR DEPLOYMENT IS FAILING BECAUSE RAILWAY IS NOT BUILDING FROM THE ROOT DIRECTORY!**

### Fix This in Railway Dashboard:

1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select your `hot-wheels-manager` project
3. Click on your backend service
4. Go to **Settings** tab
5. Scroll to **Service Source** or **Deploy** section
6. Find **"Root Directory"** setting
7. **CHANGE IT FROM `backend` TO `/`** (or leave it EMPTY)
8. Click **Save** or **Update**
9. **Redeploy** the service

---

## Why This Matters

Railway is currently building from the `backend/` directory, which looks like this:

```
backend/
├── src/
│   └── (tries to import from '@shared/types')
└── node_modules/  ❌ NO @shared/types here!
```

But `@shared/types` is in the PARENT directory:

```
/ (root)
├── backend/
├── shared/  ← The @shared/types is HERE!
└── node_modules/
    └── @shared/types → symlink to ../shared ✅
```

When Railway builds from `/` (root), it runs `npm install` which creates the workspace symlink, allowing backend to find `@shared/types`.

---

## How to Check Your Current Setting

Look at your Railway build logs. If you see:

```bash
❌ WRONG (building from backend):
npm run build
> tsc
Cannot find module '@shared/types'
```

You need to change Root Directory to `/`.

When configured correctly, you'll see:

```bash
✅ CORRECT (building from root):
npm install        ← Sets up workspaces
cd backend && npm run build
> tsc              ← No errors!
```

---

## Alternative: Delete and Recreate Service

If changing the Root Directory doesn't work (Railway sometimes caches):

1. **Delete** the current backend service in Railway
2. **Create New Service** → "Deploy from GitHub"
3. Select `hot-wheels-manager` repository
4. **BEFORE first deploy**, set Root Directory to `/`
5. Add environment variables
6. Deploy

---

## Files in This Repo to Help Railway

- ✅ `nixpacks.toml` - Tells Railway how to build (from root)
- ✅ `railway.toml` - Alternative Railway config
- ✅ `build.sh` - Custom build script
- ✅ `Procfile` - Start command
- ✅ Root `package.json` with workspaces

**But none of these work if Root Directory is set to `backend`!**

---

## Quick Test

Run this locally to simulate what Railway SHOULD do:

```bash
cd /path/to/hot-wheels-manager  # Go to ROOT
npm install                      # Sets up workspaces ✅
cd backend && npm run build      # Builds successfully ✅
```

If Railway doesn't run `npm install` from root first, it will fail.

---

## Environment Variables Needed

Once Root Directory is fixed, ensure these are set in Railway:

- `MONGODB_URI` - Your MongoDB Atlas connection string
- `NODE_ENV` - `production`
- `CORS_ORIGIN` - Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
- `PORT` - Auto-injected by Railway

---

## Still Having Issues?

### Check Railway Build Logs

1. Go to your Railway service
2. Click **Deployments** tab
3. Click the latest deployment
4. Check the **Build Logs**
5. Look for the FIRST command executed

**If it says `cd backend` or goes straight to `npm run build`, your Root Directory is WRONG.**

### Discord/Support

If you've confirmed Root Directory is `/` and it still fails:
1. Take a screenshot of Railway Settings → Root Directory
2. Share your build logs
3. Ask on Railway Discord or support

---

## 📋 Checklist

- [ ] Root Directory in Railway set to `/` (not `backend`)
- [ ] Environment variables added in Railway dashboard
- [ ] Redeployed after changing Root Directory
- [ ] Build logs show `npm install` from root first
- [ ] No "Cannot find module '@shared/types'" errors

---

**Once Root Directory is set correctly, everything will work! 🎉**
