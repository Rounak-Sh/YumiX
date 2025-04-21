import mongoose from "mongoose";

const adminNotificationSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    title: {
      type: String,
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "user",
        "payment",
        "alert",
        "subscription",
        "report",
        "referral",
        "info",
        "test",
      ],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "adminNotifications",
  }
);

// Index for faster queries
adminNotificationSchema.index({ adminId: 1, createdAt: -1 });
adminNotificationSchema.index({ adminId: 1, read: 1 });

const AdminNotification = mongoose.model(
  "AdminNotification",
  adminNotificationSchema
);

export default AdminNotification;
