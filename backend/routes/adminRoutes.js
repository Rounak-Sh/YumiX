import express from "express";
import { adminProtect } from "../middleware/authMiddleware.js";
import adminController from "../controllers/adminController.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";
import { demoRestriction } from "../middleware/demoRestrictionMiddleware.js";
import { Admin } from "../models/index.js";
import { upload, handleUploadErrors } from "../middleware/uploadMiddleware.js";
import {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  initializeDefaultPlans,
} from "../controllers/subscriptionController.js";
import adminNotificationRoutes from "./admin/notificationRoutes.js";
import { Subscription } from "../models/index.js";
import PDFDocument from "pdfkit";
import { Recipe } from "../models/index.js";
import adminNotificationController from "../controllers/admin/notificationController.js";
import {
  generateUserReport,
  generatePaymentReport,
  generateSubscriptionReport,
  generateRecipeReport,
} from "../controllers/reports/index.js";

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Admin API is running" });
});

// Use notification routes
router.use("/notifications", adminNotificationRoutes);

// Public routes (no auth required)
router.post(
  "/auth/login",
  async (req, res, next) => {
    console.log("\n=== Admin Login Route ===");
    console.log("Request body:", req.body);
    next();
  },
  authLimiter,
  adminController.login
);

router.post("/auth/verify-otp", authLimiter, adminController.verifyOtp);
router.post("/auth/resend-otp", authLimiter, adminController.resendOtp);
router.post(
  "/auth/forgot-password",
  authLimiter,
  adminController.forgotPassword
);
router.post(
  "/auth/verify-reset-otp",
  authLimiter,
  adminController.verifyResetOtp
);
router.post("/auth/reset-password", authLimiter, adminController.resetPassword);
router.get("/verify", adminController.verifyToken);

// Reset admin route
router.post("/auth/reset-admin", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check current state
    const now = new Date();
    console.log("Current state:", {
      email: admin.email,
      loginAttempts: admin.loginAttempts,
      currentTime: now,
    });

    // Direct MongoDB update to ensure clean state
    await Admin.updateOne(
      { email },
      {
        $set: {
          loginAttempts: {
            count: 0,
            lastAttempt: null,
            blockedUntil: null,
          },
        },
      }
    );

    // Verify the update
    const updatedAdmin = await Admin.findOne({ email });
    console.log("After reset:", {
      email: updatedAdmin.email,
      loginAttempts: updatedAdmin.loginAttempts,
    });

    res.json({
      success: true,
      message: "Admin reset successful",
      loginAttempts: updatedAdmin.loginAttempts,
    });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({
      success: false,
      message: "Reset failed",
      error: error.message,
    });
  }
});

// Protected routes - everything below this requires authentication
router.use(adminProtect);

// Apply demo restriction to all protected routes
router.use(demoRestriction);

// Profile routes
router.put("/profile", adminController.updateProfile);
router.put(
  "/profile/picture",
  upload.single("image"),
  handleUploadErrors,
  adminController.updateProfilePicture
);
router.post("/profile/update-otp", adminController.requestProfileUpdateOTP);
router.put("/profile/update-with-otp", adminController.updateProfileWithOTP);

// Admin preferences routes
router.put("/preferences", async (req, res) => {
  try {
    const adminId = req.admin.id;
    const preferences = req.body;

    // Update admin preferences
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { preferences },
      { new: true, runValidators: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: { preferences: updatedAdmin.preferences },
    });
  } catch (error) {
    console.error("Error updating admin preferences:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update preferences",
      error: error.message,
    });
  }
});

// Dashboard
router.get("/dashboard/stats", adminController.getDashboardStats);
router.get("/dashboard/user-growth", adminController.getUserGrowthData);
router.get(
  "/dashboard/recipe-popularity",
  adminController.getRecipePopularityData
);
router.get("/dashboard/subscriptions", adminController.getSubscriptionData);
router.get(
  "/dashboard/activity-metrics",
  adminController.getActivityMetricsData
);

// User management
router.get("/users", adminController.getAllUsers);
router.get("/users/search", adminController.searchUsers);
router.get("/users/:id", adminController.getUserDetails);
router.put("/users/:id/block", adminController.blockUser);
router.put("/users/:id/unblock", adminController.unblockUser);

// Recipe management
router.get("/recipes", adminController.getAllRecipes);
router.post("/recipes/search", adminController.searchRecipes);
router.get("/recipes/featured", adminController.getFeaturedRecipes);
router.get("/recipes/video", adminController.getRecipeVideo);
router.put("/recipes/:recipeId/feature", adminController.featureRecipe);
router.delete("/recipes/:recipeId/unfeature", adminController.unfeatureRecipe);

// YouTube API quota management
router.get("/youtube/quota-status", adminController.checkYouTubeQuotaStatus);

// Reports
router.get("/reports/users", generateUserReport);
router.get("/reports/recipes", generateRecipeReport);
router.get("/reports/subscriptions", generateSubscriptionReport);
router.get("/reports/payments", generatePaymentReport);

// Subscription routes
router.get("/subscriptions/users", adminController.getSubscribedUsers);

// Payment routes
// Comment out these routes until the functions are implemented
router.get("/payments", adminController.getAllPayments);
router.get("/payments/:paymentId", adminController.getPaymentDetails);

// Subscription Plan Routes
router.get("/plans", getAllPlans);
router.post("/plans", createPlan);
router.put("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);
router.post("/plans/initialize", initializeDefaultPlans);

// Add this route only in development
if (process.env.NODE_ENV === "development") {
  router.post("/create-admin", async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check if admin exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "Admin already exists with this email",
        });
      }

      // Create new admin
      const admin = await Admin.create({
        name,
        email,
        password, // Will be hashed by the model's pre-save hook
        role: "admin",
      });

      res.status(201).json({
        success: true,
        message: "Admin created successfully",
        data: {
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("Admin creation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create admin",
        error: error.message,
      });
    }
  });

  // Reset rate limit for development
  router.post("/auth/reset-limit", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Reset login attempts
      await admin.resetLoginAttempts();

      res.json({
        success: true,
        message: "Rate limit reset successful",
      });
    } catch (error) {
      console.error("Reset error:", error);
      res.status(500).json({
        success: false,
        message: "Reset failed",
        error: error.message,
      });
    }
  });
}

router.get("/dashboard-stats", adminProtect, adminController.getDashboardStats);

// Debug endpoint to force check for recent subscription notifications
router.get(
  "/debug/check-subscription-notifications",
  adminProtect,
  async (req, res) => {
    try {
      console.log("Manually checking for recent subscriptions...");

      // Look for completed payments in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const {
        Payment,
        Subscription,
        User,
        Admin,
      } = require("../models/index.js");
      const adminNotificationController =
        require("../controllers/admin/notificationController.js").default;

      const recentPayments = await Payment.find({
        status: "completed",
        updatedAt: { $gte: oneDayAgo },
      }).populate("userId");

      console.log(`Found ${recentPayments.length} recent payments`);

      if (recentPayments.length === 0) {
        return res.json({
          success: true,
          message: "No recent payments found",
          data: { count: 0 },
        });
      }

      // Process each payment
      const results = [];

      for (const payment of recentPayments) {
        const subscription = await Subscription.findById(
          payment.subscriptionId
        );

        if (!subscription) {
          results.push({
            paymentId: payment._id,
            status: "skip",
            reason: "No subscription found",
          });
          continue;
        }

        // Get user
        const user = payment.userId;
        if (!user || typeof user === "string") {
          results.push({
            paymentId: payment._id,
            status: "skip",
            reason: "No user data found",
          });
          continue;
        }

        console.log(
          `Processing subscription for user: ${user.name || user._id}`
        );

        // Get all active admins
        const admins = await Admin.find({ status: "active" });

        // Send notifications
        const adminResults = [];

        for (const admin of admins) {
          try {
            const notification =
              await adminNotificationController.createAdminNotification({
                adminId: admin._id,
                title: "Recent Subscription Found",
                message: `${user.name} subscribed to ${subscription.planType} plan for ₹${payment.amount}`,
                type: "subscription",
                data: {
                  userId: user._id,
                  userName: user.name,
                  userEmail: user.email,
                  planType: subscription.planType,
                  amount: payment.amount,
                  subscriptionId: subscription._id,
                  timestamp: new Date(),
                  forcedByDebugEndpoint: true,
                },
              });

            adminResults.push({
              adminId: admin._id,
              success: !!notification,
              notificationId: notification?._id,
            });
          } catch (error) {
            console.error(
              `Error creating notification for admin ${admin._id}:`,
              error
            );
            adminResults.push({
              adminId: admin._id,
              success: false,
              error: error.message,
            });
          }
        }

        results.push({
          paymentId: payment._id,
          subscriptionId: subscription._id,
          userId: user._id,
          userName: user.name,
          planType: subscription.planType,
          amount: payment.amount,
          status: "processed",
          adminResults,
        });
      }

      return res.json({
        success: true,
        message: `Processed ${results.length} recent payments`,
        data: {
          count: results.length,
          results,
        },
      });
    } catch (error) {
      console.error(
        "Error in subscription notification debug endpoint:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Error checking subscription notifications",
        error: error.message,
      });
    }
  }
);

export default router;
