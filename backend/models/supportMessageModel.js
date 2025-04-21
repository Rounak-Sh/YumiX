import mongoose from "mongoose";

// Define a function to get the proper model name
// This maps the lowercase senderType to the actual model name
function getSenderModelName(type) {
  switch (type) {
    case "user":
      return "User";
    case "admin":
      return "Admin";
    case "guest":
      return null; // Guest messages don't have a model reference
    default:
      return type;
  }
}

const supportMessageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderModel", // Now using a dedicated field for the model name
      required: function () {
        return this.senderType !== "guest";
      },
    },
    senderType: {
      type: String,
      enum: ["user", "admin", "guest"],
      required: true,
    },
    senderModel: {
      type: String,
      enum: ["User", "Admin", null],
      default: function () {
        return getSenderModelName(this.senderType);
      },
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        fileName: String,
        fileType: String,
        fileSize: Number,
        filePath: String,
        publicUrl: String,
      },
    ],
    readAt: {
      type: Date,
      default: null,
    },
    // Guest sender fields
    guestEmail: {
      type: String,
      required: function () {
        return this.senderType === "guest";
      },
    },
    guestName: {
      type: String,
    },
    referenceId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Set senderModel when senderType changes
supportMessageSchema.pre("save", function (next) {
  if (this.isModified("senderType")) {
    this.senderModel = getSenderModelName(this.senderType);
  }
  next();
});

// Create indexes for fast loading of message history
supportMessageSchema.index({ ticket: 1, createdAt: 1 });
supportMessageSchema.index({ senderType: 1 });
supportMessageSchema.index({ referenceId: 1 });

const SupportMessage = mongoose.model("SupportMessage", supportMessageSchema);

export default SupportMessage;
