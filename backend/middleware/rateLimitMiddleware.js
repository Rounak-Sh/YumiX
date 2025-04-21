import rateLimit from "express-rate-limit";
import { User } from "../models/index.js";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter - more lenient for auth routes
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per windowMs
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 5 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address and route as key
    return `${req.ip}-${req.originalUrl}`;
  },
  skip: (req) => {
    // Skip rate limiting for Google auth
    return req.originalUrl.includes("/google-auth");
  },
});

// OTP rate limiter
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per 15 minutes
  message: {
    success: false,
    message: "Too many OTP requests, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Specific limiter for OTP verification
export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 verification attempts per 15 minutes
  message: {
    success: false,
    message:
      "Too many verification attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.body.isGoogleSignup === true, // Skip for Google sign-up
});

// Middleware to check and update user's search limits based on subscription
export const searchLimitMiddleware = async (req, res, next) => {
  try {
    // Skip if no user in request (e.g. public routes)
    if (!req.user) {
      console.log("No user found in request, skipping search limit check");
      // Still attach default search info to prevent errors in controller
      req.searchInfo = {
        maxSearches: 3, // Default to free plan
        dailySearchCount: 0,
        remainingSearches: 3,
        planName: "Free",
      };
      return next();
    }

    console.log(`Checking search limits for user: ${req.user._id}`);

    // Get the latest user data with subscription plan - FIX THE POPULATE ISSUE
    const user = await User.findById(req.user._id).populate({
      path: "subscriptionId",
      select: "planType startDate expiryDate",
    });

    if (!user) {
      console.error(`User not found: ${req.user._id}`);
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Enhanced approach to check if it's a new day to reset the count
    const now = new Date();
    const todayString = now.toISOString().split("T")[0]; // YYYY-MM-DD format for today

    // Get last search date - handle both string and Date formats for compatibility
    let lastSearchDate = null;
    if (user.lastSearchDate) {
      lastSearchDate =
        typeof user.lastSearchDate === "string"
          ? user.lastSearchDate
          : user.lastSearchDate.toISOString().split("T")[0];
    }

    // Check if dates are different or if lastSearchDate is null/empty
    const isNewDay = !lastSearchDate || lastSearchDate !== todayString;

    if (isNewDay) {
      console.log(
        `New day detected, resetting search count for user: ${user._id}. Last search: ${lastSearchDate}, Today: ${todayString}`
      );
      user.dailySearchCount = 0;
      user.lastSearchDate = todayString; // Always store as string in YYYY-MM-DD format
      await user.save();
      console.log(`Search count reset successfully for user: ${user._id}`);
    }

    // Set max searches based on plan type:
    // - Free: 3 searches per day (default)
    // - Basic: 10 searches per day
    // - Premium: 30 searches per day
    // - Pro: 50 searches per day
    let maxSearches = 3; // Default for free users
    let planName = "Free";

    // Check if user has active subscription
    const hasActiveSubscription =
      user.subscriptionId &&
      user.isSubscribed &&
      new Date(user.subscriptionId.expiryDate) > now;

    if (hasActiveSubscription) {
      const planNameLower = user.subscriptionId.planType?.toLowerCase() || "";

      if (planNameLower.includes("basic")) {
        maxSearches = 10;
        planName = "Basic";
      } else if (planNameLower.includes("premium")) {
        maxSearches = 30;
        planName = "Premium";
      } else if (planNameLower.includes("pro")) {
        maxSearches = 50;
        planName = "Pro";
      }
    }

    console.log(
      `User plan: ${planName}, Max searches: ${maxSearches}, Current count: ${user.dailySearchCount}`
    );

    // Calculate remaining searches
    const remainingSearches = Math.max(0, maxSearches - user.dailySearchCount);

    // Check if user has exceeded their daily search limit
    if (remainingSearches <= 0) {
      console.log(
        `User ${user._id} has exceeded their daily search limit of ${maxSearches}`
      );
      return res.status(429).json({
        success: false,
        message: `You have reached your daily limit of ${maxSearches} searches. Upgrade your plan for more searches!`,
        error: "daily_limit_exceeded",
        limit: maxSearches,
        remaining: 0,
        plan: planName,
        upgradeRequired: planName !== "Pro", // Indicate if an upgrade is possible
      });
    }

    // If we get here, the search is allowed
    console.log(`Search allowed for user ${user._id}, incrementing count`);

    // Increment the search count
    user.dailySearchCount += 1;
    user.lastSearchDate = todayString; // Ensure date is saved in consistent format
    await user.save();

    // Attach search info to the request object for the controller
    req.searchInfo = {
      maxSearches,
      dailySearchCount: user.dailySearchCount,
      remainingSearches: remainingSearches - 1,
      planName,
    };

    next();
  } catch (error) {
    console.error("Error checking search limits:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking search limits",
      error: error.message,
    });
  }
};

// Skip general rate limiting for search routes that have their own specific limiters
const skipSearchRoutes = (req) => {
  // Check URL patterns to make sure we skip ALL search-related endpoints
  const searchPatterns = [
    "/recipes/search",
    "/api/recipes/search",
    "/search",
    "/api/search",
  ];

  // Add admin routes patterns to skip rate limiting for admin panel
  const adminPatterns = ["/admin/", "/api/admin/"];

  // Get the full URL path for more accurate matching
  const fullPath = req.originalUrl || req.url;

  // Check if any pattern is found in the URL - either search or admin routes
  const shouldSkip =
    searchPatterns.some((pattern) => fullPath.includes(pattern)) ||
    adminPatterns.some((pattern) => fullPath.includes(pattern));

  // Add more extensive logging
  console.log({
    timestamp: new Date().toISOString(),
    path: fullPath,
    shouldSkipRateLimit: shouldSkip,
    method: req.method,
  });

  return shouldSkip;
};
