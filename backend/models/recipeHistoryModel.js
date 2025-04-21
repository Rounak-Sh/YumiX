import mongoose from "mongoose";

const recipeHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
    },
    // For history entries related to a specific external recipe
    sourceType: {
      type: String,
      enum: ["local", "spoonacular", "ai", "external"],
      default: "local",
    },
    sourceId: {
      type: String,
    },
    // Recipe name for display purposes
    recipeName: {
      type: String,
    },
    // For search history entries, store the search query
    searchQuery: {
      type: String,
    },
    // Is this a search or just a view?
    fromSearch: {
      type: Boolean,
      default: false,
      index: true, // Add index for faster queries using this field
    },
    // When the recipe was viewed
    viewedAt: {
      type: Date,
      default: Date.now,
    },
    // Additional fields specific to the viewing session
    thumbnail: String,
    cuisine: String,
    mealType: String,
    dietType: [String],
    difficulty: String,
  },
  {
    timestamps: true,
  }
);

// Index for non-null recipe references - this is already correctly defined
recipeHistorySchema.index(
  {
    user: 1,
    recipe: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      recipe: { $exists: true, $ne: null }, // Only apply to non-null recipe fields
    },
  }
);

// Updated index for sourceId with sourceType - ensure it only applies to non-null sourceIds
recipeHistorySchema.index(
  {
    user: 1,
    sourceId: 1,
    sourceType: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      sourceId: { $exists: true, $ne: null, $ne: "" }, // Only apply to valid sourceIds
      recipe: { $eq: null }, // Only apply when recipe is null
    },
  }
);

// Modified index for entries with null recipe and sourceId - make sure this doesn't conflict
// with the main use cases by adding a more specific condition
recipeHistorySchema.index(
  {
    user: 1,
    recipeName: 1, // Add recipeName to make this more unique
    viewedAt: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      recipe: { $eq: null },
      sourceId: { $in: [null, ""] },
      recipeName: { $exists: true, $ne: null }, // Only apply when recipeName exists
    },
  }
);

// Create index for fast queries by user
recipeHistorySchema.index({ user: 1, viewedAt: -1 });

const RecipeHistory = mongoose.model("RecipeHistory", recipeHistorySchema);

export default RecipeHistory;
