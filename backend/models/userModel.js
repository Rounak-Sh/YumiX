import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Joi from "joi";
import Recipe from "./recipeModel.js";

// Joi validation schemas
export const userValidation = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 2 characters long",
      "string.max": "Name cannot exceed 50 characters",
    }),
    email: Joi.string().email({ minDomainSegments: 2 }).required().messages({
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
    }),
    phone: Joi.string()
      .pattern(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/)
      .required()
      .messages({
        "string.empty": "Phone number is required",
        "string.pattern.base": "Please enter a valid Indian phone number",
      }),
    password: Joi.string()
      .min(8)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      )
      .required()
      .messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
      }),
  }),

  login: Joi.object({
    emailOrPhone: Joi.string().required().messages({
      "any.required": "Email or phone is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email({ minDomainSegments: 2 }).messages({
      "string.email": "Please enter a valid email address",
    }),
    phone: Joi.string()
      .pattern(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/)
      .messages({
        "string.pattern.base": "Please enter a valid Indian phone number",
      }),
  })
    .xor("email", "phone")
    .messages({
      "object.xor": "Please provide either email or phone number",
    }),

  resetPassword: Joi.object({
    userId: Joi.string().required().messages({
      "string.empty": "User ID is required",
    }),
    newPassword: Joi.string()
      .min(8)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      )
      .required()
      .messages({
        "string.empty": "New password is required",
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "string.empty": "Confirm password is required",
        "any.only": "Passwords do not match",
      }),
  }),
};

const userSchema = new mongoose.Schema(
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
      required: function () {
        return !this.googleId;
      },
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "blocked", "inactive"],
      default: "active",
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    dailySearchCount: {
      type: Number,
      default: 0,
    },
    lastSearchDate: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          // Allow null values
          if (v === null) return true;
          // Check for YYYY-MM-DD format
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid date string in YYYY-MM-DD format!`,
      },
    },
    resetPasswordOtp: String,
    resetPasswordOtpExpiry: Date,
    profileUpdateOtp: String,
    profileUpdateOtpExpiry: Date,
    loginAttempts: {
      count: { type: Number, default: 0 },
      lastAttempt: Date,
      blockedUntil: Date,
    },
    googleId: {
      type: String,
      default: null,
    },
    profilePicture: {
      type: String,
    },
    extraSearches: {
      type: Number,
      default: 0,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe",
      },
    ],
    verificationOtp: String,
    verificationOtpExpiry: Date,
    preferences: {
      type: Object,
      default: {
        emailNotifications: true,
        twoFactorAuth: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
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

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts.count += 1;
  this.loginAttempts.lastAttempt = new Date();

  if (this.loginAttempts.count >= 5) {
    this.loginAttempts.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }

  await this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts.count = 0;
  this.loginAttempts.blockedUntil = undefined;
  await this.save();
};

const User = mongoose.model("User", userSchema);

export default User;
