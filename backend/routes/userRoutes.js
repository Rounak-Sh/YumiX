import { Router } from "express";
import { userController } from "../controllers/index.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  searchLimitMiddleware,
  authLimiter,
  otpLimiter,
  verifyOtpLimiter,
} from "../middleware/rateLimitMiddleware.js";
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyOTP,
  validateResendOTP,
} from "../middleware/validationMiddleware.js";
import userNotificationRoutes from "./user/notificationRoutes.js";
import User from "../models/userModel.js";
import { upload, handleUploadErrors } from "../middleware/uploadMiddleware.js";

const router = Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "User API is running" });
});

// Use notification routes
router.use("/notifications", userNotificationRoutes);

// Public routes with auth rate limiting
router.post("/register", validateRegister, userController.register);
router.post("/login", authLimiter, validateLogin, userController.login);
router.post("/google-auth", authLimiter, userController.googleAuth);
router.post("/refresh-token", authLimiter, userController.refreshToken);
router.post("/logout", userController.logout);

// OTP routes with specific rate limiting
router.post(
  "/verify-otp",
  verifyOtpLimiter,
  validateVerifyOTP,
  userController.verifyOTP
);
router.post(
  "/resend-otp",
  otpLimiter,
  validateResendOTP,
  userController.resendOTP
);

// Password reset routes with respective rate limiting
router.post(
  "/forgot-password",
  authLimiter,
  validateForgotPassword,
  userController.forgotPassword
);
router.post(
  "/verify-reset-otp",
  verifyOtpLimiter,
  validateVerifyOTP,
  userController.verifyResetOtp
);
router.post(
  "/reset-password",
  authLimiter,
  validateResetPassword,
  userController.resetPassword
);

// Protected routes
router.use(protect); // Apply auth middleware to all routes below

// Profile routes
router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.put("/profile/password", userController.updatePassword);
router.post(
  "/profile/update-otp",
  otpLimiter,
  userController.requestProfileUpdateOTP
);
router.put(
  "/profile/update-with-otp",
  verifyOtpLimiter,
  userController.updateProfileWithOTP
);
router.post(
  "/profile/image",
  upload.single("profileImage"),
  handleUploadErrors,
  userController.updateProfileImage
);
router.get("/activity-stats", userController.getActivityStats);
router.delete("/profile", userController.deleteAccount);

// Favorites routes
router.get("/favorites", userController.getFavorites);
router.post("/favorites/:recipeId", userController.addFavorite);
router.delete("/favorites/:recipeId", userController.removeFavorite);

// Add a route to reset search count (for testing)
router.post("/reset-search-count", protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { dailySearchCount: 0 });
    res.json({
      success: true,
      message: "Search count reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reset search count",
    });
  }
});

// Add a route to clear all rate limiters (for development/testing)
router.post("/reset-rate-limits", protect, async (req, res) => {
  try {
    // This route will cause the Express server to restart in development
    // which will clear all rate limiters that are stored in memory
    res.json({
      success: true,
      message: "Rate limiters will be reset on server restart",
      action: "Please restart your server to completely clear rate limiters",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reset rate limiters",
    });
  }
});

// Add a route to check current search limits and usage
router.get("/search-limits", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "subscriptionId",
      select: "plan planId expiresAt",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get current search counts
    const today = new Date();
    const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const isNewDay =
      !user.lastSearchDate || user.lastSearchDate !== todayString;
    const dailySearchCount = isNewDay ? 0 : user.dailySearchCount;

    // Determine max searches based on subscription
    const FREE_TIER_LIMIT = 3;
    let maxSearches = FREE_TIER_LIMIT; // Default to free tier
    let planName = "Free Tier";

    if (user.isSubscribed) {
      // Check subscription.plan first (for newest format)
      if (user.subscriptionId && user.subscriptionId.plan) {
        const planData = user.subscriptionId.plan;
        maxSearches = planData.maxSearchesPerDay || planData.maxSearches || 10;
        planName = planData.name || "Premium Plan";
      }
      // Fall back to user.subscription
      else if (user.subscription) {
        maxSearches = user.subscription.maxSearches || 10;
        planName = user.subscription.planName || "Premium Plan";
      }
    }

    // Calculate remaining searches
    const hasUnlimitedSearches = maxSearches === 999999 || maxSearches === -1;
    const remainingSearches = hasUnlimitedSearches
      ? "unlimited"
      : Math.max(0, maxSearches - dailySearchCount);

    return res.status(200).json({
      success: true,
      data: {
        plan: planName,
        isSubscribed: user.isSubscribed,
        dailySearchCount,
        maxSearches: hasUnlimitedSearches ? "unlimited" : maxSearches,
        remainingSearches,
        lastSearchDate: user.lastSearchDate,
        isNewDay,
      },
    });
  } catch (error) {
    console.error("Error checking search limits:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking search limits",
    });
  }
});

// Add a route to check search count reset status
router.get("/debug-search-reset", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get current date info
    const now = new Date();
    const todayString = now.toISOString().split("T")[0];

    // Determine if this would be a new day
    const lastSearchDate = user.lastSearchDate || null;
    const wouldReset = !lastSearchDate || lastSearchDate !== todayString;

    res.json({
      success: true,
      debugInfo: {
        userId: user._id,
        currentSearchCount: user.dailySearchCount,
        lastSearchDate: user.lastSearchDate,
        currentServerDate: todayString,
        currentServerTime: now.toISOString(),
        wouldResetOnNextSearch: wouldReset,
        dateFormat: {
          lastSearchDateType: typeof user.lastSearchDate,
          isValidFormat: user.lastSearchDate
            ? /^\d{4}-\d{2}-\d{2}$/.test(user.lastSearchDate)
            : null,
        },
      },
      message: wouldReset
        ? "Search count would reset on next search because it's a new day"
        : "Search count would not reset on next search because it's the same day",
    });
  } catch (error) {
    console.error("Error checking search reset debug:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check search reset debug",
      error: error.message,
    });
  }
});

export default router;

// Development-only routes
if (process.env.NODE_ENV === "development") {
  router.post("/dev-login", userController.devLogin);
  console.log("Development mode: Dev login route enabled");
}
