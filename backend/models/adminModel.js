import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Joi from "joi";

// Validation schemas
export const adminValidation = {
  login: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Please enter a valid email address",
        "string.empty": "Email is required",
        "any.required": "Email is required",
      }),
    password: Joi.string().required().messages({
      "string.empty": "Password is required",
      "any.required": "Password is required",
    }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Please enter a valid email address",
        "string.empty": "Email is required",
        "any.required": "Email is required",
      }),
  }),

  verifyOtp: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Please enter a valid email address",
        "string.empty": "Email is required",
        "any.required": "Email is required",
      }),
    otp: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.length": "OTP must be 6 digits",
        "string.pattern.base": "OTP must contain only numbers",
        "string.empty": "OTP is required",
        "any.required": "OTP is required",
      }),
    isForgotPassword: Joi.boolean(),
  }),

  resetPassword: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Please enter a valid email address",
        "string.empty": "Email is required",
        "any.required": "Email is required",
      }),
    newPassword: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters long",
      "string.empty": "Password is required",
      "any.required": "Password is required",
    }),
  }),
};

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    image: String,
    role: {
      type: String,
      enum: ["admin", "super_admin"],
      default: "admin",
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },
    loginAttempts: {
      count: { type: Number, default: 0 },
      lastAttempt: Date,
      blockedUntil: Date,
    },
    preferences: {
      type: {
        loginAlerts: { type: Boolean, default: true },
        reportGeneration: { type: Boolean, default: true },
        userSignups: { type: Boolean, default: true },
        newSubscriptions: { type: Boolean, default: true },
        paymentAlerts: { type: Boolean, default: true },
      },
      default: {
        loginAlerts: true,
        reportGeneration: true,
        userSignups: true,
        newSubscriptions: true,
        paymentAlerts: true,
      },
    },
  },
  { timestamps: true }
);

// Add methods BEFORE creating the model
adminSchema.methods = {
  matchPassword: async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  },
  incrementLoginAttempts: async function () {
    console.log("Before increment:", {
      loginAttempts: this.loginAttempts,
      now: new Date(),
    });

    if (!this.loginAttempts) {
      this.loginAttempts = {
        count: 0,
        lastAttempt: null,
        blockedUntil: null,
      };
    }

    // If block duration has passed, reset attempts
    if (
      this.loginAttempts.blockedUntil &&
      this.loginAttempts.blockedUntil < new Date()
    ) {
      console.log("Block duration passed, resetting attempts");
      this.loginAttempts = {
        count: 1,
        lastAttempt: new Date(),
        blockedUntil: null,
      };
    } else {
      // Increment existing attempts
      this.loginAttempts.count = (this.loginAttempts.count || 0) + 1;
      this.loginAttempts.lastAttempt = new Date();

      // Block after 5 attempts
      if (this.loginAttempts.count >= 5) {
        this.loginAttempts.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
    }

    console.log("After increment:", {
      loginAttempts: this.loginAttempts,
      now: new Date(),
    });

    return this.save();
  },
  resetLoginAttempts: async function () {
    this.loginAttempts = {
      count: 0,
      lastAttempt: null,
      blockedUntil: null,
    };
    return this.save();
  },
};

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export const Admin = mongoose.model("Admin", adminSchema);
