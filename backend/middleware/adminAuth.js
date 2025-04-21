import jwt from "jsonwebtoken";
import { Admin } from "../models/index.js";

/**
 * Admin authentication middleware
 * This middleware verifies JWT tokens for admin users and attaches the admin to the request object
 * It is used to protect admin-only routes
 */
export const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    try {
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
      req.user = admin; // This is what some controllers may expect
      req.admin = admin; // Primary admin property

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
    });
  }
};
