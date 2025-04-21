import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import notificationController from "../../controllers/user/notificationController.js";

const router = express.Router();

// User notification routes
router.get("/", protect, notificationController.getNotifications);
router.put("/:notificationId/read", protect, notificationController.markAsRead);
router.put("/mark-all-read", protect, notificationController.markAllAsRead);
router.delete(
  "/:notificationId",
  protect,
  notificationController.deleteNotification
);
router.delete("/clear", protect, notificationController.clearOldNotifications);

export default router;
