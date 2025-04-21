import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["user", "recipe", "subscription"],
      required: true,
    },
    data: {
      type: Object,
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    dateRange: {
      start: Date,
      end: Date,
    },
    format: {
      type: String,
      enum: ["pdf", "csv", "excel"],
      default: "pdf",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.model("Report", reportSchema);

export default Report;
