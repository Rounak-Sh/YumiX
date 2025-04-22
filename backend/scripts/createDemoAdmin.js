import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Admin from "../models/adminModel.js";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const createDemoAdmin = async () => {
  try {
    await connectDB();

    // Check if demo admin already exists
    const existingAdmin = await Admin.findOne({ email: "demo@yumix.com" });

    if (existingAdmin) {
      console.log("Demo admin already exists");
      process.exit(0);
    }

    // Create a new demo admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("demo123", salt);

    const demoAdmin = new Admin({
      name: "Demo Admin",
      email: "demo@yumix.com",
      password: hashedPassword,
      role: "demo", // Custom role with limited permissions
      status: "active",
      preferences: {
        theme: "dark",
        dashboardView: "cards",
        notificationsEnabled: true,
        emailAlerts: false,
      },
      demoAccount: true, // Special flag to identify this as a demo account
    });

    await demoAdmin.save();
    console.log("Demo admin created successfully");
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

createDemoAdmin();
