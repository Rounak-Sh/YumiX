import express from "express";
import { adminAuth } from "../../middleware/adminAuth.js";
import notificationController from "../../controllers/admin/notificationController.js";

const router = express.Router();

// Admin notification routes
router.get("/", adminAuth, notificationController.getNotifications);
router.put("/mark-all-read", adminAuth, notificationController.markAllAsRead);
router.delete(
  "/clear",
  adminAuth,
  notificationController.clearOldNotifications
);
router.put(
  "/:notificationId/read",
  adminAuth,
  notificationController.markAsRead
);
router.delete(
  "/:notificationId",
  adminAuth,
  notificationController.deleteNotification
);

export default router;
