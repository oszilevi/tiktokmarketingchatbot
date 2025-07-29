# Deploying to Vercel

This project can be fully deployed on Vercel (both frontend and backend).

## Prerequisites

1. Create a PostgreSQL database (recommended providers):
   - **Neon** (https://neon.tech) - Free tier available
   - **Supabase** (https://supabase.com) - Free tier available
   - **Vercel Postgres** (https://vercel.com/storage/postgres)

2. Get your database connection string (should look like):
   ```
   postgresql://username:password@host:port/database
   ```

## Deployment Steps

### 1. Prepare the Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. Deploy Backend on Vercel

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. **IMPORTANT**: Set the Root Directory to `backend`
5. Add environment variables:
   ```
   DATABASE_URL=your-postgresql-connection-string
   SECRET_KEY=generate-a-random-secret-key
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-3.5-turbo
   ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
   ```
6. Deploy

Note your backend URL (e.g., `https://your-backend.vercel.app`)

### 3. Deploy Frontend on Vercel

1. Create another new project on Vercel
2. Import the same GitHub repository
3. Set the Root Directory to `frontend`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
   ```
5. Deploy

### 4. Update CORS Settings

After frontend is deployed, go back to backend project settings and update:
```
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

## Database Setup

Run these SQL commands in your PostgreSQL database to create tables:

```sql
-- This will be automatically created by SQLAlchemy on first run
-- But you can also create them manually if needed
```

## Limitations on Vercel

1. **No file uploads** - Vercel's filesystem is read-only
2. **Function timeout** - Max 10 seconds (Pro: 60s)
3. **Cold starts** - First request may be slower

## Alternative: Single Deployment

You can also deploy both frontend and backend as a monorepo:

1. Move all backend files to `frontend/api/`
2. Update imports accordingly
3. Deploy as a single Next.js + API Routes project

## Testing

After deployment:
1. Visit your frontend URL
2. Register a new account
3. Start chatting!

## Troubleshooting

- **CORS errors**: Make sure ALLOWED_ORIGINS includes your frontend URL
- **Database errors**: Check DATABASE_URL is correct and tables are created
- **API key errors**: Verify OPENAI_API_KEY is set correctly
- **Cold start issues**: First request after inactivity may timeout - just retry