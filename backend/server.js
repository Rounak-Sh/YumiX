import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/dbConfig.js";
import { connectRedis } from "./config/redisConfig.js";
import routes from "./routes/index.js";
import {
  corsOptions,
  securityHeaders,
} from "./middleware/securityMiddleware.js";
import { apiLimiter } from "./middleware/rateLimitMiddleware.js";
import { initCleanupCron } from "./config/cronJobs.js";
import { initNotificationCleanupCron } from "./config/notificationCleanupCron.js";
import { initScheduledJobs } from "./utils/scheduledJobs.js";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import imageProxyRoutes from "./routes/imageProxyRoutes.js";

dotenv.config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mark that we're using server.js directly
process.env.RUNNING_FROM_APP_JS = "false";

const app = express();

// Trust X-Forwarded-For header for rate limiting on Render
app.set("trust proxy", 1);

// Security middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5000",
      "http://localhost:3000",
      "https://yumix-admin.vercel.app",
      "https://yumix-admin-git-main-rounaqsh-gmailcoms-projects.vercel.app",
      "https://yumix-admin-8n8ef1vyh-rounaqsh-gmailcoms-projects.vercel.app",
      "https://yumix.vercel.app",
      "https://yumix-frontend.vercel.app",
      "https://yumix-git-main-rounaqsh-gmailcoms-projects.vercel.app",
      "https://yumix-rounaqsh-gmailcoms-projects.vercel.app",
      "https://yumix-users.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours
  })
);

// Set additional headers for embedded content
app.use((req, res, next) => {
  res.removeHeader("Cross-Origin-Opener-Policy");

  // Use specific origins instead of wildcard
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5000",
    "http://localhost:3000",
    "https://yumix-admin.vercel.app",
    "https://yumix-admin-git-main-rounaqsh-gmailcoms-projects.vercel.app",
    "https://yumix-admin-8n8ef1vyh-rounaqsh-gmailcoms-projects.vercel.app",
    "https://yumix.vercel.app",
    "https://yumix-frontend.vercel.app",
    "https://yumix-git-main-rounaqsh-gmailcoms-projects.vercel.app",
    "https://yumix-rounaqsh-gmailcoms-projects.vercel.app",
    "https://yumix-users.vercel.app",
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Handle preflight OPTIONS requests
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
  }

  // Add Content-Security-Policy to allow YouTube embeds
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com; img-src 'self' https://img.youtube.com https://i.ytimg.com data:; connect-src 'self' https://*.youtube.com; script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline';"
  );

  next();
});

// Skip general rate limiting for search routes that have their own specific limiters
const skipSearchRoutes = (req) => {
  // Check URL patterns to make sure we skip ALL search-related endpoints
  const searchPatterns = [
    "/recipes/search",
    "/api/recipes/search",
    "/search",
    "/api/search",
  ];

  // Get the full URL path for more accurate matching
  const fullPath = req.originalUrl || req.url;

  // Check if any pattern is found in the URL
  const shouldSkip = searchPatterns.some((pattern) =>
    fullPath.includes(pattern)
  );

  // Add more extensive logging
  console.log({
    timestamp: new Date().toISOString(),
    path: fullPath,
    shouldSkipRateLimit: shouldSkip,
    method: req.method,
  });

  return shouldSkip;
};

// Apply rate limiting with skip function for search routes
app.use((req, res, next) => {
  // Log request path and decision for debugging with more detail
  console.log(
    `[server.js] Rate limit check for: ${req.method} ${
      req.originalUrl
    }, Skipping: ${skipSearchRoutes(req)}`
  );

  if (skipSearchRoutes(req)) {
    // Skip the general rate limiter for search routes
    console.log(
      `[server.js] Skipping rate limit for search route: ${req.originalUrl}`
    );
    return next();
  }

  // Apply the general rate limiter to all other routes
  console.log(`[server.js] Applying general rate limit to: ${req.originalUrl}`);
  return apiLimiter(req, res, next);
});

// Body parsing middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Apply security headers
app.use(securityHeaders);

// API Routes - Use the main routes file
app.use("/api/health", healthRoutes);
app.use("/api", routes);
app.use("/api/auth", authRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/image-proxy", imageProxyRoutes);

// Also mount routes without the /api prefix to support legacy clients
// This ensures both /api/recipes/... and /recipes/... work
app.use("/", routes);

// Simplified server start function without WebSockets
const startServer = async (port, maxAttempts = 5) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Use Express's listen method directly
      const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });

      // Store the port number globally
      global.serverPort = port;

      // Update CORS options with the new port
      app.use(
        cors({
          ...corsOptions,
          // Make sure the origin contains the ports we're using
          origin: [...corsOptions.origin, `http://localhost:${port}`],
        })
      );

      return server;
    } catch (error) {
      if (error.code === "EADDRINUSE" && attempt < maxAttempts - 1) {
        port++;
        continue;
      }
      throw error;
    }
  }
  throw new Error(
    `Could not find an available port after ${maxAttempts} attempts`
  );
};

// Connect to MongoDB
connectDB();

// Connect to Redis
connectRedis();

// Initialize cron jobs
initCleanupCron();
initNotificationCleanupCron();
initScheduledJobs();

// Basic route that includes port information
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Yum!X API",
    port: global.serverPort,
    status: "running",
    websocket: "disabled",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong! Please try again later.",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;

// Start server with error handling
startServer(PORT).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
