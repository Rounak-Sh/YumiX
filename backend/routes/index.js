import express from "express";
import userRoutes from "./userRoutes.js";
import authRoutes from "./authRoutes.js";
import recipeRoutes from "./recipeRoutes.js";
import subscriptionRoutes from "./subscriptionRoutes.js";
import adminRoutes from "./adminRoutes.js";
import adminNotificationRoutes from "./admin/notificationRoutes.js";
import userNotificationRoutes from "./user/notificationRoutes.js";
import supportRoutes from "./supportRoutes.js";
import aiRecipeRoutes from "./aiRecipeRoutes.js";
import recipeController from "../controllers/recipeController.js";
import { protect } from "../middleware/authMiddleware.js";
import notificationController from "../controllers/user/notificationController.js";

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/recipes", recipeRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/support", supportRoutes);
router.use("/ai-recipes", aiRecipeRoutes);

// Notification routes for users
router.use("/user/notifications", userNotificationRoutes);

// Add compatibility route for frontend - it's looking for /notifications/user instead of /user/notifications
router.get(
  "/notifications/user",
  protect,
  notificationController.getNotifications
);
router.put(
  "/notifications/user/:notificationId/read",
  protect,
  notificationController.markAsRead
);
router.put(
  "/notifications/user/read-all",
  protect,
  notificationController.markAllAsRead
);
router.delete(
  "/notifications/user/clear",
  protect,
  notificationController.clearOldNotifications
);

// Admin notification routes - must be mounted BEFORE general admin routes
// to ensure the correct route matching
router.use("/admin/notifications", adminNotificationRoutes);

// General admin routes (mounted after specific admin routes)
router.use("/admin", adminRoutes);

// Add direct routes to match the frontend's expected format
// Recipe history routes - make sure to handle both /api/recipes/history and /recipes/history
router.post(
  "/recipes/history/:recipeId",
  protect,
  recipeController.addToRecipeHistory
);
router.get("/recipes/history", protect, recipeController.getRecipeHistory);
router.delete("/recipes/history", protect, recipeController.clearRecipeHistory);

export default router;
