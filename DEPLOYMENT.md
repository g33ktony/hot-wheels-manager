# Hot Wheels Manager - Deployment Guide

## 🚀 Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### 1. Backend Deployment (Railway)
1. Go to [Railway.app](https://railway.app) and create an account
2. Click "New Project" → "Deploy from GitHub"
3. Connect your GitHub repository
4. Railway will auto-detect it's a Node.js app
5. Add environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=3001
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secure_jwt_secret
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```

#### 2. Frontend Deployment (Vercel)
1. Go to [Vercel.com](https://vercel.com) and create an account
2. Click "New Project" → "Import Git Repository"
3. Connect your GitHub repository
4. Configure build settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables:
   ```
   VITE_API_URL=https://your-backend-railway-url.up.railway.app/api
   ```

### Option 2: Vercel (Frontend) + Render (Backend

#### Backend on Render:
1. Go to [Render.com](https://render.com) → "New" → "Web Service"
2. Connect GitHub repo
3. Configure:
   - **Runtime**: Node
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
4. Add environment variables (same as Railway)

#### Frontend on Vercel (same as above)

### Option 3: DigitalOcean App Platform

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Create new app from GitHub
3. Configure two components:
   - **Frontend**: Root directory `frontend`, build command `npm run build`
   - **Backend**: Root directory `backend`, build command `npm run build`
4. Add environment variables for both

## 🔧 Environment Variables Setup

### Backend (.env.production)
```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hot-wheels-manager
JWT_SECRET=your_super_secure_random_string_here
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (.env.production)
```bash
VITE_API_URL=https://your-backend-domain.com/api
VITE_APP_TITLE=Hot Wheels Manager
VITE_APP_VERSION=1.0.0
```

## 📝 Pre-deployment Checklist

- [ ] MongoDB Atlas database created and connection string ready
- [ ] Environment variables configured
- [ ] CORS settings updated for production domain
- [ ] HTTPS enabled (automatic on Vercel/Railway)
- [ ] Domain configured (optional)
- [ ] SSL certificate (automatic on most platforms)

## 🌐 Accessing Your App

After deployment, your app will be available at:
- **Frontend**: `https://your-project-name.vercel.app`
- **Backend API**: `https://your-backend-service.railway.app`

## 🔄 Updating Your App

Push changes to your GitHub repository's main branch - the platforms will auto-deploy!

## 🆘 Troubleshooting

### CORS Issues
Update `FRONTEND_URL` in backend environment variables to match your frontend domain.

### Database Connection
Ensure MongoDB Atlas IP whitelist includes `0.0.0.0/0` for Railway/Render, or specific IP for other providers.

### Build Failures
Check build logs and ensure all dependencies are in `package.json`.
