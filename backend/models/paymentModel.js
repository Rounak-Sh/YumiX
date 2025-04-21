import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["razorpay", "cashfree"],
      default: "cashfree",
    },
    // Razorpay fields
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    // Cashfree fields
    cashfreeOrderId: {
      type: String,
    },
    cashfreeLinkId: {
      type: String,
    },
    cashfreeReferenceId: {
      type: String,
    },
    cashfreePaymentId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Add validation to ensure either Razorpay or Cashfree fields are filled
paymentSchema.pre("save", function (next) {
  if (this.paymentMethod === "razorpay" && !this.razorpayOrderId) {
    return next(
      new Error("Razorpay order ID is required for Razorpay payments")
    );
  }

  if (
    this.paymentMethod === "cashfree" &&
    !this.cashfreeOrderId &&
    !this.cashfreeLinkId
  ) {
    return next(
      new Error(
        "Either Cashfree order ID or link ID is required for Cashfree payments"
      )
    );
  }

  return next();
});

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
