# Chytare — Indian Luxury Fashion Platform

Production-ready fullstack application: React frontend + FastAPI backend + MongoDB + Cloudinary.

---

## Architecture

```
Frontend (React)  →  Backend (FastAPI)  →  MongoDB Atlas
     ↓                    ↓
   Vercel              Railway            Cloudinary (media)
```

---

## Quick Start (Local Development)

```bash
# Backend
cd backend
cp .env.example .env        # Edit with your credentials
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend
cd frontend
cp .env.example .env        # Set REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | Yes | MongoDB Atlas connection string |
| `DB_NAME` | Yes | Database name (default: `chytare`) |
| `JWT_SECRET` | Yes | Secret for JWT tokens (min 32 chars) |
| `CLOUDINARY_CLOUD_NAME` | Yes (prod) | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes (prod) | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes (prod) | Cloudinary API secret |
| `FRONTEND_URL` | Yes | Frontend URL for CORS and reset links |
| `ADMIN_EMAIL` | No | Default admin email |
| `RESEND_API_KEY` | No | Resend API key for emails |
| `SENDER_EMAIL` | No | Email sender address |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_BACKEND_URL` | Yes | Backend API URL (e.g. `https://api.chytare.com`) |

---

## Deployment Guide

### Step 1: MongoDB Atlas

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create free cluster
2. Create database user (username + password)
3. Whitelist IPs: `0.0.0.0/0` (for Railway) or specific Railway IPs
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/chytare`
5. The app auto-creates collections on first run

### Step 2: Cloudinary

1. Go to [cloudinary.com](https://cloudinary.com) → Create free account
2. Dashboard → Copy: Cloud Name, API Key, API Secret
3. Free tier: 25 credits/month (~25GB storage, 25GB bandwidth)
4. Upload images through admin panel — they're stored permanently on Cloudinary CDN

### Step 3: Railway (Backend)

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo, set root directory to `backend`
3. Add environment variables from `.env.example`
4. Railway auto-detects Python — set start command:
   ```
   uvicorn server:app --host 0.0.0.0 --port $PORT
   ```
5. Note the generated URL (e.g. `https://chytare-api.up.railway.app`)

### Step 4: Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set root directory to `frontend`
3. Framework: Create React App
4. Add environment variable:
   ```
   REACT_APP_BACKEND_URL = https://chytare-api.up.railway.app
   ```
5. Deploy. Vercel handles build + CDN automatically.

### Step 5: Connect Frontend → Backend

1. In Railway backend env, set:
   ```
   FRONTEND_URL = https://your-vercel-app.vercel.app
   ```
2. This ensures CORS allows your frontend domain.

### Step 6: Custom Domain (Later)

**Vercel (frontend):**
- Settings → Domains → Add `chytare.com`
- Point DNS A/CNAME records as instructed

**Railway (backend):**
- Settings → Networking → Custom Domain → Add `api.chytare.com`
- Point DNS CNAME record as instructed

Then update:
- Frontend env: `REACT_APP_BACKEND_URL=https://api.chytare.com`
- Backend env: `FRONTEND_URL=https://chytare.com`

---

## Admin Panel

- **URL**: `https://yourdomain.com/admin/login`
- **Default credentials**: Set during first setup via `/api/init-defaults`
- **Account Settings**: `/admin/account-settings` (change password, 2FA, email status)
- **CMS**: `/admin/settings` (homepage hero, explore tiles, collection grid, policies)
- **Products**: `/admin/products` (add/edit/archive/delete)
- **Categories**: `/admin/categories` (design categories, materials, work types)

---

## Image Upload Guidelines

Display these in admin helper text:

| Asset | Recommended Size | Ratio |
|---|---|---|
| Homepage Hero | 2560 × 1600 px | 16:10 |
| Collection Tiles | 2000 × 2500 px | 4:5 |
| Explore Tiles | 2000 × 2500 px | 4:5 |
| Product Gallery | 2400 px+ (long edge) | varies |

- Format: WebP or high-quality JPG
- Target file size: 300–900 KB per image
- Leave 8–12% headroom above model's head for editorial crops

---

## Database Collections

| Collection | Purpose |
|---|---|
| `users` | Admin accounts (email, password, 2FA, recovery codes) |
| `products` | Product catalog (name, slug, media, details, pricing) |
| `categories` | Design categories, materials, work types, collection types |
| `homepage_settings` | CMS data (hero, explore tiles, grid tiles, brand section) |
| `site_settings` | Policies, SEO, contact info |
| `stories` | Brand stories / editorial content |
| `inquiries` | Contact form submissions |
| `password_reset_tokens` | Temporary password reset tokens |

---

## Future AWS Migration

When ready to move from Railway/Vercel to AWS:

1. **Backend** → AWS ECS (Fargate) or EC2 + Docker
   - Same FastAPI app, same env vars
   - Use ALB for HTTPS termination
2. **Frontend** → AWS S3 + CloudFront
   - `yarn build` → upload `build/` to S3
   - CloudFront CDN for global distribution
3. **Database** → Keep MongoDB Atlas (or self-host on EC2)
4. **Media** → Keep Cloudinary (or migrate to S3 + CloudFront)
5. **Domain** → Route53 for DNS management

The codebase requires zero code changes for AWS migration — only environment variable updates.

---

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Shadcn/UI, Framer Motion, TipTap (rich text)
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic, python-jose (JWT), pyotp (2FA)
- **Database**: MongoDB (Atlas recommended)
- **Media**: Cloudinary
- **Email**: Resend (optional)
