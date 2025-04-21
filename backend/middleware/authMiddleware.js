import jwt from "jsonwebtoken";
import { User, Admin } from "../models/index.js";

// User authentication middleware
export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token, access denied",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Auth middleware - Decoded token:", decoded);

      const userId = decoded.id || decoded.userId;
      const user = await User.findById(userId).select("-password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user is blocked
      if (user.status === "blocked") {
        console.log(
          `Blocked user attempted to access protected route: ${user.email}`
        );
        return res.status(403).json({
          success: false,
          message:
            "Your account has been blocked by an administrator. Please contact support for assistance.",
        });
      }

      // Check if user is inactive (deactivated)
      if (user.status === "inactive") {
        console.log(
          `Inactive user attempted to access protected route: ${user.email}`
        );
        return res.status(403).json({
          success: false,
          message:
            "Your account has been deactivated. Please contact support to reactivate your account.",
        });
      }

      console.log("Auth middleware - User found:", {
        id: user._id,
        isSubscribed: user.isSubscribed,
      });

      req.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired",
        });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};

// Admin authentication middleware
export const adminProtect = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get admin from token
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check if admin is active
    if (admin.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Admin account is not active",
      });
    }

    // Attach admin to request object
    req.user = admin; // This is what the subscription controller expects
    req.admin = admin; // Keep this for backward compatibility

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};

// Admin role check middleware - use after adminProtect
export const admin = (req, res, next) => {
  try {
    // If adminProtect middleware has already set req.admin, we're good
    if (req.admin) {
      return next();
    }

    // Otherwise, check if the user has admin role
    if (req.user && req.user.role === "admin") {
      return next();
    }

    // If neither condition is met, deny access
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  } catch (error) {
    console.error("Error in admin middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in authorization",
    });
  }
};
