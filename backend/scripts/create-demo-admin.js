import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { Admin } from "../models/index.js";

// Load environment variables
dotenv.config();

// Function to create demo admin
async function createDemoAdmin() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    // Check if the demo admin already exists
    const existingAdmin = await Admin.findOne({ email: "admin@yumix.com" });

    if (existingAdmin) {
      console.log("Demo admin already exists");
      console.log("Email: admin@yumix.com");
      // Reset password to admin123
      existingAdmin.password = "admin123";
      await existingAdmin.save();
      console.log("Password reset to: admin123");
    } else {
      // Create a new admin
      const newAdmin = new Admin({
        name: "Demo Admin",
        email: "admin@yumix.com",
        password: "admin123", // Will be hashed by the model's pre-save hook
        role: "admin",
        isEmailVerified: true,
        preferences: {
          emailNotifications: true,
          loginAlerts: true,
          reportGeneration: true,
          userSignups: true,
          newSubscriptions: true,
          paymentAlerts: true,
        },
      });

      await newAdmin.save();
      console.log("Demo admin created successfully");
      console.log("Email: admin@yumix.com");
      console.log("Password: admin123");
    }

    // Reset any login blockers (if admin was locked out)
    await Admin.updateOne(
      { email: "admin@yumix.com" },
      {
        $set: {
          loginAttempts: {
            count: 0,
            lastAttempt: null,
            blockedUntil: null,
          },
        },
      }
    );

    console.log("Login attempts reset");
    console.log("Done!");
  } catch (error) {
    console.error("Error creating demo admin:", error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
  }
}

// Run the function
createDemoAdmin();
