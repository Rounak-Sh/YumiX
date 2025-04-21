import mongoose from "mongoose";

const userNotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "welcome",
        "subscription",
        "payment",
        "recipe",
        "system",
        "referral",
        "comment",
        "like",
        "follow",
        "support",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    image: {
      type: String,
      default: null,
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
userNotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
userNotificationSchema.index({ user: 1, createdAt: -1 });

const UserNotification = mongoose.model(
  "UserNotification",
  userNotificationSchema
);

export default UserNotification;
