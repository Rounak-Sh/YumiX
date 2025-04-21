import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      unique: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Plan price is required"],
      min: [0, "Price cannot be negative"],
    },
    duration: {
      type: Number,
      required: [true, "Plan duration is required"],
      min: [1, "Duration must be at least 1 day"],
    },
    features: {
      type: [String],
      required: [true, "Plan features are required"],
      validate: {
        validator: function (features) {
          return features.length > 0;
        },
        message: "At least one feature is required",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxSearchesPerDay: {
      type: Number,
      required: [true, "Maximum searches per day is required"],
      min: [1, "Must allow at least 1 search per day"],
    },
    order: {
      type: Number,
      required: [true, "Plan order is required"],
      min: 1,
      max: 3,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only 3 active plans exist
subscriptionPlanSchema.pre("save", async function (next) {
  if (!this.isActive) return next();

  const count = await this.constructor.countDocuments({ isActive: true });
  if (!this.isModified("isActive") && count > 3) {
    throw new Error("Cannot have more than 3 active plans");
  }
  next();
});

const SubscriptionPlan = mongoose.model(
  "SubscriptionPlan",
  subscriptionPlanSchema
);

export default SubscriptionPlan;
