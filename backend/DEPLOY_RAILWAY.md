# Railway Deployment Guide

## Quick Setup

### 1. Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Connect your GitHub account and select this repository
4. Railway will auto-detect Python (FastAPI)
5. Set the following:
   - **Root Directory**: `backend`
   - **Build Command**: Leave empty (auto-detect)
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables in Railway dashboard:
   - `GEMINI_API_KEY` (your Google Gemini API key)
   - Any other API keys if needed
7. Click **"Deploy"** and wait for deployment
8. Copy your Railway URL (e.g., `https://lfms-backend.up.railway.app`)

### 2. Update Vercel Config

Update `frontend/vercel.json` with your Railway backend URL:
```json
{
  "source": "/api/(.*)",
  "destination": "https://YOUR-RAILWAY-URL.up.railway.app/api/$1"
}
```

### 3. Update Frontend API Config

Edit `frontend/src/api_config.js`:
```javascript
export const API_BASE_URL = "https://YOUR-RAILWAY-URL.up.railway.app";
```

### 4. Deploy Frontend to Vercel

1. Push changes to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Set **Root Directory**: `frontend`
5. Deploy!

---

## Troubleshooting

### CORS Issues
Make sure your FastAPI CORS middleware includes your Vercel domain:
```python
origins = [
    "https://your-frontend.vercel.app",  # Add this
    "http://localhost:5173",
    # ... other origins
]
```

### Database Notes
- Railway ephemeral storage - database may reset on redeploy
- For production, use Railway's PostgreSQL plugin or external DB
- Current setup uses SQLite (local file)

### File Uploads
- Railway has ephemeral filesystem
- Uploads will be lost on restart
- Consider using S3 or Railway's persistent disks for uploads