import mongoose from "mongoose";

const userNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
        "recipe",
        "payment",
        "subscription",
        "account",
        "feature",
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
    collection: "userNotifications", // Explicitly set collection name
  }
);

// Index for faster queries
userNotificationSchema.index({ userId: 1, createdAt: -1 });
userNotificationSchema.index({ userId: 1, read: 1 });

const UserNotification = mongoose.model(
  "UserNotification",
  userNotificationSchema
);

export default UserNotification;
