import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User, TempUser, Favorite, Admin, Recipe } from "../models/index.js";
import { redisClient } from "../config/redisConfig.js";
import nodemailer from "nodemailer";
import twilio from "twilio";
import {
  handleFailedLogin,
  resetLoginAttempts,
  isAccountLocked,
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  invalidateRefreshToken,
  unlockAccount,
} from "../utils/authUtils.js";
import { OAuth2Client } from "google-auth-library";
import userNotificationController from "./user/notificationController.js";
import {
  sendVerificationEmail,
  sendVerificationSMS,
} from "../utils/emailUtils.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUtils.js";

dotenv.config();

// Initialize twilio client only if credentials are properly set
let twilioClient;
if (
  process.env.TWILIO_ACCOUNT_SID?.startsWith("AC") &&
  process.env.TWILIO_AUTH_TOKEN
) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP Error:", error);
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

// Format phone number helper
const formatPhoneNumber = (phone) => {
  if (!phone) return null; // Return null if phone is undefined

  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Add +91 prefix if needed
  if (!cleaned.startsWith("91")) {
    cleaned = "91" + cleaned;
  }

  return "+" + cleaned;
};

// Add at the top with other helper functions
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

const getEmailTemplate = (type, data) => {
  const templates = {
    reset: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset OTP</h2>
        <p>Hello ${data.name},</p>
        <p>Your password reset OTP is: <strong>${data.otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>YuMix Team</p>
      </div>
    `,
    registration: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to YuMix!</h2>
        <p>Hello ${data.name},</p>
        <p>Your registration OTP is: <strong>${data.otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>Best regards,<br>YuMix Team</p>
      </div>
    `,
    profileUpdate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Profile Update Verification</h2>
        <p>Hello ${data.name},</p>
        <p>Your profile update verification OTP is: <strong>${data.otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this change, please contact support immediately.</p>
        <p>Best regards,<br>YuMix Team</p>
      </div>
    `,
    googleSignup: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to YumiX!</h2>
        <p>Hello ${data.name},</p>
        <p>Your Google sign-up verification code is: <strong>${data.otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>Best regards,<br>YumiX Team</p>
      </div>
    `,
    reactivation: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Reactivation OTP</h2>
        <p>Hello ${data.name},</p>
        <p>Your account reactivation OTP is: <strong>${data.otp}</strong></p>
        <p>This OTP will expire in 30 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>YuMix Team</p>
      </div>
    `,
  };

  return templates[type] || "";
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!to || !subject || !html) {
      console.error("Email sending failed: Missing required parameters", {
        to,
        subject,
        html,
      });
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
};

const sendSMS = async ({ to, message }) => {
  try {
    if (!to || !message) {
      console.error("SMS sending failed: Missing required parameters", {
        to,
        message,
      });
      return false;
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(to);

    // Check if Twilio is properly configured
    if (!twilioClient) {
      console.error("Twilio client not initialized. Check your credentials.");
      return false;
    }

    // Log the attempt in development
    if (process.env.NODE_ENV === "development") {
      console.log("Sending SMS:", {
        to: formattedPhone,
        message,
        twilioConfigured: !!twilioClient,
      });
    }

    const result = await twilioClient.messages.create({
      body: message,
      to: formattedPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    console.log("SMS sent successfully:", {
      sid: result.sid,
      status: result.status,
      to: formattedPhone,
    });
    return true;
  } catch (error) {
    console.error("SMS sending failed:", {
      error: error.message,
      code: error.code,
      to,
      twilioError: error.twilioError,
    });
    return false;
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const userController = {
  // Register new user
  register: async (req, res) => {
    try {
      const { name, email, phone, password, referralCode } = req.body;

      // Check if email already exists in User or TempUser
      const emailExists = await Promise.all([
        User.findOne({ email }),
        TempUser.findOne({ email }),
      ]);

      if (emailExists[0] || emailExists[1]) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Format phone number for consistency
      const formattedPhone = formatPhoneNumber(phone);

      // Check if phone already exists in User or TempUser
      const phoneExists = await Promise.all([
        User.findOne({ phone: formattedPhone }),
        TempUser.findOne({ phone: formattedPhone }),
      ]);

      if (phoneExists[0] || phoneExists[1]) {
        return res.status(400).json({
          success: false,
          message: "Phone number is already registered",
        });
      }

      // If referral code is provided, verify it exists
      let referrerId = null;
      if (referralCode) {
        const referrer = await User.findOne({ referralCode });
        if (referrer) {
          referrerId = referrer._id;
        }
      }

      // Generate OTP
      const otp = generateOTP();

      // Create temporary user first
      const tempUser = new TempUser({
        name,
        email,
        phone: formattedPhone,
        password,
        otp: String(otp),
        otpExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
        referralCode: referralCode, // Store referral code
        referredBy: referrerId, // Store referrer ID if valid
      });

      // Save temp user first
      await tempUser.save();

      // Send OTP via email
      await sendEmail({
        to: email,
        subject: "YumiX - Verify your account",
        html: getEmailTemplate("registration", {
          name,
          otp,
        }),
      });

      // Send OTP via SMS
      await sendSMS({
        to: formattedPhone,
        message: `Your YuMix verification code is: ${otp}`,
      });

      res.status(201).json({
        success: true,
        userId: tempUser._id,
        message: "Registration successful. Please verify your email.",
      });
    } catch (error) {
      console.error("Registration Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Registration failed. Please try again.",
      });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { emailOrPhone, password } = req.body;

      if (!emailOrPhone || !password) {
        return res.status(400).json({
          success: false,
          message: "Email/phone and password are required",
        });
      }

      // Determine if input is email or phone
      const isEmail = emailOrPhone.includes("@");

      // Format phone number if needed
      let formattedPhone;
      if (!isEmail) {
        formattedPhone = formatPhoneNumber(emailOrPhone);
      }

      // Create query based on input type
      const query = isEmail
        ? { email: emailOrPhone }
        : { phone: formattedPhone };

      // Find user
      const user = await User.findOne(query);

      if (!user) {
        await handleFailedLogin(emailOrPhone);
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          message: "Please verify your account first",
        });
      }

      // Check if user is blocked
      if (user.status === "blocked") {
        console.log(`Login attempt by blocked user: ${user.email}`);
        return res.status(403).json({
          success: false,
          message:
            "Your account has been blocked by an administrator. Please contact support for assistance.",
        });
      }

      // Check if user account is deactivated
      if (user.status === "inactive") {
        console.log(`Login attempt by inactive user: ${user.email}`);
        return res.status(403).json({
          success: false,
          message:
            "Your account has been deactivated. Please contact support to reactivate your account.",
        });
      }

      // Check if account is locked
      const isLocked = await isAccountLocked(emailOrPhone);
      if (isLocked) {
        return res.status(401).json({
          success: false,
          message:
            "Account locked due to too many failed attempts. Try again later.",
        });
      }

      // Use bcryptjs for password comparison
      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(password, user.password);

        // If the password hash starts with $2a$ instead of $2b$, it may be from a different bcrypt implementation
        // Try to validate it with more lenient comparison
        if (!isMatch && user.password.startsWith("$2a$")) {
          // Check if the password meets requirements
          const passwordPattern =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          const passwordMeetsRequirements = passwordPattern.test(password);

          if (
            passwordMeetsRequirements &&
            process.env.NODE_ENV === "development"
          ) {
            isMatch = true;

            // Update the password hash to the correct format for future logins
            user.password = password; // This will trigger the pre-save hook with bcryptjs
            await user.save();
          }
        }
      } catch (error) {
        console.error("Password comparison error:", error);
      }

      // If the user was created with Google auth, they might not have a real password
      if (!isMatch && user.googleId && process.env.NODE_ENV === "development") {
        isMatch = true;
      }

      if (!isMatch) {
        await handleFailedLogin(emailOrPhone);
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Reset login attempts on successful login
      await resetLoginAttempts(emailOrPhone);

      // Generate tokens
      const token = generateAccessToken(user._id.toString());
      const refreshToken = await generateRefreshToken(user._id.toString());

      res.json({
        success: true,
        message: "Login successful",
        data: {
          token,
          refreshToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Login failed",
        error: error.message,
      });
    }
  },

  // Verify OTP
  verifyOTP: async (req, res) => {
    try {
      const { userId, otp } = req.body;

      // Find the temporary user
      const tempUser = await TempUser.findById(userId);
      if (!tempUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if OTP is expired
      if (tempUser.otpExpiry < Date.now()) {
        return res.status(400).json({
          success: false,
          message: "OTP has expired",
        });
      }

      // Verify OTP
      if (tempUser.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      // Create actual user with appropriate fields based on signup method
      const userData = {
        name: tempUser.name,
        email: tempUser.email,
        isVerified: true,
      };

      // Add fields based on signup method
      if (tempUser.isGoogleSignup) {
        // For Google signup
        userData.googleId = tempUser.googleId;
        userData.profilePicture = tempUser.profilePicture;
      } else {
        // For manual signup
        userData.phone = tempUser.phone;
        userData.password = tempUser.password; // Already hashed in TempUser
        userData.referralCode = tempUser.referralCode;
        userData.referredBy = tempUser.referredBy;
      }

      // Create the user
      const user = new User(userData);
      await user.save();

      // If there's a referrer, update their referrals
      if (tempUser.referredBy) {
        await User.findByIdAndUpdate(tempUser.referredBy, {
          $push: { referrals: user._id },
        });

        // Create referral record if needed
        // ...
      }

      // Delete temporary user
      await TempUser.findByIdAndDelete(userId);

      // Generate token
      const token = generateAccessToken(user._id.toString());

      res.status(200).json({
        success: true,
        message: "Account verified successfully",
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
        },
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error verifying OTP",
      });
    }
  },

  // Resend OTP
  resendOTP: async (req, res) => {
    try {
      const { tempUserId } = req.body;

      const tempUser = await TempUser.findById(tempUserId);
      if (!tempUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate new OTP
      const otp = generateOTP();
      tempUser.otp = otp;
      tempUser.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await tempUser.save();

      // Send OTP via email
      if (tempUser.email) {
        await sendEmail({
          to: tempUser.email,
          subject: "YumiX - Verify your account",
          html: getEmailTemplate("registration", {
            name: tempUser.name,
            otp,
          }),
        });
      }

      // Send OTP via SMS if phone exists
      if (tempUser.phone) {
        const formattedPhone = formatPhoneNumber(tempUser.phone);
        if (formattedPhone) {
          await sendSMS({
            to: formattedPhone,
            message: `Your new YuMix verification code is: ${otp}`,
          });
        }
      }

      res.json({
        success: true,
        message: "OTP sent successfully",
      });
    } catch (error) {
      console.error("Resend OTP Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");

      // Create a response object with user data
      const userData = user.toObject();

      // Ensure both profileImage and profilePicture fields exist for frontend compatibility
      if (userData.profilePicture && !userData.profileImage) {
        userData.profileImage = userData.profilePicture;
      }

      res.status(200).json({
        success: true,
        data: userData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching profile",
        error: error.message,
      });
    }
  },

  // Get user's favorite recipes
  getFavorites: async (req, res) => {
    try {
      const userId = req.user._id;

      // Get user with populated subscription and favorites - FIX: Use subscriptionId instead of subscription.plan
      const user = await User.findById(userId)
        .populate({
          path: "subscriptionId",
          select: "planType expiryDate",
        })
        .populate("favorites");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Set favorites limit based on plan type
      let maxFavorites = 5; // Default for free users
      let planName = "Free";

      // Check if user has active subscription
      const now = new Date();
      const hasActiveSubscription =
        user.subscriptionId &&
        user.isSubscribed &&
        new Date(user.subscriptionId.expiryDate) > now;

      if (hasActiveSubscription) {
        const planNameLower = user.subscriptionId.planType?.toLowerCase() || "";

        if (planNameLower.includes("basic")) {
          maxFavorites = 20;
          planName = "Basic";
        } else if (planNameLower.includes("premium")) {
          maxFavorites = 50;
          planName = "Premium";
        } else if (planNameLower.includes("pro")) {
          maxFavorites = 100;
          planName = "Pro";
        }
      }

      // Current favorites count
      const currentFavoritesCount = user.favorites ? user.favorites.length : 0;

      res.status(200).json({
        success: true,
        data: user.favorites || [],
        limits: {
          current: currentFavoritesCount,
          max: maxFavorites,
          remaining: Math.max(0, maxFavorites - currentFavoritesCount),
          plan: planName,
        },
      });
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching favorites",
        error: error.message,
      });
    }
  },

  // Add recipe to favorites with plan-based limits
  addFavorite: async (req, res) => {
    try {
      const userId = req.user._id;
      const { recipeId } = req.params;

      // Get user with populated subscription plan - FIX: Use subscriptionId
      const user = await User.findById(userId).populate({
        path: "subscriptionId",
        select: "planType expiryDate",
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get current favorites count
      const currentFavoritesCount = user.favorites ? user.favorites.length : 0;

      // Set favorites limit based on plan type:
      // - Free: 5 favorites max
      // - Basic: 20 favorites max
      // - Premium: 50 favorites max
      // - Pro: 100 favorites max
      let maxFavorites = 5; // Default for free users
      let planName = "Free";

      // Check if user has active subscription
      const now = new Date();
      const hasActiveSubscription =
        user.subscriptionId &&
        user.isSubscribed &&
        new Date(user.subscriptionId.expiryDate) > now;

      if (hasActiveSubscription) {
        const planNameLower = user.subscriptionId.planType?.toLowerCase() || "";

        if (planNameLower.includes("basic")) {
          maxFavorites = 20;
          planName = "Basic";
        } else if (planNameLower.includes("premium")) {
          maxFavorites = 50;
          planName = "Premium";
        } else if (planNameLower.includes("pro")) {
          maxFavorites = 100;
          planName = "Pro";
        }
      }

      // Check if user has reached the favorites limit
      if (currentFavoritesCount >= maxFavorites) {
        return res.status(400).json({
          success: false,
          message: `You've reached your favorites limit (${maxFavorites}). Upgrade your plan to add more recipes!`,
          limit: maxFavorites,
          current: currentFavoritesCount,
          plan: planName,
        });
      }

      // Check if recipe is already in favorites
      if (user.favorites && user.favorites.includes(recipeId)) {
        return res.status(400).json({
          success: false,
          message: "Recipe is already in favorites",
        });
      }

      // Add to favorites
      if (!user.favorites) {
        user.favorites = [];
      }
      user.favorites.push(recipeId);
      await user.save();

      // Return success response with remaining slots
      res.status(200).json({
        success: true,
        message: "Recipe added to favorites",
        remaining: maxFavorites - (currentFavoritesCount + 1),
        limit: maxFavorites,
        plan: planName,
      });
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add recipe to favorites",
        error: error.message,
      });
    }
  },

  // Remove recipe from favorites
  removeFavorite: async (req, res) => {
    try {
      const userId = req.user._id;
      const { recipeId } = req.params;

      // Get user with populated subscription plan - FIX: Use subscriptionId
      const user = await User.findById(userId).populate({
        path: "subscriptionId",
        select: "planType expiryDate",
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if recipe is in favorites
      if (!user.favorites || !user.favorites.includes(recipeId)) {
        return res.status(404).json({
          success: false,
          message: "Recipe not found in favorites",
        });
      }

      // Set favorites limit based on plan type
      let maxFavorites = 5; // Default for free users
      let planName = "Free";

      // Check if user has active subscription
      const now = new Date();
      const hasActiveSubscription =
        user.subscriptionId &&
        user.isSubscribed &&
        new Date(user.subscriptionId.expiryDate) > now;

      if (hasActiveSubscription) {
        const planNameLower = user.subscriptionId.planType?.toLowerCase() || "";

        if (planNameLower.includes("basic")) {
          maxFavorites = 20;
          planName = "Basic";
        } else if (planNameLower.includes("premium")) {
          maxFavorites = 50;
          planName = "Premium";
        } else if (planNameLower.includes("pro")) {
          maxFavorites = 100;
          planName = "Pro";
        }
      }

      // Remove from favorites
      user.favorites = user.favorites.filter(
        (id) => id.toString() !== recipeId.toString()
      );
      await user.save();

      // Get updated favorites count
      const currentFavoritesCount = user.favorites.length;

      res.status(200).json({
        success: true,
        message: "Recipe removed from favorites",
        remaining: maxFavorites - currentFavoritesCount,
        limit: maxFavorites,
        current: currentFavoritesCount,
        plan: planName,
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove recipe from favorites",
        error: error.message,
      });
    }
  },

  // Forgot Password - Step 1: Send OTP
  forgotPassword: async (req, res) => {
    try {
      const { emailOrPhone } = req.body;

      // Format phone number if needed
      let formattedPhone = emailOrPhone;
      if (!emailOrPhone.includes("@")) {
        formattedPhone = emailOrPhone.startsWith("+91")
          ? emailOrPhone
          : `+91${formattedPhone}`;
      }

      // Find user by email or phone
      const user = await User.findOne({
        $or: [{ email: emailOrPhone }, { phone: formattedPhone }],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No account found with this email/phone",
        });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Save OTP to user
      user.resetPasswordOtp = otp;
      user.resetPasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      // Track success status of notifications
      let emailSent = false;
      let smsSent = false;

      // Try to send email notification regardless of input type
      if (user.email) {
        emailSent = await sendVerificationEmail(user.email, otp);
      }

      // Try to send SMS notification regardless of input type
      if (user.phone) {
        smsSent = await sendVerificationSMS(user.phone, otp);
      }

      // Check if at least one notification method worked
      if (!emailSent && !smsSent) {
        // If in development, still return the OTP
        if (process.env.NODE_ENV === "development") {
          return res.status(200).json({
            success: true,
            message:
              "Notification sending failed, but here's your OTP for development",
            userId: user._id,
            devOtp: otp,
          });
        }

        return res.status(500).json({
          success: false,
          message:
            "Failed to send verification notifications. Please try again.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Password reset instructions sent",
        userId: user._id,
        // Still include the OTP in development mode
        devOtp: process.env.NODE_ENV === "development" ? otp : undefined,
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Error processing request",
      });
    }
  },

  // Verify reset password OTP
  verifyResetOtp: async (req, res) => {
    try {
      const { contact, otp } = req.body;

      // Find user by email or phone
      const user = await User.findOne({
        $or: [{ email: contact }, { phone: contact }],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify OTP
      if (user.resetPasswordOtp !== String(otp)) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      // Check if OTP is expired
      if (Date.now() > user.resetPasswordOtpExpiry) {
        return res.status(400).json({
          success: false,
          message: "OTP has expired. Please request a new one.",
        });
      }

      // Clear the OTP after successful verification
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpiry = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        userId: user._id,
      });
    } catch (error) {
      console.error("Reset OTP Verification Error:", error);
      res.status(500).json({
        success: false,
        message: "Error verifying OTP",
        error: error.message,
      });
    }
  },

  // Reset password
  resetPassword: async (req, res) => {
    try {
      const { userId, newPassword, confirmPassword } = req.body;

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Passwords do not match",
        });
      }

      // Find user and update password
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      console.error("Reset Password Error:", error);
      res.status(500).json({
        success: false,
        message: "Error resetting password",
        error: error.message,
      });
    }
  },

  // Update profile with OTP verification
  updateProfileWithOTP: async (req, res) => {
    try {
      const {
        type,
        email,
        phone,
        otp,
        sendToNew,
        currentPassword,
        newPassword,
        confirmPassword,
      } = req.body;
      const userId = req.user.id;

      console.log("Update profile with OTP request:", {
        userId,
        type,
        email: email ? "provided" : "not provided",
        phone: phone ? "provided" : "not provided",
        passwordChange: type === "password" ? "requested" : "not requested",
        otp: otp ? "provided" : "not provided",
        sendToNew,
      });

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Format new phone number if provided
      const formattedPhone = phone ? formatPhoneNumber(phone) : undefined;

      // First verify if OTP exists and is valid
      const storedOTP = await redisClient.get(`profileOTP:${userId}`);
      console.log("Stored OTP:", storedOTP);
      console.log("Provided OTP:", otp);

      if (!storedOTP || storedOTP !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      // Delete OTP after successful verification
      await redisClient.del(`profileOTP:${userId}`);

      // Update profile based on the type
      const updateData = {};

      if (type === "email" && email) {
        updateData.email = email;
      } else if (type === "phone" && formattedPhone) {
        updateData.phone = formattedPhone;
      } else if (type === "password") {
        // Verify current password
        if (!currentPassword || !newPassword || !confirmPassword) {
          return res.status(400).json({
            success: false,
            message: "All password fields are required",
          });
        }

        if (newPassword !== confirmPassword) {
          return res.status(400).json({
            success: false,
            message: "New passwords do not match",
          });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
          });
        }

        // Set new password
        user.password = newPassword; // Will be hashed by pre-save hook
        await user.save();

        return res.status(200).json({
          success: true,
          message: "Password updated successfully",
        });
      }

      if (req.body.name) {
        updateData.name = req.body.name;
      }

      console.log("Updating user profile with:", updateData);

      // Only update if there are fields to update
      if (Object.keys(updateData).length > 0) {
        // Update profile
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
          new: true,
        }).select("-password");

        // Create a response object with updated user data
        const userData = updatedUser.toObject();

        // Ensure both profileImage and profilePicture fields exist for frontend compatibility
        if (userData.profilePicture && !userData.profileImage) {
          userData.profileImage = userData.profilePicture;
        }

        res.status(200).json({
          success: true,
          message: `Profile ${type} updated successfully`,
          data: userData,
        });
      } else {
        // Create a response object with user data
        const userData = user.toObject();
        delete userData.password;

        // Ensure both profileImage and profilePicture fields exist for frontend compatibility
        if (userData.profilePicture && !userData.profileImage) {
          userData.profileImage = userData.profilePicture;
        }

        res.status(200).json({
          success: true,
          message: "No profile changes were made",
          data: userData,
        });
      }
    } catch (error) {
      console.error("Error updating profile with OTP:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error: error.message,
      });
    }
  },

  // Request OTP for profile update
  requestProfileUpdateOTP: async (req, res) => {
    try {
      const userId = req.user.id;
      const { type, newValue, sendToNew } = req.body;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      console.log("Profile update OTP request:", {
        userId,
        type,
        newValue,
        sendToNew,
        currentEmail: user.email,
        currentPhone: user.phone,
      });

      // Generate OTP
      const otp = generateOTP();

      // Store OTP in Redis
      await redisClient.set(`profileOTP:${userId}`, String(otp), {
        EX: 600, // 10 minutes expiry
      });

      // Determine where to send the OTP based on the type and sendToNew parameter
      const emailToUse =
        type === "password"
          ? user.email // Always send to current email for password changes
          : type === "email" && sendToNew && newValue
          ? newValue
          : user.email;

      const phoneToUse =
        type === "phone" && sendToNew && newValue ? newValue : user.phone;

      console.log(
        `Sending OTP to ${
          type === "password" ? "email" : type === "email" ? "email" : "phone"
        }: ${type === "password" || type === "email" ? emailToUse : phoneToUse}`
      );

      // Send OTP via email and SMS
      let emailSent = false;
      try {
        await transporter.sendMail({
          from: {
            name: "YumiX Support",
            address: process.env.EMAIL_USER,
          },
          to: emailToUse,
          subject: "YumiX - Profile Update Verification",
          html: getEmailTemplate("profileUpdate", {
            name: user.name,
            otp,
          }),
        });
        emailSent = true;
        console.log(`Successfully sent OTP email to: ${emailToUse}`);
      } catch (error) {
        console.log("Email sending failed:", error.message);
      }

      let smsSent = false;
      // Only attempt SMS for phone verification if we're using a phone number
      if (twilioClient && type === "phone") {
        try {
          await twilioClient.messages.create({
            body: `Your YumiX profile update verification code is: ${otp}`,
            to: phoneToUse,
            from: process.env.TWILIO_PHONE_NUMBER,
          });
          smsSent = true;
          console.log(`Successfully sent OTP SMS to: ${phoneToUse}`);
        } catch (error) {
          console.log("SMS sending failed:", error.message);
        }
      }

      if (!emailSent && !smsSent) {
        // If email was sent but SMS failed, don't treat it as an error
        if (emailSent) {
          res.status(200).json({
            success: true,
            message: "OTP sent successfully via email",
            notificationsSent: {
              email: true,
              sms: false,
            },
          });
        } else {
          return res.status(500).json({
            success: false,
            message: "Failed to send OTP via any method",
          });
        }
      } else {
        res.status(200).json({
          success: true,
          message: "OTP sent successfully",
          notificationsSent: {
            email: emailSent,
            sms: smsSent,
          },
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error sending profile update OTP",
        error: error.message,
      });
    }
  },

  // Google authentication
  googleAuth: async (req, res) => {
    try {
      console.log(
        "Google auth request body:",
        JSON.stringify(req.body, null, 2)
      );

      const { token, profileObj } = req.body;

      if (!token || !profileObj) {
        console.log("Missing data:", {
          hasToken: !!token,
          hasProfileObj: !!profileObj,
        });

        return res.status(400).json({
          success: false,
          message: "Google authentication data is incomplete",
        });
      }

      const { email, name, googleId } = profileObj;

      if (!email || !name || !googleId) {
        console.log("Missing profile data:", {
          hasEmail: !!email,
          hasName: !!name,
          hasGoogleId: !!googleId,
        });

        return res.status(400).json({
          success: false,
          message: "Google profile data is incomplete",
        });
      }

      // Check if user already exists in main User collection
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        // Check if user is blocked
        if (existingUser.status === "blocked") {
          console.log(
            `Google login attempt by blocked user: ${existingUser.email}`
          );
          return res.status(403).json({
            success: false,
            message:
              "Your account has been blocked by an administrator. Please contact support for assistance.",
          });
        }

        // Check if user account is deactivated
        if (existingUser.status === "inactive") {
          console.log(
            `Google login attempt by inactive user: ${existingUser.email}`
          );
          return res.status(403).json({
            success: false,
            message:
              "Your account has been deactivated. Please contact support to reactivate your account.",
          });
        }

        // User exists, generate token and return
        const token = generateAccessToken(existingUser._id.toString());

        return res.json({
          success: true,
          message: "Google login successful",
          data: {
            token,
            user: {
              id: existingUser._id,
              name: existingUser.name,
              email: existingUser.email,
            },
          },
        });
      }

      // Check if there's a temporary user with this email
      const existingTempUser = await TempUser.findOne({ email });

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      let tempUser;

      if (existingTempUser) {
        // Update the existing temporary user
        existingTempUser.otp = otp;
        existingTempUser.otpExpiry = otpExpiry;
        existingTempUser.isGoogleSignup = true;
        existingTempUser.googleId = googleId;

        tempUser = await existingTempUser.save();
        console.log("Updated existing temporary user for Google signup");
      } else {
        // Create a new temporary user
        tempUser = new TempUser({
          name,
          email,
          googleId,
          isGoogleSignup: true,
          otp,
          otpExpiry,
        });

        await tempUser.save();
        console.log("Created new temporary user for Google signup");
      }

      // Send verification email
      await sendVerificationEmail(email, otp);

      return res.status(200).json({
        success: true,
        message: "Please verify your email to complete Google signup",
        data: {
          userId: tempUser._id,
          email: tempUser.email,
        },
      });
    } catch (error) {
      console.error("Google Auth Error:", error);

      // Handle duplicate key error more gracefully
      if (error.code === 11000 && error.keyPattern?.email) {
        return res.status(409).json({
          success: false,
          message: "This email is already registered. Please try logging in.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Google authentication failed",
      });
    }
  },

  // Add refresh token endpoint
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      // Validate and refresh the token
      const result = await refreshAccessToken(refreshToken);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message || "Invalid refresh token",
        });
      }

      res.json({
        success: true,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      console.error("Refresh Token Error:", error);
      res.status(500).json({
        success: false,
        message: "Error refreshing token",
        error: error.message,
      });
    }
  },

  // Add logout endpoint
  logout: async (req, res) => {
    try {
      const { userId } = req.body;

      if (userId) {
        await invalidateRefreshToken(userId);
      }

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout Error:", error);
      res.status(500).json({
        success: false,
        message: "Error during logout",
      });
    }
  },

  // Update user profile (without sensitive fields)
  updateProfile: async (req, res) => {
    try {
      const { name, bio, preferences } = req.body;
      const userId = req.user.id;

      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update non-sensitive fields that don't require OTP verification
      const updatedFields = {};
      if (name) updatedFields.name = name;
      if (bio !== undefined) updatedFields.bio = bio;

      // Handle preferences object for user settings
      if (preferences) {
        if (!user.preferences) {
          user.preferences = {};
        }

        // Update only the provided preference fields
        user.preferences = {
          ...user.preferences,
          ...preferences,
        };
      }

      // Update the user
      Object.assign(user, updatedFields);
      await user.save();

      const userData = user.toObject();
      delete userData.password;

      // Ensure both profileImage and profilePicture fields exist for frontend compatibility
      if (userData.profilePicture && !userData.profileImage) {
        userData.profileImage = userData.profilePicture;
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: userData,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error: error.message,
      });
    }
  },

  // Upload profile image
  updateProfileImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const userId = req.user.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Delete old image from Cloudinary if it exists
      if (user.profilePicture && user.profilePicture.includes("cloudinary")) {
        try {
          const publicId = user.profilePicture.split("/").pop().split(".")[0];
          await deleteFromCloudinary(publicId);
        } catch (cloudinaryError) {
          console.error(
            "Error deleting old image from Cloudinary:",
            cloudinaryError
          );
          // Continue with the upload even if deletion fails
        }
      }

      // Upload new image to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, "users/profile");

      // Update user with new image URL
      user.profilePicture = result.url;
      await user.save();

      console.log(
        "Updated user profile image with Cloudinary URL:",
        result.url
      );

      res.status(200).json({
        success: true,
        message: "Profile image updated successfully",
        data: {
          profileImage: result.url, // Keep for frontend compatibility
          profilePicture: result.url, // Actual field name in the database
        },
      });
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile image",
        error: error.message,
      });
    }
  },

  // Update password
  updatePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.id;

      // Validate password match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "New passwords do not match",
        });
      }

      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if current password is correct
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Update the password
      user.password = newPassword; // Hashing is handled by the pre-save hook in the model
      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating password",
        error: error.message,
      });
    }
  },

  // Simple debug endpoint for Google auth
  googleAuthDebug: async (req, res) => {
    try {
      console.log("Google auth debug request received:", req.body);

      // Return success to confirm the endpoint is working
      res.status(200).json({
        success: true,
        message: "Google auth debug endpoint working",
        receivedData: {
          hasToken: !!req.body.token,
          hasProfileObj: !!req.body.profileObj,
          profileData: req.body.profileObj
            ? {
                hasEmail: !!req.body.profileObj.email,
                hasName: !!req.body.profileObj.name,
                hasGoogleId: !!req.body.profileObj.googleId,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Google Auth Debug Error:", error);
      res.status(500).json({
        success: false,
        message: "Error in debug endpoint",
        error: error.message,
      });
    }
  },

  // Unlock account
  unlockAccount: async (req, res) => {
    try {
      const { emailOrPhone } = req.body;

      if (!emailOrPhone) {
        return res.status(400).json({
          success: false,
          message: "Email or phone is required",
        });
      }

      const success = await unlockAccount(emailOrPhone);

      if (success) {
        return res.status(200).json({
          success: true,
          message: "Account unlocked successfully",
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to unlock account",
        });
      }
    } catch (error) {
      console.error("Unlock account error:", error);
      res.status(500).json({
        success: false,
        message: "Error unlocking account",
        error: error.message,
      });
    }
  },

  // Development-only login function for testing
  devLogin: async (req, res) => {
    try {
      // Only available in development mode
      if (process.env.NODE_ENV !== "development") {
        return res.status(404).json({
          success: false,
          message: "Endpoint not found",
        });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Try to find the user by email
      let user = await User.findOne({ email });

      // If no user found, check temp users
      if (!user) {
        const tempUser = await TempUser.findOne({ email });
        if (tempUser) {
          return res.status(401).json({
            success: false,
            message:
              "User exists but is not verified. Please verify your account first.",
          });
        }

        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate tokens
      const token = generateAccessToken(user._id.toString());
      const refreshToken = await generateRefreshToken(user._id.toString());

      // Remove sensitive fields before sending
      const userToReturn = {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        isSubscribed: user.isSubscribed,
        profilePicture: user.profilePicture,
        referralCode: user.referralCode,
      };

      res.json({
        success: true,
        message: "Developer login successful",
        data: {
          token,
          refreshToken,
          user: userToReturn,
        },
      });
    } catch (error) {
      console.error("Developer login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  // Debug password for a specific user (DEVELOPMENT ONLY)
  debugPassword: async (req, res) => {
    try {
      // Only available in development mode
      if (process.env.NODE_ENV !== "development") {
        return res.status(404).json({
          success: false,
          message: "Endpoint not found",
        });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get password hash info
      const hashInfo = {
        passwordHash: user.password,
        hashType: user.password.substring(0, 4),
        hashLength: user.password.length,
      };

      // Try bcryptjs
      let bcryptjsMatch = false;
      try {
        bcryptjsMatch = await bcrypt.compare(password, user.password);
      } catch (err) {
        console.error("bcryptjs error:", err);
      }

      // Response with detailed info
      res.json({
        success: true,
        message: "Debug info retrieved",
        hashInfo,
        compareResults: {
          bcryptjs: bcryptjsMatch,
        },
        // If the password doesn't match at all, we'll create a new hash and return it
        // You can manually update this in the database if needed
        newHash: !bcryptjsMatch ? await bcrypt.hash(password, 10) : null,
      });
    } catch (error) {
      console.error("Debug password error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  // Direct password update for development
  directUpdatePassword: async (req, res) => {
    try {
      // Only available in development mode
      if (process.env.NODE_ENV !== "development") {
        return res.status(404).json({
          success: false,
          message: "Endpoint not found",
        });
      }

      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Email and new password are required",
        });
      }

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate hash directly
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Get password hash info (before update)
      const oldHashInfo = {
        passwordHash: user.password,
        hashType: user.password.substring(0, 4),
        hashLength: user.password.length,
      };

      // Update password directly
      user.password = hashedPassword;
      await user.save();

      // Get new hash info
      const newHashInfo = {
        passwordHash: hashedPassword,
        hashType: hashedPassword.substring(0, 4),
        hashLength: hashedPassword.length,
      };

      // Response with updated info
      res.json({
        success: true,
        message: "Password updated successfully",
        oldHashInfo,
        newHashInfo,
      });
    } catch (error) {
      console.error("Direct password update error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  // Get user activity statistics
  getActivityStats: async (req, res) => {
    try {
      const userId = req.user.id;

      // Get user favorites count
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const savedRecipes = user.favorites ? user.favorites.length : 0;

      // Get recipe view history count from RecipeHistory collection
      // This is more accurate than checking Recipe.viewedBy
      const { RecipeHistory } = await import("../models/index.js");
      const viewedRecipesCount = await RecipeHistory.countDocuments({
        user: userId,
      });

      console.log(
        `User ${userId} has viewed ${viewedRecipesCount} recipes according to RecipeHistory`
      );

      // Get search history count from dailySearchCount
      const searchesMade = user.dailySearchCount || 0;

      res.status(200).json({
        success: true,
        data: {
          savedRecipes,
          viewedRecipes: viewedRecipesCount,
          searchesMade,
        },
      });
    } catch (error) {
      console.error("Error fetching activity stats:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching activity statistics",
        error: error.message,
      });
    }
  },

  // Deactivate user account (renamed from deleteAccount)
  deleteAccount: async (req, res) => {
    try {
      const userId = req.user.id;

      // Find the user
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Instead of deleting, set status to inactive
      user.status = "inactive";

      // You could also anonymize some personal data here if needed
      // For example: user.name = "Deactivated User";

      // Save the updated user
      await user.save();

      // Invalidate any existing sessions/tokens
      await invalidateRefreshToken(userId);

      res.status(200).json({
        success: true,
        message:
          "Account deactivated successfully. You can reactivate it by contacting support.",
      });
    } catch (error) {
      console.error("Error deactivating account:", error);
      res.status(500).json({
        success: false,
        message: "Error deactivating account",
        error: error.message,
      });
    }
  },

  // Update user's phone number (specifically for payment purposes)
  updatePhoneForPayment: async (req, res) => {
    try {
      const { phone } = req.body;
      const userId = req.user.id;

      // Validate phone number format (Indian format)
      const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid phone number",
        });
      }

      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update phone number
      user.phone = phone;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Phone number updated successfully",
      });
    } catch (error) {
      console.error("Phone update error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating phone number",
        error: error.message,
      });
    }
  },

  // Request OTP for account reactivation
  requestReactivationOTP: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Find user by email
      const user = await User.findOne({ email, status: "inactive" });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found or account is not deactivated",
        });
      }

      // Generate OTP
      const otp = generateOTP();

      // Set OTP expiry (30 minutes)
      user.verificationOtp = otp;
      user.verificationOtpExpiry = new Date(Date.now() + 30 * 60 * 1000);

      await user.save();

      // Send email with OTP
      try {
        await sendEmail({
          to: email,
          subject: "Account Reactivation OTP",
          html: getEmailTemplate("reactivation", {
            name: user.name,
            otp: otp,
          }),
        });
      } catch (emailError) {
        console.error("Error sending reactivation OTP email:", emailError);
        // We'll still return success since the OTP was generated, even if the email failed
      }

      return res.status(200).json({
        success: true,
        message: "Reactivation OTP has been sent to your email",
      });
    } catch (error) {
      console.error("Error in requestReactivationOTP:", error);
      return res.status(500).json({
        success: false,
        message: "Error sending reactivation OTP",
        error: error.message,
      });
    }
  },

  // Reactivate a deactivated account
  reactivateAccount: async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      // Find user by email
      const user = await User.findOne({ email, status: "inactive" });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found or account is not deactivated",
        });
      }

      // Verify OTP
      if (
        !user.verificationOtp ||
        user.verificationOtp !== otp ||
        !user.verificationOtpExpiry ||
        new Date() > user.verificationOtpExpiry
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      // Reactivate the account
      user.status = "active";

      // Clear the OTP fields
      user.verificationOtp = null;
      user.verificationOtpExpiry = null;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Your account has been reactivated successfully",
      });
    } catch (error) {
      console.error("Error in reactivateAccount:", error);
      return res.status(500).json({
        success: false,
        message: "Error reactivating account",
        error: error.message,
      });
    }
  },
};

export default userController;
