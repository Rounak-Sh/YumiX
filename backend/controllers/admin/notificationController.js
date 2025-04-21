import AdminNotification from "../../models/admin/notificationModel.js";
import { Admin } from "../../models/index.js";
import logger from "../../utils/logger.js";

/**
 * Admin Notification Controller
 * Handles all notification operations for admin users
 */

/**
 * @desc    Get all notifications for an admin
 * @route   GET /api/admin/notifications
 * @access  Admin
 */
const getNotifications = async (req, res) => {
  try {
    // Auto-cleanup notifications older than 10 days
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Quietly clean up old notifications
    await AdminNotification.deleteMany({
      adminId: req.admin._id,
      createdAt: { $lt: tenDaysAgo },
    });

    // Log admin ID for debugging
    logger.debug(`Fetching notifications for admin: ${req.admin?._id}`);

    // Use admin ID from req.admin (since we're using the admin auth middleware)
    const adminId = req.admin._id;

    const notifications = await AdminNotification.find({ adminId: adminId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await AdminNotification.countDocuments({
      adminId: adminId,
      read: false,
    });

    logger.info(
      `Found ${notifications.length} notifications, ${unreadCount} unread for admin ${adminId}`
    );

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    logger.error("Error fetching admin notifications", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin notifications",
    });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/admin/notifications/:notificationId/read
 * @access  Admin
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const adminId = req.admin._id;

    // Check if it's an admin notification
    const query = { _id: notificationId, adminId };

    const notification = await AdminNotification.findOneAndUpdate(
      query,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Admin notification not found",
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error("Error marking admin notification as read", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/admin/notifications/mark-all-read
 * @access  Admin
 */
const markAllAsRead = async (req, res) => {
  try {
    const adminId = req.admin._id;

    // Update all unread admin notifications
    const result = await AdminNotification.updateMany(
      { adminId, read: false },
      { read: true }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
    });
  } catch (error) {
    logger.error("Error marking all admin notifications as read", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/admin/notifications/:notificationId
 * @access  Admin
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const adminId = req.admin._id;

    // Check if it's an admin notification
    const query = { _id: notificationId, adminId };

    const notification = await AdminNotification.findOneAndDelete(query);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Admin notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting admin notification", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

/**
 * @desc    Create a notification for admin (internal use)
 * @access  Internal
 */
const createAdminNotification = async ({
  adminId,
  title,
  message,
  type = "info",
  data = {},
}) => {
  try {
    if (!adminId) {
      logger.error("Admin ID is required for admin notification");
      return null;
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      logger.error(`Admin not found for notification: ${adminId}`);
      return null;
    }

    // Check admin preferences before creating notification
    // Skip preference check for critical notifications or if preferences don't exist
    if (admin.preferences) {
      // Map notification types to preference settings
      const preferenceMap = {
        user: "userSignups",
        payment: "paymentAlerts",
        subscription: "newSubscriptions",
        report: "reportGeneration",
        alert: "loginAlerts",
      };

      const preferenceKey = preferenceMap[type];

      // If this notification type has a preference and it's disabled, don't create notification
      if (preferenceKey && admin.preferences[preferenceKey] === false) {
        logger.info(
          `Notification of type ${type} not sent - disabled in preferences for admin ${adminId}`
        );
        return null;
      }
    }

    const notification = new AdminNotification({
      adminId,
      title,
      message,
      type,
      data,
      read: false,
    });

    await notification.save();
    logger.info(
      `Created admin notification of type "${type}" for admin ${adminId}`
    );
    return notification;
  } catch (error) {
    logger.error("Error creating admin notification", error);
    return null;
  }
};

/**
 * @desc    Clear old notifications (older than 10 days) or all notifications
 * @route   DELETE /api/admin/notifications/clear
 * @access  Admin
 */
const clearOldNotifications = async (req, res) => {
  try {
    const { all = false } = req.query;
    const adminId = req.admin._id;

    let query = { adminId };
    let message = "";

    // If not clearing all, only delete notifications older than 10 days
    if (all !== "true") {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      query.createdAt = { $lt: tenDaysAgo };
      message = "old";
    }

    console.log("Clearing notifications for admin:", adminId);
    console.log("Query:", query);

    // First, count how many notifications will be deleted
    const countToDelete = await AdminNotification.countDocuments(query);
    console.log("Notifications to delete:", countToDelete);

    // Perform the delete operation
    const result = await AdminNotification.deleteMany(query);
    console.log("Delete result:", result);

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} ${message} notifications`,
      count: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    logger.error("Error clearing notifications", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear notifications",
      error: error.message,
    });
  }
};

// Export controller methods
export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createAdminNotification,
  clearOldNotifications,
};
