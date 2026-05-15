# Deployment Guide

This guide explains how to deploy the full-stack application to Vercel or Netlify.

## Environment Variables

You need to set these environment variables in your deployment platform:

### Backend Variables
- `MONGO_URL`: Your MongoDB connection string
- `DB_NAME`: Your MongoDB database name
- `CORS_ORIGINS`: Comma-separated list of allowed origins (e.g., `http://localhost:3000,https://yourdomain.com`)

### Frontend Variables
- Any additional frontend environment variables from `frontend/.env.local`

## Option 1: Deploy to Vercel

### Prerequisites
- Vercel account (sign up at [vercel.com](https://vercel.com))
- GitHub account (recommended)
- MongoDB database

### Steps

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Import project in Vercel**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure environment variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add the required variables listed above

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

5. **Update API URL in frontend**
   - After deployment, update your frontend to use the production API URL
   - The API will be available at `https://your-domain.vercel.app/api`

## Option 2: Deploy to Netlify

### Prerequisites
- Netlify account (sign up at [netlify.com](https://netlify.com))
- GitHub account (recommended)
- MongoDB database

### Steps

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Import site in Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repository

3. **Configure build settings**
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`

4. **Configure environment variables**
   - In Netlify site settings, go to "Environment variables"
   - Add the required variables listed above

5. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy your application

6. **Update API URL in frontend**
   - After deployment, update your frontend to use the production API URL
   - The API will be available at `https://your-domain.netlify.app/.netlify/functions/api`

## Alternative: Deploy Backend Separately

If you prefer to deploy the backend separately, consider using:
- **Render**: [render.com](https://render.com) - Good for Python/FastAPI
- **Railway**: [railway.app](https://railway.app) - Supports multiple services
- **Fly.io**: [fly.io](https://fly.io) - Global deployment

Then deploy only the frontend to Vercel/Netlify and update the API URL accordingly.

## Troubleshooting

### Vercel
- If Python functions fail, ensure `mangum` is in `requirements.txt`
- Check Vercel function logs for errors
- Verify environment variables are set correctly

### Netlify
- Ensure Python runtime is configured in `netlify.toml`
- Check Netlify function logs for errors
- Verify environment variables are set correctly

### Common Issues
- **CORS errors**: Ensure your frontend domain is in `CORS_ORIGINS`
- **MongoDB connection**: Verify `MONGO_URL` is correct and accessible
- **Build failures**: Check that all dependencies are installed correctly
