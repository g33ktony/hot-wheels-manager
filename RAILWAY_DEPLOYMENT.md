# Railway Deployment Instructions

## Important: Root Directory Setting

**Railway MUST be configured to build from the root directory**, not from the backend folder, because the backend needs access to the `../shared` folder.

## Railway Dashboard Configuration

1. **Root Directory**: Set to `/` (root of repository)
   - In Railway dashboard, go to your service settings
   - Look for "Root Directory" or "Source Directory"
   - Set it to `/` or leave it blank (which defaults to root)

2. **Build Command**: `cd backend && npm ci && npm run build`
   - This is configured in `railway.toml`

3. **Start Command**: `cd backend && npm start`
   - This is configured in `railway.toml`

4. **Environment Variables**: Add these in Railway dashboard:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `PORT` - Usually `3000` (Railway will inject this automatically)
   - `NODE_ENV` - Set to `production`
   - `CORS_ORIGIN` - Your Vercel frontend URL

## Why This Setup?

The project structure is:
```
/
├── backend/          # Backend API
├── frontend/         # React frontend  
└── shared/           # Shared TypeScript types
```

The backend imports from `@shared/types` which maps to `../shared/*`. If Railway builds from the `backend/` directory, it cannot access the `../shared/` folder. By building from root and using `cd backend`, Railway can access all folders.

## Troubleshooting

If you get `Cannot find module '@shared/types'` errors:

1. Check that Railway's "Root Directory" is set to `/` (root)
2. Verify `railway.toml` is in the root directory
3. Check build logs to ensure it's running `cd backend && npm ci && npm run build`
4. Ensure `shared/` folder is committed to git (not in `.gitignore`)

## Testing Locally

To test that the build works as Railway will run it:

```bash
# From repository root:
cd backend && npm ci && npm run build
cd backend && npm start
```
