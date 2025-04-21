import { Router } from "express";
import { recipeController } from "../controllers/index.js";
import { protect } from "../middleware/authMiddleware.js";
import { searchLimitMiddleware } from "../middleware/rateLimitMiddleware.js";
import User from "../models/userModel.js";
import Recipe from "../models/recipeModel.js";
import mongoose from "mongoose";

const router = Router();

// Public routes
router.get("/featured", recipeController.getFeaturedRecipes);
router.get(
  "/search",
  protect,
  searchLimitMiddleware,
  recipeController.searchFeaturedRecipes
);

// Protected routes
router.use(protect);

// Place the favorites routes BEFORE the :recipeId route
router.get("/favorites", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user found",
      });
    }

    const user = await User.findById(req.user.id).select("favorites").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.favorites || !Array.isArray(user.favorites)) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get detailed recipe information for each favorite
    const favorites = await Promise.all(
      user.favorites.map(async (recipeId) => {
        try {
          if (!mongoose.Types.ObjectId.isValid(recipeId)) {
            console.error("Invalid recipe ID:", recipeId);
            return null;
          }

          // Try to find by _id first
          let recipe = await Recipe.findById(recipeId).lean();

          // If not found and it might be a sourceId, try that
          if (!recipe && recipeId) {
            recipe = await Recipe.findOne({
              sourceId: recipeId.toString(),
            }).lean();
          }

          if (!recipe) {
            return null;
          }
          return recipe;
        } catch (err) {
          console.error("Error fetching recipe:", recipeId, err);
          return null;
        }
      })
    );

    // Filter out any null values from failed recipe fetches
    const validFavorites = favorites.filter((recipe) => recipe !== null);

    res.json({
      success: true,
      data: validFavorites,
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching favorites",
      error: error.message,
    });
  }
});

router.post("/favorites", async (req, res) => {
  try {
    const { recipeId, isFavorite, recipeData } = req.body;

    console.log("Favorites API request:", {
      recipeId,
      isFavorite,
      hasRecipeData: !!recipeData,
      recipeSource: recipeData?.source || recipeData?.sourceType,
      recipeIdType: typeof recipeId,
    });

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if recipe exists
    let recipe = null;
    const isAIRecipe =
      recipeData?.source === "ai" || recipeData?.sourceType === "ai";

    // For AI recipes, first try to find by a consistent ID pattern
    if (isAIRecipe) {
      console.log("Processing AI-generated recipe:", {
        name: recipeData?.name,
        recipeId,
      });

      // Try to find by sourceId that might match AI pattern
      if (recipeId.startsWith("ai-")) {
        recipe = await Recipe.findOne({ sourceId: recipeId });
      }
    }
    // Otherwise, try to find by _id if it's a valid ObjectId
    else if (mongoose.Types.ObjectId.isValid(recipeId)) {
      recipe = await Recipe.findById(recipeId);
    }

    // Try to find by sourceId as a fallback
    if (!recipe) {
      recipe = await Recipe.findOne({ sourceId: recipeId.toString() });
    }

    // If recipe doesn't exist but we have recipe data, create it
    if (!recipe && recipeData) {
      // Find the first admin user to set as creator
      // This is a workaround for the required createdBy field
      const Admin = mongoose.model("Admin");
      let adminId;

      try {
        const admin = await Admin.findOne();
        if (admin) {
          adminId = admin._id;
        } else {
          // If no admin exists, use a default ObjectId
          adminId = new mongoose.Types.ObjectId("000000000000000000000000");
        }
      } catch (err) {
        console.error("Error finding admin:", err);
        // Use a default ObjectId if admin lookup fails
        adminId = new mongoose.Types.ObjectId("000000000000000000000000");
      }

      // For AI recipes, use the stable name-based ID as sourceId if possible
      const recipeSourceId =
        isAIRecipe && recipeId.startsWith("ai-")
          ? recipeId
          : recipeId.toString();

      recipe = new Recipe({
        sourceId: recipeSourceId,
        name: recipeData.name,
        image: recipeData.image,
        ingredients: recipeData.ingredients || [],
        instructions:
          recipeData.instructions ||
          "No instructions provided for this recipe.",
        prepTime: recipeData.prepTime || 30,
        servings: recipeData.servings || 4,
        createdBy: adminId, // Use the admin ID or default
        isFeatured: false,
        favoriteCount: isFavorite ? 1 : 0, // Initialize favorite count
        // Add source info if it's an AI recipe
        ...(isAIRecipe
          ? {
              source: "ai",
              sourceType: "ai",
            }
          : {}),
      });

      try {
        await recipe.save();
        console.log(
          `New recipe created and saved with ID: ${recipe._id} and sourceId: ${recipe.sourceId}`
        );
      } catch (saveError) {
        console.error("Error saving recipe:", saveError);
        return res.status(500).json({
          success: false,
          message: "Error creating recipe: " + saveError.message,
        });
      }
    }

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found and couldn't be created",
      });
    }

    // Use the recipe ID for favorites
    const recipeIdToUse = recipe._id.toString();

    // Check if the recipe is already in favorites
    const isAlreadyFavorite = user.favorites.includes(recipeIdToUse);

    if (isFavorite) {
      // Add to favorites if not already present
      if (!isAlreadyFavorite) {
        user.favorites.push(recipeIdToUse);

        // Increment the favoriteCount on the recipe
        await Recipe.findByIdAndUpdate(recipeIdToUse, {
          $inc: { favoriteCount: 1 },
        });
        console.log(`Incremented favoriteCount for recipe ${recipeIdToUse}`);
      }
    } else {
      // Remove from favorites if it was favorited before
      if (isAlreadyFavorite) {
        user.favorites = user.favorites.filter(
          (id) => id.toString() !== recipeIdToUse
        );

        // Decrement the favoriteCount on the recipe, ensuring it doesn't go below 0
        await Recipe.findByIdAndUpdate(recipeIdToUse, {
          $inc: { favoriteCount: -1 },
        });
        console.log(`Decremented favoriteCount for recipe ${recipeIdToUse}`);
      }
    }

    await user.save();

    res.json({
      success: true,
      message: isFavorite
        ? "Recipe added to favorites"
        : "Recipe removed from favorites",
      data: user.favorites,
      recipeId: recipeIdToUse, // Return the actual ID used
      originalId: recipeId, // Return the original ID for reference
    });
  } catch (error) {
    console.error("Error in favorites route:", error);
    res.status(500).json({
      success: false,
      message: "Error updating favorites",
      error: error.message,
    });
  }
});

// Other protected routes
router.post(
  "/search",
  protect,
  searchLimitMiddleware,
  recipeController.searchRecipes
);
router.get("/trending", recipeController.getTrendingRecipes);
router.get("/history", protect, recipeController.getRecipeHistory);
router.delete("/history", protect, recipeController.clearRecipeHistory);
router.post("/history/:recipeId", protect, recipeController.addToRecipeHistory);
router.get("/video", recipeController.getRecipeVideo);

// External recipe routes
router.get("/external/:id", protect, recipeController.getExternalRecipeDetails);

// Place the :recipeId route LAST
router.get("/:recipeId", recipeController.getRecipeById);

// Add a test endpoint
router.get("/test", (req, res) => {
  res.json({ message: "Recipe routes are working" });
});

export default router;
