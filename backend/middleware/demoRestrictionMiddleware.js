// Middleware to restrict demo users from performing write operations
const demoRestriction = (req, res, next) => {
  try {
    // Check if the request is from a demo user
    if (req.admin && (req.admin.role === "demo" || req.admin.demoAccount)) {
      // For GET requests, allow read-only access
      if (req.method === "GET") {
        return next();
      }

      // Block all other methods (POST, PUT, DELETE, etc.)
      return res.status(403).json({
        success: false,
        message:
          "Demo accounts have read-only access. This action is not permitted in demo mode.",
        isDemoRestriction: true,
      });
    }

    // Not a demo user, proceed normally
    next();
  } catch (error) {
    console.error("Error in demo restriction middleware:", error);
    next(error);
  }
};

export { demoRestriction };
