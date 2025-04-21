import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

/**
 * User authentication middleware
 * This middleware verifies JWT tokens and attaches the user to the request object
 * It is used to protect routes that require authentication
 */
export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token found, return unauthorized error
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by ID and exclude password from the result
      const user = await User.findById(decoded.userId || decoded.id).select(
        "-password"
      );

      // If user not found, return error
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user is blocked
      if (user.status === "blocked") {
        return res.status(403).json({
          success: false,
          message:
            "Your account has been blocked. Please contact support for assistance.",
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      // Handle JWT verification errors
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token",
      });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
    });
  }
};
