import UserNotification from "../../models/user/notificationModel.js";
import { User } from "../../models/index.js";
import logger from "../../utils/logger.js";

/**
 * User Notification Controller
 * Handles all notification operations for regular users
 */

/**
 * @desc    Get all notifications for a user
 * @route   GET /api/user/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { countOnly } = req.query;

    // Get the unread count in all cases
    const unreadCount = await UserNotification.countDocuments({
      userId,
      read: false,
    });

    // If countOnly parameter is true, return just the count
    if (countOnly === "true") {
      return res.json({
        success: true,
        data: {
          unreadCount,
        },
      });
    }

    // Otherwise fetch the full notifications
    const notifications = await UserNotification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    logger.error("Error fetching user notifications", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/user/notifications/:notificationId/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await UserNotification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error("Error marking user notification as read", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/user/notifications/mark-all-read
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await UserNotification.updateMany(
      { userId, read: false },
      { read: true }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
    });
  } catch (error) {
    logger.error("Error marking all user notifications as read", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

/**
 * @desc    Create a notification for user (internal use)
 * @access  Internal
 */
const createUserNotification = async ({
  userId,
  title,
  message,
  type = "info",
  data = {},
}) => {
  try {
    if (!userId) {
      logger.error("User ID is required for user notification");
      return null;
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.error(`User not found for notification: ${userId}`);
      return null;
    }

    const notification = new UserNotification({
      userId,
      title,
      message,
      type,
      data,
      read: false,
    });

    await notification.save();
    logger.info(`Created user notification: ${notification._id}`);

    // WebSocket notification code removed - using polling instead
    // Notification will be picked up by client on next poll interval

    return notification;
  } catch (error) {
    logger.error("Error creating user notification", error);
    return null;
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/user/notifications/:notificationId
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await UserNotification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting user notification", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

// Add a method to clean up old notifications
const clearOldNotifications = async (req, res) => {
  try {
    const { all = false } = req.query;
    const userId = req.user._id;

    let query = { userId };
    let message = "";

    // If not clearing all, only delete notifications older than 10 days
    if (all !== "true") {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      query.createdAt = { $lt: tenDaysAgo };
      message = "old";
    }

    // Perform the delete operation
    const result = await UserNotification.deleteMany(query);

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} ${message} notifications`,
      count: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing notifications:", error);
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
  createUserNotification,
  clearOldNotifications,
};
