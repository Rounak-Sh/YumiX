# YuMix - AI-Powered Recipe Management Platform

YuMix is a comprehensive recipe management platform that combines traditional recipe storage with AI-powered recipe generation, user subscriptions, and a robust admin dashboard.

![YuMix Logo](https://placeholder-for-your-logo.com)

## 🚀 Live Deployments

| Component       | Status     | URL                                                              |
| --------------- | ---------- | ---------------------------------------------------------------- |
| Backend API     | ✅ Live    | [yumix-backend.onrender.com](https://yumix-backend.onrender.com) |
| Admin Dashboard | ✅ Live    | [yumix-admin.vercel.app](https://yumix-admin.vercel.app)         |
| User Frontend   | ⏳ Pending | _Coming soon_                                                    |

## ✨ Features

### 👤 User Platform

- **AI Recipe Generation** - Create custom recipes with AI assistance
- **Recipe Search & Discovery** - Find recipes with advanced filtering
- **User Profiles** - Save favorites and track recipe history
- **Subscription Tiers** - Access premium features with subscription plans
- **Support System** - Create and track support tickets

### 👑 Admin Dashboard

- **User Management** - View, edit, and manage user accounts
- **Content Management** - Control recipes and featured content
- **Subscription Management** - Manage subscription plans and subscribers
- **Payment Tracking** - Monitor and manage payment transactions
- **Support Handling** - Respond to user support tickets

## 🛠️ Tech Stack

### Backend

- Node.js & Express
- MongoDB with Mongoose
- Redis for caching
- JWT & Clerk authentication
- Razorpay payment processing
- Google Gemini AI integration
- Cloudinary for image storage

### Frontend & Admin

- React 19
- Tailwind CSS
- Recoil for state management
- React Router
- Headless UI components
- Material UI (Admin only)
- Recharts for data visualization

## 🏗️ Project Structure

```
YuMix/
├── backend/             # Express API server
│   ├── config/          # Configuration files
│   ├── controllers/     # API logic
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   └── utils/           # Helper functions
│
├── frontend/            # User-facing React application
│   ├── public/          # Static assets
│   └── src/
│       ├── assets/      # Images, icons, etc.
│       ├── components/  # Reusable UI components
│       ├── context/     # React context providers
│       ├── hooks/       # Custom React hooks
│       ├── layouts/     # Page layouts
│       ├── pages/       # Page components
│       ├── services/    # API service integrations
│       └── utils/       # Helper functions
│
└── admin/               # Admin dashboard React application
    ├── public/          # Static assets
    └── src/
        ├── assets/      # Images, icons, etc.
        ├── components/  # Reusable UI components
        ├── contexts/    # React context providers
        ├── hooks/       # Custom React hooks
        ├── layouts/     # Page layouts
        ├── pages/       # Page components
        ├── services/    # API service integrations
        └── utils/       # Helper functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- MongoDB
- Redis (optional, for caching)

### Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Rounak-Sh/YumiX.git
   cd YumiX
   ```

2. **Set up the backend**

   ```bash
   cd backend
   npm install

   # Configure environment variables
   cp .env.example .env

   # Start the development server
   npm run server
   ```

3. **Set up the admin dashboard**

   ```bash
   cd admin
   npm install

   # Configure environment variables
   cp .env.example .env

   # Start the development server
   npm run dev
   ```

4. **Set up the frontend**

   ```bash
   cd frontend
   npm install

   # Configure environment variables
   cp .env.example .env

   # Start the development server
   npm run dev
   ```

## 📝 Environment Variables

Each component (backend, frontend, admin) requires its own set of environment variables. Check the `.env.example` files in each directory for the required variables.

Key environment variables include:

- MongoDB connection string
- JWT secret key
- API keys for third-party services (Cloudinary, Razorpay, Google AI)
- CORS origins for frontend/admin URLs

## 🧪 API Documentation

### Base URL

- Development: `http://localhost:5000/api`
- Production: `https://yumix-backend.onrender.com/api`

### Key Endpoints

- `/auth` - Authentication routes
- `/recipes` - Recipe management
- `/user` - User profile operations
- `/subscriptions` - Subscription management
- `/support` - Support ticket system
- `/admin` - Admin operations (protected)

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Google Gemini](https://ai.google.dev/docs/gemini_api_overview)
