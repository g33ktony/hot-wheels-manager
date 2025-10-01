# Railway Deployment Instructions

## Important: Workspace Configuration

This project uses **npm workspaces** to manage the monorepo structure. Railway must install dependencies from the root to set up the workspace correctly.

## Railway Dashboard Configuration

1. **Root Directory**: Set to `/` (root of repository)
   - In Railway dashboard, go to your service settings
   - Look for "Root Directory" or "Watch Paths"
   - **Critical**: Set it to `/` or leave blank (defaults to root)
   - DO NOT set it to `backend` or any subdirectory

2. **Build Command**: Already configured in `railway.toml`:
   ```bash
   npm install && cd backend && npm run build
   ```

3. **Start Command**: Already configured in `railway.toml`:
   ```bash
   cd backend && npm start
   ```

4. **Environment Variables**: Add these in Railway dashboard:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `PORT` - Usually `3000` (Railway auto-injects this)
   - `NODE_ENV` - Set to `production`
   - `CORS_ORIGIN` - Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)

## Project Structure

```
/
├── backend/          # Backend API (Express + TypeScript)
├── frontend/         # React frontend (Vite + TypeScript)
├── shared/           # Shared TypeScript types (npm workspace)
├── package.json      # Root package with workspaces config
└── railway.toml      # Railway configuration
```

## Why Workspaces?

The backend imports types from `@shared/types`:
```typescript
import { HotWheelsCar, InventoryItem } from '@shared/types';
```

This maps to `../shared/*` via TypeScript path aliases. Using npm workspaces:
1. Root `npm install` sets up symlinks for all workspaces
2. Backend can resolve `@shared/types` as a local workspace package
3. No need to manually copy files or use complex build scripts

## Troubleshooting

### Error: `Cannot find module '@shared/types'`

**Cause**: Railway is not building from root directory

**Fix**:
1. Check Railway dashboard → Service Settings → "Root Directory"
2. It MUST be `/` or blank (not `backend`)
3. Verify `railway.toml` exists in repository root
4. Check build logs - first command should be `npm install` from root

### Build Logs Check

Your Railway build logs should show:
```bash
> npm install                          # ← Installing workspace from root
> cd backend && npm run build          # ← Then building backend
```

If you see it going straight to `cd backend`, Railway is not using the root directory.

## Testing Locally

To test the exact build Railway will execute:

```bash
# From repository root:
npm install                    # Sets up workspaces
cd backend && npm run build    # Builds backend
cd backend && npm start        # Starts server
```

## Manual Railway Setup Steps

1. Connect your GitHub repository to Railway
2. Create a new service from the repo
3. In service settings:
   - **Root Directory**: `/` (or leave empty)
   - Add environment variables (see above)
4. Deploy!

Railway will automatically detect `railway.toml` and use those build/start commands.

