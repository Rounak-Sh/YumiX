import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { subscriptionController } from "../controllers/index.js";

const router = express.Router();

// Public routes
router.get("/plans", subscriptionController.getPlans);

// Webhook route - must be public and accessible without authentication
router.post("/webhook", subscriptionController.handleWebhook);

// Protected routes - require authentication
router.use(protect);

// Get subscription status
router.get("/status", async (req, res) => {
  try {
    // If user exists in req (from protect middleware), they're authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Return subscription status
    res.json({
      success: true,
      isSubscribed: req.user.isSubscribed || false,
      expiryDate: req.user.subscriptionExpiry,
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    res.status(500).json({
      success: false,
      message: "Error checking subscription status",
    });
  }
});

// Payment routes
router.post("/create-order", subscriptionController.createOrder);
router.post("/verify-payment", subscriptionController.verifyPayment);

// Get detailed subscription status
router.get(
  "/subscription-status",
  subscriptionController.getSubscriptionStatus
);

export default router;
