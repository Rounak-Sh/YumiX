import {
  Admin,
  User,
  AdminRecipe,
  Subscription,
  Payment,
  SubscriptionPlan,
  Recipe,
} from "../models/index.js";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import axios from "axios";
import bcrypt from "bcryptjs";
import { adminValidation } from "../models/adminModel.js";
import transporter from "../config/emailConfig.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUtils.js";
import adminNotificationController from "./admin/notificationController.js";
import { redisClient, safeRedisOperation } from "../config/redisConfig.js";
import CashfreeService from "../services/cashfreeService.js";
import userNotificationController from "./user/notificationController.js";

const SPOONACULAR_BASE_URL = "https://api.spoonacular.com/recipes";

// Initialize Cashfree service for admin operations
const cashfreeService = new CashfreeService();

const adminController = {
  // Admin login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Debug log to see what's being received
      console.log("\n=== Login Attempt ===");
      console.log("Email:", email);

      // First check if this email belongs to a user
      const user = await User.findOne({ email });
      if (user) {
        console.log("Email belongs to user account");
        return res.status(403).json({
          success: false,
          message:
            "This email is registered for user login. Please use the user login page.",
        });
      }

      // Find admin by email
      const admin = await Admin.findOne({ email });
      console.log("\nAdmin Account Status:");
      console.log("Found:", !!admin);
      console.log(
        "Login Attempts:",
        JSON.stringify(admin?.loginAttempts, null, 2)
      );
      console.log("Current Time:", new Date().toISOString());

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin account not found",
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        console.log("\nInvalid password attempt");

        // Increment attempt count
        admin.loginAttempts.count += 1;
        admin.loginAttempts.lastAttempt = new Date();

        if (admin.loginAttempts.count >= 5) {
          admin.loginAttempts.blockedUntil = new Date(
            Date.now() + 15 * 60 * 1000
          );
          console.log(
            "\nAccount blocked:",
            JSON.stringify(admin.loginAttempts, null, 2)
          );

          // Send email notification for account block
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: admin.email,
            subject: "YuMix Admin - Account Security Alert",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Security Alert</h2>
                <p>Multiple failed login attempts detected on your YuMix admin account.</p>
                <p>Your account has been temporarily blocked for 15 minutes.</p>
                <p>If this wasn't you, please change your password immediately.</p>
                <p>Time: ${new Date().toLocaleString()}</p>
                <p>IP: ${req.ip}</p>
              </div>
            `,
          });
        } else if (admin.loginAttempts.count >= 3) {
          // Send warning email after 3 failed attempts
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: admin.email,
            subject: "YuMix Admin - Login Security Warning",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Security Warning</h2>
                <p>Multiple failed login attempts detected on your YuMix admin account.</p>
                <p>Failed Attempts: ${admin.loginAttempts.count}</p>
                <p>Time: ${new Date().toLocaleString()}</p>
                <p>IP: ${req.ip}</p>
                <p>If this wasn't you, please change your password.</p>
              </div>
            `,
          });
        }

        await admin.save();

        if (admin.loginAttempts.blockedUntil) {
          return res.status(403).json({
            success: false,
            message:
              "Too many failed attempts. Account blocked for 15 minutes.",
          });
        }

        return res.status(401).json({
          success: false,
          message: `Invalid password. ${
            5 - admin.loginAttempts.count
          } attempts remaining.`,
        });
      }

      // Reset login attempts on successful login
      admin.loginAttempts = {
        count: 0,
        lastAttempt: null,
        blockedUntil: null,
      };
      await admin.save();

      console.log("\nPassword verified successfully");

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Save OTP to admin document
      admin.otp = otp;
      admin.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await admin.save();

      // Send OTP email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "YuMix Admin Login OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>YuMix Admin Login Verification</h2>
            <p>Your OTP for admin login is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 5 minutes.</p>
            <p>If you didn't request this OTP, please ignore this email.</p>
          </div>
        `,
      });

      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
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

  verifyOtp: async (req, res) => {
    try {
      const { email, otp } = req.body;

      console.log("\n=== OTP Verification Attempt ===");
      console.log("Email:", email);
      console.log("OTP Provided:", otp);

      const admin = await Admin.findOne({ email });
      if (!admin) {
        console.log("Admin not found for email:", email);
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      console.log("Admin OTP Status:");
      console.log("Stored OTP:", admin.otp);
      console.log("OTP Expiry:", admin.otpExpiry);
      console.log("Current Time:", new Date());

      // Check if OTP exists and is valid
      if (!admin.otp) {
        console.log("No OTP found in admin record");
        return res.status(400).json({
          success: false,
          message: "No OTP was sent. Please request a new one.",
        });
      }

      // Check if OTP has expired
      if (!admin.otpExpiry || Date.now() > admin.otpExpiry.getTime()) {
        console.log("OTP has expired. Current time:", new Date());
        console.log("OTP expiry time:", admin.otpExpiry);
        return res.status(400).json({
          success: false,
          message: "OTP has expired. Please request a new one.",
        });
      }

      // Verify OTP
      if (admin.otp !== otp) {
        console.log("Invalid OTP. Expected:", admin.otp, "Received:", otp);
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      console.log("OTP verified successfully");

      // Clear OTP fields
      admin.otp = null;
      admin.otpExpiry = null;
      admin.isVerified = true;
      await admin.save();

      // Generate JWT token
      const tokenPayload = {
        id: admin._id.toString(),
        role: admin.role || "admin",
      };

      console.log("Creating JWT token with payload:", tokenPayload);

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });

      console.log("JWT token generated successfully");
      console.log("Token length:", token.length);
      console.log(
        "Token preview:",
        `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
      );

      res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        token,
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify OTP",
        error: error.message,
      });
    }
  },

  resendOtp: async (req, res) => {
    try {
      const { email, isForgotPassword } = req.body;
      console.log("Resending OTP for:", { email, isForgotPassword });

      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin account not found",
        });
      }

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Save OTP
      admin.otp = otp;
      admin.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await admin.save();

      // Send email based on OTP type
      const emailSubject = isForgotPassword
        ? "YuMix Admin Password Reset OTP"
        : "YuMix Admin Login OTP";

      const emailContent = isForgotPassword
        ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>YuMix Admin Password Reset</h2>
            <p>Your OTP for password reset is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 5 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>YuMix Admin Login Verification</h2>
            <p>Your OTP for admin login is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 5 minutes.</p>
            <p>If you didn't request this OTP, please ignore this email.</p>
          </div>
        `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: emailSubject,
        html: emailContent,
      });

      res.status(200).json({
        success: true,
        message: "OTP resent successfully",
      });
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to resend OTP",
        error: error.message,
      });
    }
  },

  // Verify admin token
  verifyToken: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Please login to continue",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Not authorized as admin",
        });
      }

      const admin = await Admin.findById(decoded.id).select("-password");
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Admin not found",
        });
      }

      res.json({
        success: true,
        admin,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
  },

  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching users",
        error: error.message,
      });
    }
  },

  // Search users by email or other criteria
  searchUsers: async (req, res) => {
    try {
      const { email, name, status } = req.query;
      const queryObj = {};

      // Add search criteria to query object
      if (email) queryObj.email = { $regex: email, $options: "i" };
      if (name) queryObj.name = { $regex: name, $options: "i" };
      if (status) queryObj.status = status;

      console.log("Searching users with criteria:", queryObj);

      // Find users based on query
      const users = await User.find(queryObj).select("-password");

      res.status(200).json({
        success: true,
        count: users.length,
        data: users,
        message:
          users.length > 0
            ? "Users found successfully"
            : "No users found matching the criteria",
      });
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({
        success: false,
        message: "Error searching users",
        error: error.message,
      });
    }
  },

  // Get user details
  getUserDetails: async (req, res) => {
    try {
      const userId = req.params.id;

      // Find the user by ID
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get subscription details
      const subscription = await Subscription.findOne({
        userId: userId,
      }).lean();

      // Add isActive property to subscription if it exists
      if (subscription) {
        const currentDate = new Date();
        // Check if currentDate is between startDate and expiryDate AND payment status is completed
        subscription.isActive =
          subscription.paymentStatus === "completed" &&
          subscription.startDate <= currentDate &&
          subscription.expiryDate > currentDate;
      }

      // Get payment history
      const payments = await Payment.find({ userId: userId })
        .sort({ createdAt: -1 })
        .lean();

      // Get user favorites
      const favorites = await Recipe.find({
        _id: { $in: user.favorites || [] },
      })
        .select("_id name")
        .lean();

      // Format response
      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture,
        isSubscribed: user.isSubscribed,
        subscriptionId: user.subscriptionId,
        status: user.status,
        dailySearchCount: user.dailySearchCount,
        lastSearchDate: user.lastSearchDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        favorites: favorites,
        subscription: subscription,
        payments: payments,
      };

      return res.status(200).json({
        success: true,
        message: "User details fetched successfully",
        data: userData,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user details",
        error: error.message,
      });
    }
  },

  // Block user
  blockUser: async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { status: "blocked" },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "User blocked successfully",
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error blocking user",
        error: error.message,
      });
    }
  },

  // Unblock user
  unblockUser: async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { status: "active" },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "User unblocked successfully",
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error unblocking user",
        error: error.message,
      });
    }
  },

  // Get all recipes
  getAllRecipes: async (req, res) => {
    try {
      const recipes = await AdminRecipe.find().sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        data: recipes,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching recipes",
        error: error.message,
      });
    }
  },

  // Search recipes by query (ingredients or recipe name)
  searchRecipes: async (req, res) => {
    try {
      const { ingredients } = req.body;
      console.log("Request body:", req.body);
      console.log("Searching recipes for ingredients:", ingredients);

      if (!process.env.SPOONACULAR_API_KEY) {
        console.error("Spoonacular API key missing");
        return res.status(500).json({
          success: false,
          message: "Recipe API not configured",
        });
      }

      // Format ingredients for API - convert to comma-separated string
      const formattedIngredients = Array.isArray(ingredients)
        ? ingredients.join(",")
        : ingredients.replace(/\s*,\s*/g, ",").trim();

      console.log("Formatted ingredients:", formattedIngredients);

      // First get recipes by ingredients
      const searchResponse = await axios.get(
        "https://api.spoonacular.com/recipes/findByIngredients",
        {
          params: {
            apiKey: process.env.SPOONACULAR_API_KEY,
            ingredients: formattedIngredients,
            number: 6,
            ranking: 2,
            ignorePantry: true,
          },
        }
      );

      if (!searchResponse.data || !Array.isArray(searchResponse.data)) {
        console.error(
          "Invalid response from Spoonacular:",
          searchResponse.data
        );
        return res.status(500).json({
          success: false,
          message: "Invalid response from recipe service",
        });
      }

      // Get detailed information for each recipe
      const recipesWithDetails = await Promise.all(
        searchResponse.data.map(async (recipe) => {
          try {
            const detailResponse = await axios.get(
              `https://api.spoonacular.com/recipes/${recipe.id}/information`,
              {
                params: {
                  apiKey: process.env.SPOONACULAR_API_KEY,
                },
              }
            );

            // Check if recipe is already featured
            const existingRecipe = await AdminRecipe.findOne({
              sourceId: recipe.id,
            });

            return {
              sourceId: recipe.id,
              name: detailResponse.data.title,
              image: detailResponse.data.image,
              ingredients:
                detailResponse.data.extendedIngredients?.map(
                  (ing) => ing.original
                ) || [],
              instructions: detailResponse.data.instructions || "",
              prepTime: detailResponse.data.readyInMinutes || 0,
              servings: detailResponse.data.servings || 0,
              isFeatured: existingRecipe?.isFeatured || false,
            };
          } catch (error) {
            console.error(
              `Error fetching details for recipe ${recipe.id}:`,
              error.response?.data || error.message
            );
            return null;
          }
        })
      );

      const validRecipes = recipesWithDetails.filter(
        (recipe) => recipe !== null
      );

      return res.json({
        success: true,
        data: validRecipes,
      });
    } catch (error) {
      console.error(
        "Recipe search error:",
        error.response?.data || error.message
      );
      return res.status(500).json({
        success: false,
        message: "Failed to search recipes",
        error: error.response?.data?.message || error.message,
      });
    }
  },

  // Get featured recipes
  getFeaturedRecipes: async (req, res) => {
    try {
      const recipes = await AdminRecipe.find({ isFeatured: true }).sort({
        createdAt: -1,
      });
      res.json({
        success: true,
        data: recipes,
      });
    } catch (error) {
      console.error("Error fetching featured recipes:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch featured recipes",
      });
    }
  },

  // Feature a recipe for home page
  featureRecipe: async (req, res) => {
    try {
      const { recipeId } = req.params;

      // First check if recipe exists
      let recipe = await AdminRecipe.findOne({ sourceId: parseInt(recipeId) });

      if (!recipe) {
        // Create new recipe if it doesn't exist
        recipe = new AdminRecipe({
          sourceId: parseInt(recipeId),
          name: req.body.name || "",
          ingredients: req.body.ingredients || [],
          instructions:
            req.body.instructions ||
            "No instructions provided for this recipe.",
          image: req.body.image || "",
          prepTime: req.body.prepTime || 0,
          servings: req.body.servings || 0,
          isFeatured: true,
        });
      } else {
        recipe.isFeatured = true;
      }

      await recipe.save();

      // Clear featured recipes cache
      await safeRedisOperation(async () => {
        await redisClient.del("featured_recipes");
      });

      return res.json({
        success: true,
        message: "Recipe featured successfully",
        data: recipe,
      });
    } catch (error) {
      console.error("Error featuring recipe:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to feature recipe",
        error: error.message,
      });
    }
  },

  // Unfeature a recipe
  unfeatureRecipe: async (req, res) => {
    try {
      const { recipeId } = req.params;

      // First check if recipe exists
      const recipe = await AdminRecipe.findOne({
        sourceId: parseInt(recipeId),
      });

      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: "Recipe not found",
        });
      }

      // Update recipe to unfeature it
      recipe.isFeatured = false;
      await recipe.save();

      // Clear featured recipes cache
      await safeRedisOperation(async () => {
        await redisClient.del("featured_recipes");
      });

      return res.json({
        success: true,
        message: "Recipe unfeatured successfully",
        data: recipe,
      });
    } catch (error) {
      console.error("Error unfeaturing recipe:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to unfeature recipe",
        error: error.message,
      });
    }
  },

  // Subscription Plan Management
  createPlan: async (req, res) => {
    try {
      const { name, price, duration, features } = req.body;

      // Check if plan with same name exists
      const existingPlan = await SubscriptionPlan.findOne({ name });
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: "Plan with this name already exists",
        });
      }

      const plan = new SubscriptionPlan({
        name,
        price,
        duration,
        features,
        createdBy: req.admin.id,
      });

      await plan.save();

      res.status(201).json({
        success: true,
        message: "Subscription plan created successfully",
        data: plan,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating subscription plan",
        error: error.message,
      });
    }
  },

  getAllPlans: async (req, res) => {
    try {
      // Include inactive plans for admin view
      const plans = await SubscriptionPlan.find()
        .sort({ price: 1 })
        .populate("createdBy", "name");

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching subscription plans",
        error: error.message,
      });
    }
  },

  updatePlan: async (req, res) => {
    try {
      const { planId } = req.params;
      const { name, price, duration, features, isActive } = req.body;

      // Check if plan exists
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Subscription plan not found",
        });
      }

      // If name is being changed, check for duplicates
      if (name && name !== plan.name) {
        const existingPlan = await SubscriptionPlan.findOne({ name });
        if (existingPlan) {
          return res.status(400).json({
            success: false,
            message: "Plan with this name already exists",
          });
        }
      }

      const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
        planId,
        {
          name,
          price,
          duration,
          features,
          isActive,
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: "Subscription plan updated successfully",
        data: updatedPlan,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating subscription plan",
        error: error.message,
      });
    }
  },

  deletePlan: async (req, res) => {
    try {
      const { planId } = req.params;

      // Check if plan exists
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Subscription plan not found",
        });
      }

      // Check if any users are currently subscribed to this plan
      const activeSubscriptions = await Subscription.find({
        planType: plan.name,
        expiryDate: { $gt: new Date() },
      });

      if (activeSubscriptions.length > 0) {
        // Instead of deleting, just mark as inactive
        plan.isActive = false;
        await plan.save();

        return res.status(200).json({
          success: true,
          message: "Plan marked as inactive due to active subscriptions",
          data: plan,
        });
      }

      // If no active subscriptions, delete the plan
      await SubscriptionPlan.findByIdAndDelete(planId);

      res.status(200).json({
        success: true,
        message: "Subscription plan deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error deleting subscription plan",
        error: error.message,
      });
    }
  },

  // Payment Management
  getAllPayments: async (req, res) => {
    try {
      const payments = await Payment.find()
        .populate("userId", "name email")
        .populate("subscriptionId")
        .sort({ createdAt: -1 });

      const formattedPayments = payments.map((payment) => ({
        _id: payment._id,
        transactionId:
          payment.transactionId ||
          payment.razorpayPaymentId ||
          payment.cashfreePaymentId ||
          payment._id.toString(),
        user: {
          name: payment.userId?.name || "Unknown User",
          email: payment.userId?.email || "unknown@email.com",
        },
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        subscription: payment.subscriptionId,
      }));

      return res.json({
        success: true,
        data: formattedPayments,
      });
    } catch (error) {
      console.error("Error fetching payments:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
        error: error.message,
      });
    }
  },

  getPaymentDetails: async (req, res) => {
    try {
      const payment = await Payment.findById(req.params.paymentId)
        .populate("userId", "name email")
        .populate("subscriptionId");

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      return res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error("Error fetching payment details:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch payment details",
        error: error.message,
      });
    }
  },

  // Process refund
  processRefund: async (req, res) => {
    try {
      const { paymentId, reason } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: "Payment ID is required",
        });
      }

      // Find payment
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      if (payment.status !== "completed") {
        return res.status(400).json({
          success: false,
          message: "Can only refund completed payments",
        });
      }

      // Check if payment is within the 24-hour refund window
      const paymentDate = new Date(payment.createdAt);
      const currentDate = new Date();
      const hoursSincePayment = (currentDate - paymentDate) / (1000 * 60 * 60);

      if (hoursSincePayment > 24) {
        return res.status(400).json({
          success: false,
          message: "Refund window has expired (24 hours after purchase)",
        });
      }

      let refundResult;

      // Process refund based on payment method
      if (payment.paymentMethod === "cashfree" && payment.cashfreePaymentId) {
        // Process refund through Cashfree
        const refundData = {
          refund_amount: payment.amount,
          refund_id: `refund_${Date.now()}`,
          refund_note: reason || "Admin initiated refund within 24-hour window",
        };

        // Call Cashfree refund API
        const response = await axios({
          method: "post",
          url: `${process.env.CASHFREE_API_URL.replace("/orders", "")}/orders/${
            payment.cashfreeOrderId
          }/refunds`,
          headers: {
            "Content-Type": "application/json",
            "x-api-version": "2022-09-01",
            "x-client-id": process.env.CASHFREE_APP_ID,
            "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          },
          data: refundData,
        });

        refundResult = response.data;
      } else {
        // Handle case where payment method is not supported for refund
        return res.status(400).json({
          success: false,
          message: `Cannot process refund for payment method: ${payment.paymentMethod}`,
        });
      }

      // Update payment status
      payment.status = "refunded";
      payment.refundDetails = {
        refundId: refundResult.refund_id || `refund_${Date.now()}`,
        reason,
        refundedAt: new Date(),
        refundedBy: req.admin.id,
        withinRefundWindow: true,
      };
      await payment.save();

      // Update subscription status
      await Subscription.findByIdAndUpdate(payment.subscriptionId, {
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: "Payment refunded within 24-hour window",
      });

      // Update user subscription status
      await User.findByIdAndUpdate(payment.userId, {
        isSubscribed: false,
      });

      // Create refund notification for admin
      const user = await User.findById(payment.userId);
      await adminNotificationController.createAdminNotification({
        adminId: req.admin._id,
        title: "Refund Processed",
        message: `Refund processed: ₹${payment.amount} to ${user.name} (within 24-hour window)`,
        type: "payment",
        userId: user._id,
        amount: payment.amount,
        paymentId: payment._id,
        refundId: refundResult.refund_id,
        reason: reason,
        status: "refunded",
        timestamp: new Date(),
      });

      // Get subscription details for notification message
      const subscription = await Subscription.findById(payment.subscriptionId);
      const planName = subscription?.planType || "premium";

      // Create user notification about the refund
      await userNotificationController.createUserNotification({
        userId: user._id,
        title: "Refund Processed Successfully",
        message: `Your payment of ₹${payment.amount} for ${planName} subscription has been refunded. The amount should be credited to your original payment method within 5-7 business days.`,
        type: "payment",
        data: {
          paymentId: payment._id,
          refundId: refundResult.refund_id,
          amount: payment.amount,
          timestamp: new Date(),
        },
      });

      // Send email notification to user
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "YuMix - Refund Processed Successfully",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #23486A;">Refund Confirmation</h2>
              </div>
              <p>Hello ${user.name},</p>
              <p>Your refund of <strong>₹${
                payment.amount
              }</strong> for YuMix ${planName} subscription has been processed successfully.</p>
              <p>The refund should appear in your account within 5-7 business days, depending on your payment provider.</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #23486A;">Refund Details:</h3>
                <ul style="list-style-type: none; padding-left: 0;">
                  <li><strong>Amount:</strong> ₹${payment.amount}</li>
                  <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                  <li><strong>Reference ID:</strong> ${
                    refundResult.refund_id || "N/A"
                  }</li>
                  <li><strong>Status:</strong> Processed</li>
                </ul>
              </div>
              <p>If you have any questions or need further assistance, please contact our support team at support@yumix.com.</p>
              <p>Thank you for trying YuMix!</p>
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
                <p>This is an automated message, please do not reply directly to this email.</p>
                <p>© ${new Date().getFullYear()} YuMix. All rights reserved.</p>
              </div>
            </div>
          `,
        });
        console.log(`Refund notification email sent to ${user.email}`);
      } catch (emailError) {
        // Log the error but don't fail the refund process
        console.error("Failed to send refund email notification:", emailError);
      }

      res.status(200).json({
        success: true,
        message: "Refund processed successfully",
        data: {
          payment,
          refund: refundResult,
        },
      });
    } catch (error) {
      console.error("Refund processing error:", error);
      res.status(500).json({
        success: false,
        message: "Error processing refund",
        error: error.message,
      });
    }
  },

  getDashboardStats: async (req, res) => {
    try {
      // Define date variables for statistics
      const now = new Date();

      // Current month
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      // Previous month
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );

      console.log("Date ranges for dashboard stats:", {
        thisMonthStart,
        thisMonthEnd,
        lastMonthStart,
        lastMonthEnd,
        now,
      });

      // Get admin data
      const adminId = req.admin._id;
      const adminData = await Admin.findById(adminId);

      if (!adminData) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Get basic stats with error handling for each
      let totalUsers = 0;
      let activeRecipes = 0;
      let activeSubscriptions = 0;
      let monthlyRevenue = 0;
      let recipeSearches = 0;

      // For percentage changes - defaults
      let usersChange = 0;
      let recipesChange = 0;
      let subscriptionsChange = 0;
      let searchesChange = 0;

      try {
        // Define this month's and last month's date ranges
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        const lastMonthEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59
        );

        // Get total users (all time)
        totalUsers = await User.countDocuments();

        // Get new users this month
        const newUsersThisMonth = await User.countDocuments({
          createdAt: { $gte: thisMonthStart },
        });

        // Get new users last month
        const newUsersLastMonth = await User.countDocuments({
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        });

        // Calculate percentage change in new user growth
        if (newUsersLastMonth > 0) {
          const growthDifference = newUsersThisMonth - newUsersLastMonth;
          usersChange = (growthDifference / newUsersLastMonth) * 100;

          // Cap extremely large increases to a reasonable value (500%)
          if (usersChange > 500) {
            console.log(
              `Capping extreme user percentage change: ${usersChange.toFixed(
                1
              )}% → 500%`
            );
            usersChange = 500;
          }
        } else if (newUsersThisMonth > 0) {
          // If no new users last month but some this month, show a reasonable increase
          usersChange = 100;
        } else {
          usersChange = 0;
        }

        console.log(
          `User stats: Total: ${totalUsers}, This month: ${newUsersThisMonth}, Last month: ${newUsersLastMonth}, Change: ${usersChange.toFixed(
            1
          )}%`
        );
      } catch (error) {
        console.error("Error counting users:", error);
      }

      try {
        // Get total active recipes (all time) - count all recipes from both collections
        const recipesCount = await Recipe.countDocuments();
        const adminRecipesCount = await AdminRecipe.countDocuments();
        activeRecipes = recipesCount + adminRecipesCount;

        console.log(
          `Total recipes in database: ${activeRecipes} (${recipesCount} regular + ${adminRecipesCount} admin featured)`
        );

        // Get new recipes this month
        const newRecipesThisMonth = await Recipe.countDocuments({
          createdAt: { $gte: thisMonthStart },
        });

        // Also count new admin recipes this month
        const newAdminRecipesThisMonth = await AdminRecipe.countDocuments({
          createdAt: { $gte: thisMonthStart },
        });

        const totalNewRecipesThisMonth =
          newRecipesThisMonth + newAdminRecipesThisMonth;

        // Get new recipes last month
        const newRecipesLastMonth = await Recipe.countDocuments({
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        });

        // Also count new admin recipes last month
        const newAdminRecipesLastMonth = await AdminRecipe.countDocuments({
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        });

        const totalNewRecipesLastMonth =
          newRecipesLastMonth + newAdminRecipesLastMonth;

        // Calculate percentage change in new recipe growth
        if (totalNewRecipesLastMonth > 0) {
          const growthDifference =
            totalNewRecipesThisMonth - totalNewRecipesLastMonth;
          recipesChange = (growthDifference / totalNewRecipesLastMonth) * 100;

          // Cap extremely large increases to a reasonable value (500%)
          if (recipesChange > 500) {
            console.log(
              `Capping extreme recipe percentage change: ${recipesChange.toFixed(
                1
              )}% → 500%`
            );
            recipesChange = 500;
          }
        } else if (totalNewRecipesThisMonth > 0) {
          // If no new recipes last month but some this month, show a reasonable increase
          recipesChange = 100;
        } else {
          recipesChange = 0;
        }

        console.log(
          `Recipe stats: Total: ${activeRecipes}, This month: ${totalNewRecipesThisMonth}, Last month: ${totalNewRecipesLastMonth}, Change: ${recipesChange.toFixed(
            1
          )}%`
        );
      } catch (error) {
        console.error("Error counting recipes:", error);
      }

      try {
        // Get current active subscriptions
        activeSubscriptions = await Subscription.countDocuments({
          expiryDate: { $gt: new Date() },
          paymentStatus: "completed",
        });

        // New subscriptions this month
        const newSubscriptionsThisMonth = await Subscription.countDocuments({
          createdAt: { $gte: thisMonthStart },
          paymentStatus: "completed",
        });

        // New subscriptions last month
        const newSubscriptionsLastMonth = await Subscription.countDocuments({
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
          paymentStatus: "completed",
        });

        // Calculate percentage change
        if (newSubscriptionsLastMonth > 0) {
          const growthDifference =
            newSubscriptionsThisMonth - newSubscriptionsLastMonth;
          subscriptionsChange =
            (growthDifference / newSubscriptionsLastMonth) * 100;

          // Cap extremely large increases to a reasonable value (500%)
          if (subscriptionsChange > 500) {
            console.log(
              `Capping extreme subscription percentage change: ${subscriptionsChange.toFixed(
                1
              )}% → 500%`
            );
            subscriptionsChange = 500;
          }
        } else if (newSubscriptionsThisMonth > 0) {
          // If no new subscriptions last month but some this month, show a reasonable increase
          subscriptionsChange = 100;
        } else {
          subscriptionsChange = 0;
        }

        console.log(
          `Subscription stats: Active: ${activeSubscriptions}, This month: ${newSubscriptionsThisMonth}, Last month: ${newSubscriptionsLastMonth}, Change: ${subscriptionsChange.toFixed(
            1
          )}%`
        );
      } catch (error) {
        console.error("Error counting subscriptions:", error);
      }

      try {
        // Get current month revenue
        const currentMonth = new Date();
        currentMonth.setDate(1); // First day of current month

        const revenueData = await Payment.aggregate([
          {
            $match: {
              createdAt: { $gte: currentMonth },
              status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]);

        monthlyRevenue = revenueData[0]?.total || 0;

        // Get previous month revenue
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        lastMonth.setDate(1); // First day of previous month

        const previousMonth = new Date();
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        previousMonth.setDate(1);

        const lastMonthEnd = new Date(previousMonth);
        lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
        lastMonthEnd.setDate(0);

        const previousRevenueData = await Payment.aggregate([
          {
            $match: {
              createdAt: {
                $gte: previousMonth,
                $lt: currentMonth,
              },
              status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]);

        const previousRevenue = previousRevenueData[0]?.total || 0;

        // Calculate percentage change for revenue/searches
        if (previousRevenue > 0) {
          const revenueDifference = monthlyRevenue - previousRevenue;
          searchesChange = (revenueDifference / previousRevenue) * 100;
        }
      } catch (error) {
        console.error("Error calculating revenue:", error);
      }

      // Try to get recipe views for today (replacing recipe searches count)
      try {
        // Define today's date range
        const now = new Date();
        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ); // Start of today
        const todayEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        ); // End of today

        // Yesterday date range for comparison
        const yesterdayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        ); // Start of yesterday
        const yesterdayEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          23,
          59,
          59,
          999
        ); // End of yesterday

        // Count recipe views from RecipeHistory model
        const { RecipeHistory } = await import("../models/index.js");

        // Count all recipe views today
        recipeSearches = await RecipeHistory.countDocuments({
          viewedAt: { $gte: todayStart, $lte: todayEnd },
        });

        console.log(
          `Found ${recipeSearches} recipe views today (${todayStart.toISOString()} to ${todayEnd.toISOString()})`
        );

        // Get yesterday's views for change calculation
        const yesterdayViews = await RecipeHistory.countDocuments({
          viewedAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
        });

        console.log(
          `Found ${yesterdayViews} recipe views yesterday (${yesterdayStart.toISOString()} to ${yesterdayEnd.toISOString()})`
        );

        // Count views specifically marked as coming from search to track AI recipes
        const searchViewsToday = await RecipeHistory.countDocuments({
          viewedAt: { $gte: todayStart, $lte: todayEnd },
          fromSearch: true,
        });

        console.log(
          `Of which ${searchViewsToday} were from searches or AI generation`
        );

        // Calculate percentage change for views
        if (yesterdayViews > 0) {
          const viewsDifference = recipeSearches - yesterdayViews;
          searchesChange = (viewsDifference / yesterdayViews) * 100;

          // Cap extremely large increases to a reasonable value (500%)
          if (searchesChange > 500) {
            console.log(
              `Capping extreme percentage change: ${searchesChange.toFixed(
                1
              )}% → 500%`
            );
            searchesChange = 500;
          }
        } else if (recipeSearches > 0) {
          // If yesterday was 0 but today has views, show a substantial but not extreme increase
          console.log(
            "No views yesterday but views today, setting to 100% increase"
          );
          searchesChange = 100;
        } else {
          searchesChange = 0;
        }
      } catch (error) {
        console.error("Error counting recipe views:", error);
        // If we fail, we'll use a default value with 0% change
        recipeSearches = 0;
        searchesChange = 0;
      }

      // Return the response with recipeViews instead of recipeSearches
      res.json({
        success: true,
        admin: {
          name: adminData.name,
          email: adminData.email,
          role: adminData.role,
          status: adminData.status,
          image: adminData.image,
          preferences: adminData.preferences,
        },
        stats: {
          totalUsers,
          activeRecipes,
          activeSubscriptions,
          monthlyRevenue,
          recipeViews: recipeSearches, // Renamed from recipeSearches
          // Include percentage changes
          usersChange,
          recipesChange,
          subscriptionsChange,
          viewsChange: searchesChange, // Renamed from searchesChange
          recentActivities: [], // You can implement this later
        },
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching dashboard stats",
        error: error.message,
      });
    }
  },

  // Forgot Password
  forgotPassword: async (req, res) => {
    console.log("\n=== Forgot Password Request ===");
    console.log("Request body:", req.body);

    try {
      const { email } = req.body;
      console.log("Processing request for email:", email);

      // Find admin by email
      const admin = await Admin.findOne({ email });
      console.log("Admin found:", admin ? "Yes" : "No");

      if (!admin) {
        console.log("Admin not found for email:", email);
        return res.status(404).json({
          success: false,
          message: "Admin account not found",
        });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log("Generated OTP:", otp);

      // Save reset OTP
      admin.otp = otp;
      admin.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      await admin.save();
      console.log("OTP saved to admin document");

      // Send reset OTP email
      console.log("Attempting to send email...");
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "YuMix Admin Password Reset OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>YuMix Admin Password Reset</h2>
            <p>Your OTP for password reset is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 5 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
        `,
      });
      console.log("Email sent successfully");

      res.status(200).json({
        success: true,
        message: "Password reset OTP sent successfully",
      });
    } catch (error) {
      console.error("=== Forgot Password Error ===");
      console.error("Error details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process forgot password request",
        error: error.message,
      });
    }
  },

  // Verify Reset OTP
  verifyResetOtp: async (req, res) => {
    try {
      const { email, otp } = req.body;

      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Verify OTP
      if (!admin.otp || admin.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      // Check OTP expiry
      if (Date.now() > admin.otpExpiry.getTime()) {
        return res.status(400).json({
          success: false,
          message: "OTP has expired. Please request a new one.",
        });
      }

      // Clear OTP after verification
      admin.otp = null;
      admin.otpExpiry = null;
      await admin.save();

      res.status(200).json({
        success: true,
        message: "OTP verified successfully",
      });
    } catch (error) {
      console.error("Reset OTP verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify reset OTP",
        error: error.message,
      });
    }
  },

  // Reset Password
  resetPassword: async (req, res) => {
    try {
      const { email, newPassword } = req.body;

      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Update password
      admin.password = newPassword; // Will be hashed by pre-save hook
      await admin.save();

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reset password",
        error: error.message,
      });
    }
  },

  getRecipeVideo: async (req, res) => {
    try {
      const { query } = req.query;

      // Debug logs
      console.log("\n=== Get Recipe Video Request ===");
      console.log("Query:", query);
      console.log("Admin:", req.admin?._id);
      console.log(
        "YouTube API Key:",
        process.env.YOUTUBE_API_KEY ? "Present" : "Missing"
      );

      if (!process.env.YOUTUBE_API_KEY) {
        console.error("YouTube API key missing");
        return res.status(500).json({
          success: false,
          error: "YouTube API key not configured",
        });
      }

      // Check if YouTube quota has been exceeded
      try {
        const quotaExceeded = await safeRedisOperation(async () => {
          return await redisClient.get("youtube_quota_exceeded");
        });

        if (quotaExceeded === "true") {
          console.log(
            "YouTube quota exceeded, returning error without API call"
          );
          return res.json({
            success: false,
            message: "Video search temporarily unavailable",
            quotaExceeded: true,
          });
        }
      } catch (redisError) {
        console.error("Redis error when checking quota:", redisError);
        // Continue anyway if Redis fails
      }

      const searchQuery = `${query} recipe cooking tutorial`;
      console.log("Search query:", searchQuery);

      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            maxResults: 1,
            q: searchQuery,
            type: "video",
            videoEmbeddable: true,
            key: process.env.YOUTUBE_API_KEY,
          },
        }
      );

      console.log("YouTube API Response:", {
        status: response.status,
        items: response.data?.items?.length,
        firstVideo: response.data?.items?.[0]?.id?.videoId,
      });

      if (!response.data?.items?.length) {
        console.log("No videos found for query:", query);
        return res.json({
          success: false,
          message: "No videos found",
        });
      }

      const video = response.data.items[0];
      const result = {
        success: true,
        videoId: video.id.videoId,
        thumbnail: video.snippet.thumbnails.high.url,
        title: video.snippet.title,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      };

      console.log("Sending response:", result);
      return res.json(result);
    } catch (error) {
      console.error("YouTube API Error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Check for quota exceeded error message
      if (
        error.response?.data?.error?.message?.includes("quota") ||
        (error.message && error.message.includes("quota"))
      ) {
        console.log("YouTube quota exceeded, setting Redis flag");

        // Set quota exceeded flag in Redis with 6-hour expiry
        try {
          await safeRedisOperation(async () => {
            await redisClient.setEx(
              "youtube_quota_exceeded",
              6 * 60 * 60,
              "true"
            );
          });
        } catch (redisError) {
          console.error("Redis error when setting quota flag:", redisError);
        }

        return res.status(429).json({
          success: false,
          error: "YouTube API quota exceeded",
          message: "Video search temporarily unavailable",
          quotaExceeded: true,
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to fetch video from YouTube",
        details: error.response?.data?.error?.message || error.message,
      });
    }
  },

  getSubscribedUsers: async (req, res) => {
    try {
      // Get all users with active subscriptions
      const subscribers = await User.find({ isSubscribed: true })
        .select("-password")
        .populate({
          path: "subscriptionId",
          select: "planType startDate expiryDate paymentStatus amount",
        });

      // Get the latest payment for each subscriber
      const subscribersWithPayments = await Promise.all(
        subscribers.map(async (subscriber) => {
          const lastPayment = await Payment.findOne({
            userId: subscriber._id,
          })
            .sort({ createdAt: -1 })
            .select("amount createdAt status");

          // Create the proper structure expected by the frontend
          return {
            _id: subscriber._id,
            name: subscriber.name,
            email: subscriber.email,
            subscription: {
              _id: subscriber.subscriptionId?._id,
              startDate: subscriber.subscriptionId?.startDate,
              endDate: subscriber.subscriptionId?.expiryDate, // Map to endDate for frontend
              status: subscriber.subscriptionId?.paymentStatus || "pending",
              plan: {
                name: subscriber.subscriptionId?.planType || "No Plan",
                price: subscriber.subscriptionId?.amount || 0,
              },
            },
            lastPayment: lastPayment
              ? {
                  amount: lastPayment.amount,
                  date: lastPayment.createdAt,
                  status: lastPayment.status,
                }
              : null,
          };
        })
      );

      return res.json({
        success: true,
        data: subscribersWithPayments,
      });
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch subscribers",
        error: error.message,
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { name, email, currentPassword, newPassword } = req.body;
      const adminId = req.admin.id;

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // If sensitive info is being changed (email or password), require OTP verification
      if (email !== admin.email || (currentPassword && newPassword)) {
        return res.status(400).json({
          success: false,
          message: "Email and password changes require OTP verification",
          requireOTP: true,
        });
      }

      // Update other fields (name only) directly
      if (name) admin.name = name;

      await admin.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: {
          name: admin.name,
          email: admin.email,
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
        error: error.message,
      });
    }
  },

  // Request OTP for profile update (email or password changes)
  requestProfileUpdateOTP: async (req, res) => {
    try {
      const { type, newEmail } = req.body;
      const adminId = req.admin.id;

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Redis with 10 minutes expiry
      await redisClient.set(`adminProfileOTP:${adminId}`, String(otp), {
        EX: 600, // 10 minutes
      });

      // Determine which email to send the OTP to
      const emailToUse = type === "email" && newEmail ? newEmail : admin.email;

      console.log(
        `Sending profile update OTP to ${emailToUse} for ${type} change`
      );

      // Send OTP via email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: emailToUse,
        subject: "YuMix Admin - Profile Update Verification",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>YuMix Admin Profile Update Verification</h2>
            <p>Your OTP for ${
              type === "password" ? "password change" : "email change"
            } is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this OTP, please secure your account immediately.</p>
          </div>
        `,
      });

      res.json({
        success: true,
        message: `OTP sent successfully to ${emailToUse}`,
      });
    } catch (error) {
      console.error("Error sending profile update OTP:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send OTP",
        error: error.message,
      });
    }
  },

  // Update profile with OTP verification
  updateProfileWithOTP: async (req, res) => {
    try {
      const { type, email, otp, currentPassword, newPassword } = req.body;
      const adminId = req.admin.id;

      console.log("Update admin profile with OTP request:", {
        adminId,
        type,
        email: email ? "provided" : "not provided",
        passwordChange: type === "password" ? "requested" : "not requested",
        otp: otp ? "provided" : "not provided",
      });

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Verify OTP
      const storedOTP = await redisClient.get(`adminProfileOTP:${adminId}`);
      console.log("Stored OTP:", storedOTP);
      console.log("Provided OTP:", otp);

      if (!storedOTP || storedOTP !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
          errorType: storedOTP ? "invalid_otp" : "expired_otp",
        });
      }

      // Delete OTP after successful verification
      await redisClient.del(`adminProfileOTP:${adminId}`);

      // Update profile based on type
      if (type === "email" && email) {
        // Validate the email is not already used by a user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "This email is already registered by a user",
          });
        }

        // Update admin email
        admin.email = email;
        await admin.save();

        return res.status(200).json({
          success: true,
          message: "Email updated successfully",
          data: {
            name: admin.name,
            email: admin.email,
          },
        });
      } else if (type === "password") {
        // Verify current password
        if (!currentPassword || !newPassword) {
          return res.status(400).json({
            success: false,
            message: "Both current and new password are required",
            errorType: "missing_fields",
          });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
            errorType: "incorrect_password",
          });
        }

        // Set new password
        admin.password = newPassword; // Will be hashed by pre-save hook
        await admin.save();

        return res.status(200).json({
          success: true,
          message: "Password updated successfully",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid update type",
      });
    } catch (error) {
      console.error("Error updating profile with OTP:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error: error.message,
      });
    }
  },

  updatePreferences: async (req, res) => {
    try {
      const adminId = req.admin.id;
      const preferences = req.body;

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Update preferences
      admin.preferences = {
        ...admin.preferences,
        ...preferences,
      };

      await admin.save();

      res.json({
        success: true,
        message: "Preferences updated successfully",
        data: admin.preferences,
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update preferences",
        error: error.message,
      });
    }
  },

  updateProfilePicture: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const admin = await Admin.findById(req.admin._id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Delete old image from Cloudinary if it exists
      if (admin.image && admin.image.includes("cloudinary")) {
        const publicId = admin.image.split("/").pop().split(".")[0];
        await deleteFromCloudinary(publicId);
      }

      // Upload new image to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, "admin/profile");

      // Update admin with new image URL
      admin.image = result.url;
      await admin.save();

      console.log("Updated admin with Cloudinary image URL:", result.url);

      res.status(200).json({
        success: true,
        message: "Profile picture updated successfully",
        image: result.url,
      });
    } catch (error) {
      console.error("Error updating profile picture:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile picture",
      });
    }
  },

  // Check and reset YouTube quota status
  checkYouTubeQuotaStatus: async (req, res) => {
    try {
      // Only admins can check/reset quota status
      if (!req.admin?._id) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      const { reset } = req.query;

      try {
        // Get current quota status
        const quotaExceeded = await safeRedisOperation(async () => {
          return await redisClient.get("youtube_quota_exceeded");
        });

        // If reset flag is true, clear the quota exceeded flag
        if (reset === "true") {
          console.log("Admin requested reset of YouTube quota status");

          await safeRedisOperation(async () => {
            await redisClient.del("youtube_quota_exceeded");
          });

          return res.json({
            success: true,
            message: "YouTube quota status reset successfully",
            quotaStatus: {
              exceeded: false,
              resetBy: req.admin._id,
              resetAt: new Date(),
            },
          });
        }

        // Just return current status
        return res.json({
          success: true,
          quotaStatus: {
            exceeded: quotaExceeded === "true",
            expiresAt:
              quotaExceeded === "true" ? "6 hours from setting time" : null,
          },
        });
      } catch (redisError) {
        console.error("Redis error when checking/resetting quota:", redisError);
        return res.status(500).json({
          success: false,
          message: "Error accessing quota status",
          error: redisError.message,
        });
      }
    } catch (error) {
      console.error("Error in checkYouTubeQuotaStatus:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process request",
        error: error.message,
      });
    }
  },

  getUserGrowthData: async (req, res) => {
    try {
      // Create a date for 12 months ago
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 11);
      oneYearAgo.setDate(1); // Start at the first day of the month

      // Array to hold the data points
      const monthlyUserData = [];

      // Get current month for percentage calculation
      const currentMonth = new Date();
      currentMonth.setDate(1);

      // Previous month for comparison
      const prevMonth = new Date();
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      prevMonth.setDate(1);

      // Calculate current and previous month user counts for percentage
      let currentMonthUsers = 0;
      let prevMonthUsers = 0;

      // For each of the last 12 months
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(oneYearAgo);
        monthDate.setMonth(oneYearAgo.getMonth() + i);

        const nextMonth = new Date(monthDate);
        nextMonth.setMonth(monthDate.getMonth() + 1);

        // Format month name
        const monthName = monthDate.toLocaleString("default", {
          month: "short",
        });

        try {
          // Count users created in this month
          const userCount = await User.countDocuments({
            createdAt: {
              $gte: monthDate,
              $lt: nextMonth,
            },
          });

          // Push data point
          monthlyUserData.push({
            name: monthName,
            users: userCount,
          });

          // Store current and previous month data for percentage calculation
          const monthTimestamp = monthDate.getTime();
          if (monthTimestamp === currentMonth.getTime()) {
            currentMonthUsers = userCount;
          } else if (monthTimestamp === prevMonth.getTime()) {
            prevMonthUsers = userCount;
          }
        } catch (error) {
          console.error(`Error counting users for ${monthName}:`, error);
          // Add 0 as fallback
          monthlyUserData.push({
            name: monthName,
            users: 0,
          });
        }
      }

      // Calculate percentage increase
      let percentageIncrease = 0;
      if (prevMonthUsers > 0) {
        percentageIncrease =
          ((currentMonthUsers - prevMonthUsers) / prevMonthUsers) * 100;
      }

      // Return the data
      res.json({
        success: true,
        data: monthlyUserData,
        percentageIncrease,
        lastUpdated: new Date(),
        message: "User growth data retrieved successfully",
      });
    } catch (error) {
      console.error("Error fetching user growth data:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching user growth data",
        error: error.message,
      });
    }
  },

  // Add placeholder methods for other chart data endpoints
  getRecipePopularityData: async (req, res) => {
    try {
      // Get recipe views by day of week from the database
      const { RecipeHistory } = await import("../models/index.js");

      // Get the start date for 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Days of the week
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      // Initialize data structure for all days
      const recipeData = days.map((day) => ({ name: day, views: 0 }));

      try {
        // Aggregate recipe views by day of week
        const viewsByDay = await RecipeHistory.aggregate([
          {
            $match: {
              viewedAt: { $gte: sevenDaysAgo },
            },
          },
          {
            $group: {
              _id: { $dayOfWeek: "$viewedAt" }, // 1 for Sunday, 2 for Monday, etc.
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        // Map the database results to our days array
        // MongoDB $dayOfWeek returns 1 for Sunday, 2 for Monday, etc.
        viewsByDay.forEach((dayData) => {
          // Convert MongoDB day (1-7) to our array index (0-6)
          const dayIndex = dayData._id - 1;
          if (dayIndex >= 0 && dayIndex < 7) {
            recipeData[dayIndex].views = dayData.count;
          }
        });

        console.log("Recipe popularity data:", recipeData);
      } catch (dbError) {
        console.error("Error aggregating recipe views:", dbError);
        // Keep the initialized recipeData with zeros
      }

      res.json({
        success: true,
        data: recipeData,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error fetching recipe popularity data:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching recipe popularity data",
      });
    }
  },

  getSubscriptionData: async (req, res) => {
    try {
      // Import required models
      const { User, Subscription, SubscriptionPlan } = await import(
        "../models/index.js"
      );

      // Get all active subscription plans from SubscriptionPlan model
      const activeSubscriptionPlans = await SubscriptionPlan.find({
        isActive: true,
      })
        .select("name")
        .lean();

      // Initialize subscriptionData with all plans set to zero
      const subscriptionData = {
        free: 0, // Users with no subscription
      };

      // Add all active plan names to subscriptionData with initial count 0
      activeSubscriptionPlans.forEach((plan) => {
        subscriptionData[plan.name.toLowerCase()] = 0;
      });

      // Count total users
      const totalUsers = await User.countDocuments();

      // Count active subscriptions by plan type
      const activeSubscriptions = await Subscription.aggregate([
        {
          $match: {
            // Only count subscriptions that are active (not expired)
            expiryDate: { $gt: new Date() },
            paymentStatus: "completed",
          },
        },
        {
          $group: {
            _id: "$planType",
            count: { $sum: 1 },
          },
        },
      ]);

      console.log("Active subscription plans:", activeSubscriptionPlans);
      console.log("Active subscriptions by type:", activeSubscriptions);

      // Update subscriptionData with actual counts
      activeSubscriptions.forEach((subscription) => {
        const planType = subscription._id.toLowerCase();
        if (subscriptionData.hasOwnProperty(planType)) {
          subscriptionData[planType] = subscription.count;
        }
      });

      // Calculate free users (total users minus all subscribers)
      const totalSubscribers = activeSubscriptions.reduce(
        (sum, sub) => sum + sub.count,
        0
      );
      subscriptionData.free = totalUsers - totalSubscribers;

      console.log("Final subscription data:", subscriptionData);

      res.json({
        success: true,
        data: subscriptionData,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching subscription data",
      });
    }
  },

  getActivityMetricsData: async (req, res) => {
    try {
      // Get recipe history data to use as activity metrics
      const { RecipeHistory } = await import("../models/index.js");
      const currentYear = new Date().getFullYear();

      // Month names
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      // Initialize the result array with all months
      const activityData = months.map((name) => ({ name, searches: 0 }));

      try {
        // Start date for the current year
        const startOfYear = new Date(currentYear, 0, 1);

        // Aggregate recipe views by month for the current year
        const viewsByMonth = await RecipeHistory.aggregate([
          {
            $match: {
              viewedAt: { $gte: startOfYear },
            },
          },
          {
            $group: {
              _id: { $month: "$viewedAt" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        // Map the results to our months array
        viewsByMonth.forEach((monthData) => {
          // MongoDB $month returns 1-12, so we need to adjust to 0-11 for our array
          const monthIndex = monthData._id - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            activityData[monthIndex].searches = monthData.count;
          }
        });

        console.log("Activity metrics data from RecipeHistory:", activityData);
      } catch (error) {
        console.error("Error aggregating recipe views:", error);
        // Keep the initialized data with zeros
      }

      res.json({
        success: true,
        data: activityData,
        year: currentYear,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error fetching activity metrics data:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching activity metrics data",
      });
    }
  },
};

export default adminController;
