import express from "express";
import authController from "../controllers/authController.js";
import userController from "../controllers/userController.js";
import {
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyOTP,
  validateResendOTP,
} from "../middleware/validationMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Authentication routes
router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, userController.login);
router.post("/verify-otp", validateVerifyOTP, authController.verifyOTP);
router.post("/resend-otp", validateResendOTP, authController.resendOTP);
router.post(
  "/forgot-password",
  validateForgotPassword,
  userController.forgotPassword
);
router.post(
  "/verify-reset-otp",
  validateVerifyOTP,
  userController.verifyResetOtp
);
router.post(
  "/reset-password",
  validateResetPassword,
  userController.resetPassword
);
router.post("/google-auth", userController.googleAuth);

// Refresh token
router.post("/refresh-token", userController.refreshToken);

// Logout
router.post("/logout", userController.logout);

// Unlock account route
router.post("/unlock-account", userController.unlockAccount);

// Add this route to your authRoutes.js
router.get("/verify", protect, (req, res) => {
  // If we get here, the token is valid and req.user is set
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        status: req.user.status,
      },
    },
  });
});

// Add this debugging route to your authRoutes.js
router.get("/debug-token", protect, (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Return detailed debug info
    res.json({
      success: true,
      tokenInfo: {
        userId: decoded.id,
        iat: decoded.iat,
        exp: decoded.exp,
        expiresIn: new Date(decoded.exp * 1000).toISOString(),
      },
      userInfo: {
        id: req.user._id.toString(),
        email: req.user.email,
        name: req.user.name,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token debugging failed",
      error: error.message,
    });
  }
});

// Google auth debug route
router.post("/google-auth-debug", userController.googleAuthDebug);

// Account reactivation routes
router.post("/request-reactivation-otp", userController.requestReactivationOTP);
router.post("/reactivate-account", userController.reactivateAccount);

// Profile routes (protected)
router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, userController.updateProfile);
router.post("/change-password", protect, userController.updatePassword);

export default router;
