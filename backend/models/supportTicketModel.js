import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.isGuestRequest;
      },
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "technical",
        "account",
        "billing",
        "feature",
        "other",
        "general",
        "unblock",
        "reactivate",
      ],
    },
    status: {
      type: String,
      enum: [
        "open",
        "in-progress",
        "resolved",
        "closed",
        "awaiting-user-reply",
        "awaiting-support-reply",
      ],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastRepliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    unreadByUser: {
      type: Boolean,
      default: false,
    },
    unreadByAdmin: {
      type: Boolean,
      default: true,
    },
    responses: [
      {
        responder: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        message: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Guest request fields
    isGuestRequest: {
      type: Boolean,
      default: false,
    },
    guestEmail: {
      type: String,
      required: function () {
        return this.isGuestRequest;
      },
    },
    guestName: {
      type: String,
    },
    referenceId: {
      type: String,
      required: function () {
        return this.isGuestRequest;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });
supportTicketSchema.index({ updatedAt: -1 });
supportTicketSchema.index({ isGuestRequest: 1 });
supportTicketSchema.index({ referenceId: 1 });
supportTicketSchema.index({ guestEmail: 1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
