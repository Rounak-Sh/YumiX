/**
 * Script to fix RecipeHistory indexes and clean up duplicate entries
 *
 * To run:
 * 1. Navigate to the backend directory
 * 2. Run: node scripts/fixRecipeHistoryIndexes.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { RecipeHistory } from "../models/index.js";

// Load environment variables
dotenv.config();

// Print initial message
console.log("Starting RecipeHistory index repair script...");

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Drop all existing indexes except _id
const dropIndexes = async () => {
  try {
    console.log("Dropping existing indexes...");
    const indexes = await mongoose.connection.db
      .collection("recipehistories")
      .indexes();

    for (const index of indexes) {
      // Skip the _id index which cannot be dropped
      if (index.name === "_id_") continue;

      console.log(`Dropping index: ${index.name}`);
      await mongoose.connection.db
        .collection("recipehistories")
        .dropIndex(index.name);
    }

    console.log("All non-_id indexes have been dropped");
    return true;
  } catch (error) {
    console.error(`Error dropping indexes: ${error.message}`);
    return false;
  }
};

// Find and fix duplicate entries
const findAndFixDuplicates = async () => {
  try {
    console.log("Finding potential duplicate entries...");

    // Find duplicates where recipe is null (the main issue)
    const duplicates = await mongoose.connection.db
      .collection("recipehistories")
      .aggregate([
        {
          $match: {
            recipe: null,
          },
        },
        {
          $group: {
            _id: {
              user: "$user",
              sourceId: "$sourceId",
              sourceType: "$sourceType",
            },
            count: { $sum: 1 },
            docs: { $push: { _id: "$_id", viewedAt: "$viewedAt" } },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
      ])
      .toArray();

    console.log(`Found ${duplicates.length} sets of duplicate entries`);

    // Fix each set of duplicates by keeping the most recent entry in each group
    for (const duplicate of duplicates) {
      console.log(
        `Fixing duplicate set for user: ${duplicate._id.user}, sourceId: ${duplicate._id.sourceId}`
      );

      // Sort by viewedAt desc to keep the most recent one
      const sortedDocs = duplicate.docs.sort(
        (a, b) => new Date(b.viewedAt) - new Date(a.viewedAt)
      );

      // Keep the first (most recent) entry and delete the rest
      const keepId = sortedDocs[0]._id;
      const deleteIds = sortedDocs.slice(1).map((doc) => doc._id);

      console.log(
        `Keeping entry ${keepId}, deleting ${deleteIds.length} duplicates`
      );

      if (deleteIds.length > 0) {
        const result = await mongoose.connection.db
          .collection("recipehistories")
          .deleteMany({ _id: { $in: deleteIds } });

        console.log(`Deleted ${result.deletedCount} duplicate entries`);
      }
    }

    return true;
  } catch (error) {
    console.error(`Error fixing duplicates: ${error.message}`);
    return false;
  }
};

// Rebuild indexes according to the schema
const rebuildIndexes = async () => {
  try {
    console.log("Rebuilding indexes according to updated schema...");

    // Index for non-null recipe references - using a simpler definition
    await mongoose.connection.db.collection("recipehistories").createIndex(
      { user: 1, recipe: 1 },
      {
        unique: true,
        partialFilterExpression: {
          recipe: { $type: "objectId" }, // Only apply to recipe fields that are ObjectIds
        },
      }
    );
    console.log("Created index for non-null recipe references");

    // Index for sourceId with sourceType
    await mongoose.connection.db.collection("recipehistories").createIndex(
      { user: 1, sourceId: 1, sourceType: 1 },
      {
        unique: true,
        partialFilterExpression: {
          sourceId: { $type: "string" }, // Only apply when sourceId is a string
          recipe: null, // And recipe is null
        },
      }
    );
    console.log("Created index for sourceId with sourceType");

    // Index for entries with null recipe and sourceId - making it simpler
    await mongoose.connection.db.collection("recipehistories").createIndex(
      { user: 1, recipeName: 1, viewedAt: 1 },
      {
        unique: true,
        partialFilterExpression: {
          recipe: null,
          sourceId: null,
          recipeName: { $type: "string" },
        },
      }
    );
    console.log("Created index for entries with null recipe and sourceId");

    // Index for fast queries by user
    await mongoose.connection.db
      .collection("recipehistories")
      .createIndex({ user: 1, viewedAt: -1 });
    console.log("Created index for fast queries by user");

    // Index on TTL field
    await mongoose.connection.db
      .collection("recipehistories")
      .createIndex({ viewedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
    console.log("Created TTL index");

    return true;
  } catch (error) {
    console.error(`Error rebuilding indexes: ${error.message}`);
    return false;
  }
};

// Main function
const main = async () => {
  const conn = await connectDB();

  try {
    // Start by fixing duplicates first
    console.log("Step 1: Finding and fixing duplicates");
    await findAndFixDuplicates();

    // Drop existing indexes
    console.log("Step 2: Dropping existing indexes");
    await dropIndexes();

    // Rebuild indexes
    console.log("Step 3: Rebuilding indexes");
    await rebuildIndexes();

    console.log("Script completed successfully!");
  } catch (error) {
    console.error(`Error during script execution: ${error.message}`);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }

  process.exit(0);
};

// Run the script
main();
