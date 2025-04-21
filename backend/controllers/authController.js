import { User, TempUser } from "../models/index.js";
import { generateToken } from "../utils/tokenUtils.js";
import {
  sendVerificationEmail,
  sendVerificationSMS,
} from "../utils/emailUtils.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/authUtils.js";
import userNotificationController from "./user/notificationController.js";

// Verify token endpoint
const verifyToken = async (req, res) => {
  try {
    // The user object is already attached to req by the protect middleware
    const user = req.user;

    // Return user data (excluding sensitive information)
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        // Include other non-sensitive user data
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Google authentication controller method
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    // Log the credential for debugging
    console.log(
      "Received Google credential:",
      credential.substring(0, 20) + "..."
    );

    // Return a success response for testing
    res.json({
      success: true,
      message: "Google authentication successful",
      data: {
        token: "test-token",
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
        },
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};

// Register controller
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, isGoogleSignup } = req.body;

    // For Google signup, phone is optional
    if (!isGoogleSignup && !phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required for manual registration",
      });
    }

    // Check if user exists in main User collection
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Check if user exists in TempUser collection
    const tempUserExists = await TempUser.findOne({ email });
    if (tempUserExists) {
      // If exists but OTP expired, update the OTP
      if (tempUserExists.otpExpiry < Date.now()) {
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        tempUserExists.otp = newOtp;
        tempUserExists.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await tempUserExists.save();

        // Send new OTP
        await sendVerificationEmail(email, newOtp);

        return res.status(200).json({
          success: true,
          message: "New OTP sent for verification",
          data: {
            userId: tempUserExists._id,
            email: tempUserExists.email,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: "Please verify your existing registration",
        data: {
          userId: tempUserExists._id,
          email: tempUserExists.email,
        },
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create temporary user
    const tempUser = new TempUser({
      name,
      email,
      phone,
      password,
      otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      isGoogleSignup,
    });

    await tempUser.save();

    // Send OTP via both channels if manual registration
    if (!isGoogleSignup) {
      // Send email OTP
      const emailSent = await sendVerificationEmail(email, otp);

      // Send SMS OTP
      const smsSent = await sendVerificationSMS(phone, otp);

      if (!emailSent && !smsSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send verification code. Please try again.",
        });
      }
    } else {
      // For Google signup, only send email
      await sendVerificationEmail(email, otp);
    }

    res.status(201).json({
      success: true,
      message:
        "Registration initiated! Please check your email for verification code.",
      data: {
        userId: tempUser._id,
        email: tempUser.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error registering user",
    });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { tempUserId, otp, isGoogleSignup } = req.body;

    console.log("Verifying OTP:", { tempUserId, otp, isGoogleSignup });

    // Find the temporary user
    const tempUser = await TempUser.findById(tempUserId);
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
    if (isGoogleSignup || tempUser.isGoogleSignup) {
      // For Google signup
      userData.googleId = tempUser.googleId;
      userData.profilePicture = tempUser.profilePicture;
    } else {
      // For manual signup
      userData.phone = tempUser.phone;
      userData.password = tempUser.password; // Already hashed in TempUser
    }

    console.log("Creating user with data:", userData);

    // Create the user
    const user = new User(userData);
    await user.save();
    console.log(`User created with ID: ${user._id}`);

    // Create welcome notification for the user
    try {
      await userNotificationController.createUserNotification({
        userId: user._id,
        title: "Welcome to YuMix!",
        message:
          "Thank you for joining. Explore recipes, save favorites and more!",
        type: "account",
        data: {
          timestamp: new Date(),
        },
      });
      console.log("Welcome notification created for user");
    } catch (notificationError) {
      // Just log the error but don't stop the registration process
      console.error("Error creating welcome notification:", notificationError);
    }

    // Notify all admins about new user signup
    try {
      // Get all active admins
      const { Admin } = await import("../models/index.js");
      const admins = await Admin.find({ status: "active" });

      // Import adminNotificationController
      const adminNotificationController = await import(
        "./admin/notificationController.js"
      ).then((module) => module.default);

      // Create notification for each admin
      for (const admin of admins) {
        await adminNotificationController.createAdminNotification({
          adminId: admin._id,
          title: "New User Registration",
          message: `New user registered: ${user.name} (${user.email})`,
          type: "user",
          data: {
            userId: user._id,
            name: user.name,
            email: user.email,
            signupMethod: isGoogleSignup ? "Google" : "Email",
            timestamp: new Date(),
          },
        });
      }
    } catch (notificationError) {
      // Just log the error but don't stop the registration process
      console.error("Error sending admin notifications:", notificationError);
    }

    // Delete the temporary user
    await TempUser.findByIdAndDelete(tempUserId);

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account has been verified and created successfully!",
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error verifying OTP",
    });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { tempUserId } = req.body;

    console.log("Resending OTP for user:", tempUserId);

    // Find the temporary user
    const tempUser = await TempUser.findById(tempUserId);
    if (!tempUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Update the OTP and expiry
    tempUser.otp = newOtp;
    tempUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await tempUser.save();

    // Send OTP via appropriate channels
    if (tempUser.isGoogleSignup) {
      // For Google signup, only send email
      await sendVerificationEmail(tempUser.email, newOtp);

      console.log("Resent OTP via email for Google signup");
    } else {
      // For manual signup, send both email and SMS
      const emailSent = await sendVerificationEmail(tempUser.email, newOtp);
      const smsSent = tempUser.phone
        ? await sendVerificationSMS(tempUser.phone, newOtp)
        : false;

      console.log("Resent OTP via email and SMS:", { emailSent, smsSent });

      if (!emailSent && !smsSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send verification code. Please try again.",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "New verification code sent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error resending verification code",
    });
  }
};

// Export all controllers
export default {
  verifyToken,
  googleAuth,
  register,
  verifyOTP,
  resendOTP,
  // ... other controllers
};
