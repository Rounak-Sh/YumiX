// CORS configuration middleware
export const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5000",
    "http://localhost:3000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 600, // Cache preflight requests for 10 minutes
};

// Essential security headers middleware
export const securityHeaders = (req, res, next) => {
  // Basic security headers
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Change X-Frame-Options to allow YouTube embedding
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Content Security Policy to allow YouTube embeds
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com; img-src 'self' https://img.youtube.com https://i.ytimg.com data:; connect-src 'self' https://*.youtube.com; script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline';"
  );

  // Disable client-side caching for authenticated routes
  if (req.headers.authorization) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
  }

  next();
};
