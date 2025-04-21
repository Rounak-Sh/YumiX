import mongoose from "mongoose";
import Joi from "joi";
import bcrypt from "bcryptjs";

// Joi validation schemas
export const tempUserValidation = {
  verifyOTP: Joi.object({
    tempUserId: Joi.string().required().messages({
      "string.empty": "User ID is required",
    }),
    otp: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.empty": "OTP is required",
        "string.length": "OTP must be 6 digits",
        "string.pattern.base": "OTP must contain only numbers",
      }),
    isGoogleSignup: Joi.boolean().optional(),
  }),

  verifyResetOTP: Joi.object({
    contact: Joi.string().required().messages({
      "string.empty": "Contact (email/phone) is required",
    }),
    otp: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.empty": "OTP is required",
        "string.length": "OTP must be 6 digits",
        "string.pattern.base": "OTP must contain only numbers",
      }),
  }),

  resendOTP: Joi.object({
    tempUserId: Joi.string().required().messages({
      "string.empty": "User ID is required",
    }),
  }),
};

const tempUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      // Only required for manual registration
      required: function () {
        return !this.isGoogleSignup;
      },
      trim: true,
    },
    password: {
      type: String,
      // Only required for manual registration
      required: function () {
        return !this.isGoogleSignup;
      },
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpiry: {
      type: Date,
      required: true,
    },
    isGoogleSignup: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      default: null,
    },
    profilePicture: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
tempUserSchema.pre("save", async function (next) {
  // Only hash the password if it's modified (or new) and exists
  if (this.password && (this.isModified("password") || this.isNew)) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const TempUser = mongoose.model("TempUser", tempUserSchema);

export default TempUser;
