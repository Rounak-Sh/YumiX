# YuMix - Recipe Management Application

YuMix is a full-stack application for managing and generating recipes, with AI capabilities, user subscriptions, and an admin dashboard.

## Deployment Information

### Backend

- Deployed on Render: [https://yumix-backend.onrender.com](https://yumix-backend.onrender.com)
- Status: Running

### Admin Dashboard

- Deployed on Vercel: [https://yumix-admin.vercel.app](https://yumix-admin.vercel.app)

### User Frontend

- Not yet deployed

## Local Development Setup

### Prerequisites

- Node.js 16+
- MongoDB
- Redis (optional, for caching)

### Installation

1. Clone the repository

```bash
git clone https://github.com/Rounak-Sh/YumiX.git
cd YumiX
```

2. Setup Backend

```bash
cd backend
npm install
# Copy .env.example to .env and configure your variables
cp .env.example .env
npm run dev
```

3. Setup Admin Dashboard

```bash
cd admin
npm install
# Copy .env.example to .env and configure your variables
npm run dev
```

4. Setup User Frontend

```bash
cd frontend
npm install
# Copy .env.example to .env and configure your variables
npm run dev
```

## Deployment Notes

### Backend (Render)

- Environment variables must be set in Render dashboard
- Make sure to include all variables from .env.example

### Frontend/Admin (Vercel)

- Add environment variables in Vercel Project Settings
- The vercel.json configuration handles SPA routing

## Tech Stack

- Backend: Node.js, Express, MongoDB
- Frontend: React, Vite, TailwindCSS
- Admin: React, Vite, TailwindCSS
- Deployment: Render (Backend), Vercel (Frontend/Admin)

## API Documentation

Base URL: https://yumix-backend.onrender.com/api

### Main Endpoints

- `/auth` - Authentication routes
- `/recipes` - Recipe management
- `/admin` - Admin operations (protected)
- `/health` - Health check endpoint
