import mongoose from "mongoose";
import "dotenv/config";
import { Recipe } from "../models/index.js";
import RecipeHistory from "../models/recipeHistoryModel.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    return mongoose.connection;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const cleanupInactiveRecipes = async () => {
  console.log("Starting recipe cleanup process - 24-hour retention policy...");

  try {
    // Connect to the database
    await connectDB();

    // Find all external/AI recipes
    const externalRecipeTypes = ["spoonacular", "external", "ai", "unknown"];

    // First, get the top 5 most viewed external/AI recipes to keep
    const topRecipes = await Recipe.find({
      sourceType: { $in: externalRecipeTypes },
    })
      .sort({ viewCount: -1 })
      .limit(5);

    console.log(`Found ${topRecipes.length} top recipes to keep`);

    // Get the IDs of recipes to keep (includes favorited recipes)
    const recipesToKeep = await Recipe.find({
      $or: [
        // Either it's in the top 5 most viewed
        { _id: { $in: topRecipes.map((r) => r._id) } },
        // Or it has at least one favorite (keep regardless of view count)
        { favoriteCount: { $gt: 0 } },
      ],
    }).select("_id");

    const keepIds = recipesToKeep.map((r) => r._id);
    console.log(
      `Total recipes to keep (including favorites): ${keepIds.length}`
    );

    // Find all external/AI recipes that are not in the keep list
    const recipesToRemove = await Recipe.find({
      sourceType: { $in: externalRecipeTypes },
      _id: { $nin: keepIds },
    });

    const recipeIds = recipesToRemove.map((r) => r._id);
    console.log(`Found ${recipeIds.length} external/AI recipes to clean up`);

    if (recipeIds.length > 0) {
      // Delete the recipes
      const deleteResult = await Recipe.deleteMany({ _id: { $in: recipeIds } });
      console.log(
        `Deleted ${deleteResult.deletedCount} recipes, keeping only top 5 most viewed and favorites`
      );

      // Update any RecipeHistory entries to remove references to deleted recipes
      const updateResult = await RecipeHistory.updateMany(
        { recipe: { $in: recipeIds } },
        {
          $set: {
            recipe: null,
            // We'll keep the sourceId and sourceType so the history still makes sense
          },
        }
      );

      console.log(
        `Updated ${updateResult.modifiedCount} history entries to remove deleted recipe references`
      );
    } else {
      console.log("No recipes met the criteria for cleanup");
    }

    // Close the database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
    console.log(
      "Recipe cleanup completed successfully - 24-hour retention policy applied"
    );
  } catch (error) {
    console.error("Error during recipe cleanup:", error);
    // Ensure connection is closed even if there's an error
    try {
      await mongoose.connection.close();
    } catch (e) {
      console.error("Error closing database connection:", e);
    }
    process.exit(1);
  }
};

// Run the script
cleanupInactiveRecipes();
