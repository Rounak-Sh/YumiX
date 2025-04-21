import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { User, SubscriptionPlan } from "../models/index.js";

// Load environment variables - make sure path is correct
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config(); // Load from root directory

// Check if MongoDB URI is defined
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not defined!");
  console.log(
    "Available environment variables:",
    Object.keys(process.env).filter((key) => !key.includes("SECRET"))
  );
  process.exit(1);
}

// Check if user ID is provided
const userId = process.argv[2];
if (!userId) {
  console.error("Usage: node verify-pro-plan.js <userId>");
  process.exit(1);
}

async function connectToDatabase() {
  try {
    console.log(
      "Attempting to connect to MongoDB at:",
      process.env.MONGODB_URI
    );
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}

async function verifyProPlan() {
  try {
    await connectToDatabase();

    // First list all subscription plans in the system
    console.log("\n---- All Subscription Plans ----");
    const allPlans = await SubscriptionPlan.find({});

    allPlans.forEach((plan) => {
      console.log(`Plan: ${plan.name} (${plan._id})`);
      console.log(`  Price: ${plan.price}`);
      console.log(`  Duration: ${plan.duration} days`);
      console.log(`  Features: ${JSON.stringify(plan.features)}`);
      console.log(
        `  Max Searches: ${plan.maxSearchesPerDay || "Not specified"}`
      );
      console.log("------------------------------");
    });

    // Now check specific user
    console.log(`\n---- Checking User ${userId} ----`);
    const user = await User.findById(userId).populate("subscription.plan");

    if (!user) {
      console.error("User not found");
      process.exit(1);
    }

    console.log(`User: ${user.name} (${user.email})`);
    console.log(`Daily Search Count: ${user.dailySearchCount || 0}`);
    console.log(`Last Search Date: ${user.lastSearchDate || "Never"}`);

    if (!user.subscription) {
      console.log("User has no subscription");
      process.exit(0);
    }

    console.log("\n---- Subscription Details ----");
    console.log(`Active: ${user.subscription.active}`);
    console.log(`Start Date: ${user.subscription.startDate}`);
    console.log(`End Date: ${user.subscription.endDate}`);

    if (!user.subscription.plan) {
      console.log("No plan associated with subscription");
      process.exit(0);
    }

    const plan = user.subscription.plan;
    console.log("\n---- Plan Details ----");
    console.log(`Plan ID: ${plan._id}`);
    console.log(`Name: ${plan.name}`);
    console.log(`Price: ${plan.price}`);
    console.log(`Duration: ${plan.duration} days`);
    console.log(
      `Max Searches Per Day: ${plan.maxSearchesPerDay || "Not specified"}`
    );

    // Check for unlimited searches
    const isProPlan = plan.name.toLowerCase().includes("pro");
    const hasUnlimitedSearches =
      plan.maxSearchesPerDay === 999999 || plan.maxSearchesPerDay === -1;

    console.log("\n---- Plan Analysis ----");
    console.log(`Is Pro Plan (by name): ${isProPlan ? "Yes" : "No"}`);
    console.log(
      `Has Unlimited Searches: ${hasUnlimitedSearches ? "Yes" : "No"}`
    );

    if (isProPlan && !hasUnlimitedSearches) {
      console.log(
        "\n⚠️ WARNING: Pro plan does not have unlimited searches configured"
      );
      console.log("Suggested fix: Update the plan.maxSearchesPerDay to 999999");
    } else if (hasUnlimitedSearches) {
      console.log("\n✅ Pro plan correctly configured with unlimited searches");
    }

    // Calculate remaining searches
    const today = new Date().toISOString().split("T")[0];
    const lastSearchDate = user.lastSearchDate
      ? user.lastSearchDate.toISOString().split("T")[0]
      : null;
    const isNewDay = lastSearchDate !== today;

    let remainingSearches = 0;
    if (hasUnlimitedSearches) {
      remainingSearches = 999999;
    } else if (isNewDay) {
      remainingSearches = plan.maxSearchesPerDay || 3; // Default to free tier
    } else {
      remainingSearches = Math.max(
        0,
        (plan.maxSearchesPerDay || 3) - (user.dailySearchCount || 0)
      );
    }

    console.log("\n---- Search Limits ----");
    console.log(`Daily Search Count: ${user.dailySearchCount || 0}`);
    console.log(`Max Searches: ${plan.maxSearchesPerDay || 3}`);
    console.log(`Remaining Searches: ${remainingSearches}`);
    console.log(`Is New Day: ${isNewDay ? "Yes" : "No"}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

verifyProPlan();
