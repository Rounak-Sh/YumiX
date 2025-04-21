import { Recipe, User, AdminRecipe } from "../models/index.js";
import RecipeHistory from "../models/recipeHistoryModel.js";
import { redisClient } from "../config/redisConfig.js";
import { safeRedisGet, safeRedisSet } from "../config/safeRedisOperations.js";
import axios from "axios";
import mongoose from "mongoose";

const SPOONACULAR_BASE_URL = "https://api.spoonacular.com/recipes";

const recipeController = {
  // Generate recipe using AI
  generateRecipe: async (req, res) => {
    try {
      const { ingredients } = req.body;

      // Check cache first
      const cacheKey = `recipe:${ingredients.sort().join(",")}`;
      const cachedRecipe = await redisClient.get(cacheKey);

      if (cachedRecipe) {
        return res.status(200).json({
          success: true,
          data: JSON.parse(cachedRecipe),
          source: "cache",
        });
      }

      // If not in cache, generate using AI
      const aiResponse = await axios.post(
        "YOUR_AI_ENDPOINT",
        {
          ingredients,
          // Add any other parameters needed for AI
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.AI_API_KEY}`,
          },
        }
      );

      const recipeData = {
        name: aiResponse.data.name,
        ingredients: ingredients,
        instructions:
          aiResponse.data.steps || "No instructions provided for this recipe.",
        image:
          aiResponse.data.image ||
          "https://via.placeholder.com/300?text=No+Image",
        prepTime: aiResponse.data.prepTime || 30,
        servings: aiResponse.data.servings || 4,
        nutritionFacts: aiResponse.data.nutrition || {},
        createdBy: req.admin.id, // From admin middleware
      };

      const recipe = new Recipe(recipeData);
      await recipe.save();

      // Cache the result
      await redisClient.setEx(cacheKey, 7200, JSON.stringify(recipeData)); // 2 hours

      res.status(201).json({
        success: true,
        data: recipe,
        source: "ai",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating recipe",
        error: error.message,
      });
    }
  },

  // Get featured recipes
  getFeaturedRecipes: async (req, res) => {
    try {
      console.log("getFeaturedRecipes request received");
      // First check cache
      const cacheKey = "featured_recipes";
      console.log("Checking cache with key:", cacheKey);

      // Use the imported safeRedisGet instead of safeRedisOperation
      const cachedRecipes = await safeRedisGet(cacheKey);

      if (cachedRecipes) {
        console.log("Found cached featured recipes");
        return res.status(200).json({
          success: true,
          data: cachedRecipes, // safeRedisGet already handles JSON parsing
          source: "cache",
        });
      }

      console.log("No cache found, fetching from database");
      // Get admin-featured recipes from AdminRecipe collection
      const adminFeaturedRecipes = await AdminRecipe.find({
        isFeatured: true,
      }).sort({ createdAt: -1 });

      console.log("Admin featured recipes found:", adminFeaturedRecipes.length);

      // Also get legacy featured recipes from Recipe collection
      const localFeaturedRecipes = await Recipe.find({ isFeatured: true }).sort(
        { createdAt: -1 }
      );

      console.log("Local featured recipes found:", localFeaturedRecipes.length);

      // If no featured recipes exist in either collection, create a test one
      if (
        adminFeaturedRecipes.length === 0 &&
        localFeaturedRecipes.length === 0
      ) {
        console.log("No featured recipes found, creating test recipe");
        // Create a test recipe in AdminRecipe collection
        const testRecipe = new AdminRecipe({
          name: "Test Featured Recipe",
          sourceId: 1000001,
          ingredients: ["Ingredient 1", "Ingredient 2", "Ingredient 3"],
          instructions: "These are test instructions for the featured recipe.",
          image:
            "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?q=80&w=1776&auto=format&fit=crop",
          prepTime: 30,
          servings: 4,
          isFeatured: true,
        });

        await testRecipe.save();
        console.log("Test recipe created successfully");

        // Add the newly created recipe to adminFeaturedRecipes
        adminFeaturedRecipes.push(testRecipe);
      }

      // Combine local featured recipes
      const allLocalRecipes = [
        ...adminFeaturedRecipes.map((recipe) => ({
          ...recipe.toObject(),
          source: "admin",
        })),
        ...localFeaturedRecipes.map((recipe) => ({
          ...recipe.toObject(),
          source: "local",
        })),
      ];

      console.log("Total local recipes:", allLocalRecipes.length);

      // If we have enough local recipes, don't fetch from Spoonacular
      if (allLocalRecipes.length >= 10) {
        console.log(
          "Enough local recipes found, not fetching from Spoonacular"
        );
        const limitedRecipes = allLocalRecipes.slice(0, 10);

        // Cache the results
        await safeRedisSet(cacheKey, limitedRecipes, { EX: 3600 });
        console.log("Results cached successfully");

        return res.status(200).json({
          success: true,
          data: limitedRecipes,
          source: "api",
        });
      }

      // Check if Spoonacular API key is configured
      if (!process.env.SPOONACULAR_API_KEY) {
        console.error("Spoonacular API key not configured");
        return res.status(200).json({
          success: true,
          data: allLocalRecipes,
          source: "local",
          message: "Using only local recipes due to service configuration",
        });
      }

      console.log("Fetching additional recipes from Spoonacular");
      // Get popular recipes from Spoonacular to fill up to 10 recipes total
      let spoonacularRecipes = [];
      try {
        const response = await axios.get(`${SPOONACULAR_BASE_URL}/random`, {
          params: {
            apiKey: process.env.SPOONACULAR_API_KEY,
            number: 10 - allLocalRecipes.length,
            tags: "popular",
          },
        });

        console.log("Spoonacular API response received:", {
          status: response.status,
          recipesCount: response.data?.recipes?.length,
        });

        spoonacularRecipes = response.data.recipes.map((recipe) => ({
          name: recipe.title,
          ingredients: recipe.extendedIngredients.map((ing) => ing.original),
          instructions: recipe.instructions,
          image: recipe.image,
          prepTime: recipe.readyInMinutes,
          servings: recipe.servings,
          sourceId: recipe.id,
          source: "spoonacular",
          isFeatured: true,
        }));

        console.log(
          "Spoonacular recipes processed:",
          spoonacularRecipes.length
        );
      } catch (spoonacularError) {
        console.error("Error fetching from Spoonacular:", spoonacularError);
        // Continue with just the local recipes
      }

      // Combine all sources
      const allFeaturedRecipes = [...allLocalRecipes, ...spoonacularRecipes];
      console.log("Total featured recipes:", allFeaturedRecipes.length);

      // Cache the results
      await safeRedisSet(cacheKey, allFeaturedRecipes, { EX: 3600 });
      console.log("Results cached successfully");

      res.status(200).json({
        success: true,
        data: allFeaturedRecipes,
        source: "api",
      });
    } catch (error) {
      console.error("Error in getFeaturedRecipes:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching featured recipes",
        error: error.message,
      });
    }
  },

  // Search featured recipes by name
  searchFeaturedRecipes: async (req, res) => {
    try {
      // Add comprehensive request logging
      console.log("Search request received:", {
        query: req.query,
        url: req.originalUrl,
        userId: req.user?._id,
      });

      const { query } = req.query;

      if (!query || query.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      // Add defensive error handling for searchInfo
      if (!req.searchInfo) {
        console.error("searchInfo missing from request", {
          url: req.originalUrl,
          user: req.user?._id,
        });
        req.searchInfo = {
          maxSearches: 10, // Default to basic plan
          dailySearchCount: 0,
          remainingSearches: 10,
        };
      }

      // Get search info from middleware with defensive handling
      const maxSearches = req.searchInfo.maxSearches || 10;
      const dailySearchCount = req.searchInfo.dailySearchCount || 0;
      const remainingSearches =
        req.searchInfo.remainingSearches ||
        Math.max(0, maxSearches - dailySearchCount);

      // Determine if this plan has unlimited searches (Pro plan)
      const hasUnlimitedSearches = maxSearches === 999999;

      console.log("Search info:", {
        maxSearches,
        dailySearchCount,
        remainingSearches,
        hasUnlimitedSearches,
      });

      // Check if query is exactly "featured"
      if (query.toLowerCase() === "featured") {
        return res.status(200).json({
          success: true,
          redirect: true,
          to: "/featured-recipes",
          message: "Redirecting to featured recipes",
          remainingSearches: hasUnlimitedSearches ? 999999 : remainingSearches,
          maxSearches: maxSearches,
        });
      }

      console.log(`Searching for recipes with query: ${query}`);

      // First check cache using safer Redis operations with error handling
      const cacheKey = `search_featured:${query.toLowerCase()}`;
      let cachedResults = null;

      try {
        cachedResults = await safeRedisGet(cacheKey);
        console.log(`Cache check result: ${cachedResults ? "Hit" : "Miss"}`);
      } catch (cacheError) {
        console.error("Error checking cache:", cacheError);
        // Continue without cached results on error
      }

      if (cachedResults) {
        try {
          console.log(
            `Returning ${cachedResults.length} cached recipe results`
          );
          return res.status(200).json({
            success: true,
            recipes: cachedResults,
            source: "cache",
            remainingSearches: hasUnlimitedSearches
              ? 999999
              : remainingSearches,
            maxSearches: maxSearches,
          });
        } catch (responseError) {
          console.error("Error sending cached results:", responseError);
          // Continue to fetch from database if sending cached results fails
        }
      }

      // Database queries with error handling
      let adminFeaturedRecipes = [];
      let legacyFeaturedRecipes = [];

      try {
        // Search regex pattern
        const regex = new RegExp(query, "i");

        // Search admin featured recipes
        adminFeaturedRecipes = await AdminRecipe.find({
          isFeatured: true,
          name: { $regex: regex },
        }).select("_id name image prepTime servings sourceId");

        console.log(
          `Found ${adminFeaturedRecipes.length} admin featured recipes`
        );
      } catch (adminError) {
        console.error("Error searching admin recipes:", adminError);
        // Continue with empty results
      }

      try {
        // Search local featured recipes
        const regex = new RegExp(query, "i");
        legacyFeaturedRecipes = await Recipe.find({
          isFeatured: true,
          name: { $regex: regex },
        }).select("_id name image prepTime servings");

        console.log(
          `Found ${legacyFeaturedRecipes.length} legacy featured recipes`
        );
      } catch (legacyError) {
        console.error("Error searching legacy recipes:", legacyError);
        // Continue with empty results
      }

      // Format response for admin recipes
      const adminResults = adminFeaturedRecipes.map((recipe) => ({
        _id: recipe._id,
        name: recipe.name,
        image: recipe.image,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        sourceId: recipe.sourceId,
        source: "admin",
      }));

      // Format response for legacy recipes
      const legacyResults = legacyFeaturedRecipes.map((recipe) => ({
        _id: recipe._id,
        name: recipe.name,
        image: recipe.image,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        source: "local",
      }));

      // Combine results from database
      const dbResults = [...adminResults, ...legacyResults];

      // If we have enough results from the database, return those without calling Spoonacular
      if (dbResults.length >= 5) {
        // Try to cache results, but don't fail if caching fails
        try {
          await safeRedisSet(cacheKey, dbResults, { EX: 3600 });
          console.log("Results cached successfully");
        } catch (cacheError) {
          console.error("Error caching results:", cacheError);
          // Continue without caching
        }

        console.log(`Returning ${dbResults.length} database recipe results`);
        return res.status(200).json({
          success: true,
          recipes: dbResults,
          remainingSearches: hasUnlimitedSearches ? 999999 : remainingSearches,
          maxSearches: maxSearches,
        });
      }

      // Otherwise, also search from Spoonacular if API key is available
      let spoonacularResults = [];

      if (process.env.SPOONACULAR_API_KEY) {
        try {
          console.log(`Searching Spoonacular API for: ${query}`);
          const response = await axios.get(
            `${SPOONACULAR_BASE_URL}/complexSearch`,
            {
              params: {
                apiKey: process.env.SPOONACULAR_API_KEY,
                query: query,
                number: 10,
                addRecipeInformation: true,
                fillIngredients: true,
              },
              timeout: 8000, // Add timeout to prevent hanging requests
            }
          );

          if (response.data && response.data.results) {
            console.log(
              `Found ${response.data.results.length} recipes from Spoonacular`
            );

            spoonacularResults = response.data.results.map((recipe) => ({
              sourceId: recipe.id,
              name: recipe.title,
              image: recipe.image,
              prepTime: recipe.readyInMinutes,
              servings: recipe.servings,
              ingredients:
                recipe.extendedIngredients?.map((ing) => ing.original) || [],
              instructions: recipe.instructions || "",
              source: "spoonacular",
            }));
          }
        } catch (error) {
          console.error("Error searching Spoonacular API:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
          // Continue with just the database results
        }
      } else {
        console.log(
          "Spoonacular API key not available, skipping external search"
        );
      }

      // Combine all results
      const allResults = [...dbResults, ...spoonacularResults];

      // Try to cache results, but don't fail if caching fails
      try {
        await safeRedisSet(cacheKey, allResults, { EX: 3600 });
        console.log("Combined results cached successfully");
      } catch (cacheError) {
        console.error("Error caching combined results:", cacheError);
        // Continue without caching
      }

      // Return response
      if (allResults.length > 0) {
        console.log(`Returning ${allResults.length} total recipe results`);
        return res.status(200).json({
          success: true,
          recipes: allResults,
          remainingSearches: hasUnlimitedSearches ? 999999 : remainingSearches,
          maxSearches: maxSearches,
        });
      } else {
        console.log(`No recipes found for query: ${query}`);
        return res.status(200).json({
          success: true,
          message: "No matching recipes found. Try searching by ingredients!",
          recipes: [],
          remainingSearches: hasUnlimitedSearches ? 999999 : remainingSearches,
          maxSearches: maxSearches,
        });
      }
    } catch (error) {
      console.error("Error searching featured recipes:", error);
      // Return a friendlier error response
      res.status(500).json({
        success: false,
        message: "Error searching recipes. Please try again later.",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  },

  // Search recipes
  searchRecipes: async (req, res) => {
    try {
      console.log("Recipe search request:", {
        user: req.user?._id,
        isSubscribed: req.user?.isSubscribed,
        url: req.originalUrl,
        body: req.body,
      });

      // Validate request body
      if (!req.body || !req.body.ingredients) {
        return res.status(400).json({
          success: false,
          message: "Ingredients are required for search",
        });
      }

      const { ingredients } = req.body;
      const userId = req.user._id;

      // Validate ingredients format
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Ingredients must be a non-empty array",
        });
      }

      // Check if Spoonacular API key is configured
      if (!process.env.SPOONACULAR_API_KEY) {
        console.error("Spoonacular API key not configured");
        return res.status(500).json({
          success: false,
          message: "Recipe search service is not properly configured",
        });
      }

      // Add defensive error handling for searchInfo
      if (!req.searchInfo) {
        console.error("searchInfo missing from request in searchRecipes", {
          url: req.originalUrl,
          user: req.user?._id,
        });
        req.searchInfo = {
          maxSearches: 10, // Default to basic plan
          dailySearchCount: 0,
          remainingSearches: 10,
        };
      }

      // Get search info from middleware with defensive handling
      const maxSearches = req.searchInfo.maxSearches || 10;
      const dailySearchCount = req.searchInfo.dailySearchCount || 0;
      const remainingSearches =
        req.searchInfo.remainingSearches ||
        Math.max(0, maxSearches - dailySearchCount);

      // Determine if this plan has unlimited searches (Pro plan)
      const hasUnlimitedSearches = maxSearches === 999999;

      console.log("Search recipe info:", {
        maxSearches,
        dailySearchCount,
        remainingSearches,
        hasUnlimitedSearches,
      });

      // Check cache first using safer Redis operations
      const cacheKey = `recipe_search:${ingredients.join(",")}`;
      console.log("Checking cache with key:", cacheKey);

      let cachedResults = null;
      try {
        cachedResults = await safeRedisGet(cacheKey);
        console.log(`Cache check result: ${cachedResults ? "Hit" : "Miss"}`);
      } catch (cacheError) {
        console.error("Error checking cache:", cacheError);
        // Continue without cached results
      }

      if (cachedResults) {
        try {
          console.log("Found cached results");
          console.log(`Returning ${cachedResults.length} recipes from cache`);

          return res.status(200).json({
            success: true,
            data: cachedResults,
            source: "cache",
            remainingSearches: hasUnlimitedSearches
              ? 999999
              : remainingSearches,
            maxSearches: maxSearches,
          });
        } catch (responseError) {
          console.error("Error sending cached results:", responseError);
          // Continue to API search if sending cached results fails
        }
      }

      // Try to find fallback recipes from database first
      console.log("Trying to find fallback recipes from database");
      try {
        // Convert ingredients to regex patterns for flexible matching
        const ingredientPatterns = ingredients.map(
          (ingredient) => new RegExp(ingredient.trim(), "i")
        );

        // Find recipes that match any of the ingredients
        const dbRecipes = await Recipe.find({
          ingredients: { $elemMatch: { $in: ingredientPatterns } },
        }).limit(10);

        console.log(`Found ${dbRecipes.length} fallback recipes in database`);

        // If we have DB recipes, use them as fallback before calling API
        if (dbRecipes.length > 0) {
          // Try to cache results
          try {
            await safeRedisSet(cacheKey, dbRecipes, { EX: 3600 });
            console.log("Fallback DB results cached successfully");
          } catch (cacheError) {
            console.error("Error caching fallback results:", cacheError);
          }

          // Save to user's recipe history
          try {
            // Only save to history if we have a valid user ID
            if (userId) {
              const historyEntry = new RecipeHistory({
                user: userId,
                sourceType: "database",
                recipeName: `Ingredient Search: ${ingredients.join(", ")}`,
                viewedAt: new Date(),
              });
              await historyEntry.save();
              console.log("DB fallback search saved to history");
            } else {
              console.log("Skipping history save - no user ID available");
            }
          } catch (historyError) {
            console.error(
              "Error saving fallback search to history:",
              historyError
            );
          }

          // Return DB results with appropriate message
          return res.status(200).json({
            success: true,
            data: dbRecipes,
            source: "database",
            message: "Results from database only. External API quota exceeded.",
            remainingSearches: hasUnlimitedSearches
              ? 999999
              : remainingSearches,
            maxSearches: maxSearches,
          });
        }
      } catch (dbError) {
        console.error("Error finding fallback recipes:", dbError);
        // Continue to API search if DB search fails
      }

      console.log("No cache found, calling Spoonacular API");
      console.log("API request params:", {
        apiKey: process.env.SPOONACULAR_API_KEY ? "Present" : "Missing",
        ingredients: ingredients.join(","),
        number: 10,
        ranking: 2,
        ignorePantry: true,
      });

      let response;
      try {
        // Search using Spoonacular API with timeout
        response = await axios.get(
          `${SPOONACULAR_BASE_URL}/findByIngredients`,
          {
            params: {
              apiKey: process.env.SPOONACULAR_API_KEY,
              ingredients: ingredients.join(","),
              number: 10,
              ranking: 2,
              ignorePantry: true,
            },
            timeout: 10000, // 10 second timeout
          }
        );

        console.log("Spoonacular API response received");

        // Fetch complete recipe information for each result
        const completeRecipes = await Promise.all(
          response.data.map(async (recipe) => {
            try {
              console.log(
                `Fetching detailed information for recipe ID: ${recipe.id}`
              );
              const detailResponse = await axios.get(
                `${SPOONACULAR_BASE_URL}/${recipe.id}/information`,
                {
                  params: {
                    apiKey: process.env.SPOONACULAR_API_KEY,
                    includeNutrition: true,
                  },
                  timeout: 8000, // Increase timeout for detailed information
                }
              );

              console.log(
                `Recipe ${recipe.id} details received, instructions length: ${
                  detailResponse.data.instructions?.length || 0
                }`
              );

              // Log a sample of the instructions to verify they're being received
              if (detailResponse.data.instructions) {
                console.log(
                  `Sample instructions: ${detailResponse.data.instructions.substring(
                    0,
                    50
                  )}...`
                );
              } else {
                console.log(`No instructions found for recipe ${recipe.id}`);
              }

              // Format the recipe data to match our structure
              return {
                sourceId: recipe.id,
                name: detailResponse.data.title,
                image: detailResponse.data.image,
                prepTime: detailResponse.data.readyInMinutes || 30,
                servings: detailResponse.data.servings || 4,
                ingredients:
                  detailResponse.data.extendedIngredients?.map(
                    (ing) => ing.original
                  ) || [],
                instructions:
                  detailResponse.data.instructions ||
                  "No instructions available",
                analyzedInstructions:
                  detailResponse.data.analyzedInstructions || [],
                source: "spoonacular",
                nutritionFacts: {
                  calories:
                    detailResponse.data.nutrition?.nutrients.find(
                      (n) => n.name === "Calories"
                    )?.amount || 0,
                  protein:
                    detailResponse.data.nutrition?.nutrients.find(
                      (n) => n.name === "Protein"
                    )?.amount || 0,
                  carbs:
                    detailResponse.data.nutrition?.nutrients.find(
                      (n) => n.name === "Carbohydrates"
                    )?.amount || 0,
                  fats:
                    detailResponse.data.nutrition?.nutrients.find(
                      (n) => n.name === "Fat"
                    )?.amount || 0,
                },
              };
            } catch (error) {
              console.error(
                `Error fetching details for recipe ${recipe.id}:`,
                error
              );
              // Return basic recipe info if detailed fetch fails
              return {
                sourceId: recipe.id,
                name: recipe.title,
                image: recipe.image,
                prepTime: 30,
                servings: 4,
                ingredients:
                  recipe.usedIngredients?.map((ing) => ing.original) || [],
                instructions: "Instructions temporarily unavailable",
                analyzedInstructions: [],
                source: "spoonacular",
              };
            }
          })
        );

        // Cache the complete results
        try {
          await safeRedisSet(cacheKey, completeRecipes, { EX: 3600 });
          console.log("API results cached successfully");
        } catch (cacheError) {
          console.error("Error caching API results:", cacheError);
        }

        // Save to user's recipe history
        try {
          if (userId) {
            const historyEntry = new RecipeHistory({
              user: userId,
              sourceType: "spoonacular",
              recipeName: `Ingredient Search: ${ingredients.join(", ")}`,
              viewedAt: new Date(),
            });
            await historyEntry.save();
            console.log("API search saved to history");
          }
        } catch (historyError) {
          console.error("Error saving search to history:", historyError);
        }

        return res.status(200).json({
          success: true,
          data: completeRecipes,
          source: "api",
          remainingSearches: hasUnlimitedSearches ? 999999 : remainingSearches,
          maxSearches: maxSearches,
        });
      } catch (error) {
        console.error("Error calling Spoonacular API:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          code: error.code,
        });

        // Check if it's a 402 Payment Required (quota exceeded)
        if (error.response?.status === 402) {
          console.log("API quota exceeded, returning friendly message");

          // Return a helpful message about quota limit
          return res.status(200).json({
            success: true,
            data: [],
            source: "api_quota_exceeded",
            message:
              "Recipe search unavailable currently due to API quota limits. Please try again tomorrow or try a different search.",
            remainingSearches: hasUnlimitedSearches
              ? 999999
              : remainingSearches,
            maxSearches: maxSearches,
          });
        }

        // Return a helpful error based on the type of failure
        if (error.code === "ECONNABORTED") {
          return res.status(503).json({
            success: false,
            message: "Recipe service timed out. Please try again later.",
            remainingSearches: hasUnlimitedSearches
              ? 999999
              : remainingSearches,
            maxSearches: maxSearches,
          });
        }

        return res.status(502).json({
          success: false,
          message: "Unable to reach recipe service. Please try again later.",
          remainingSearches: hasUnlimitedSearches ? 999999 : remainingSearches,
          maxSearches: maxSearches,
        });
      }
    } catch (error) {
      console.error("Recipe search error:", error);
      res.status(500).json({
        success: false,
        message: "Error searching recipes. Please try again later.",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  },

  // Get recipe by ID
  getRecipeById: async (req, res) => {
    try {
      const { recipeId } = req.params;
      const { fromSearch } = req.query; // Get fromSearch flag from query parameters

      console.log(
        `Getting recipe by ID: ${recipeId}, fromSearch: ${fromSearch}`
      );

      // First try to find by _id
      let recipe = null;
      if (mongoose.Types.ObjectId.isValid(recipeId)) {
        recipe = await Recipe.findById(recipeId);
        console.log(`Looking up by _id: ${recipe ? "Found" : "Not found"}`);
      }

      // If not found and recipeId might be a sourceId, try that
      if (!recipe) {
        recipe = await Recipe.findOne({ sourceId: recipeId.toString() });
        console.log(
          `Looking up by sourceId: ${recipe ? "Found" : "Not found"}`
        );
      }

      // If not found in our database, check if it's a Spoonacular ID and fetch from their API
      if (!recipe && !isNaN(recipeId) && process.env.SPOONACULAR_API_KEY) {
        console.log(
          `Recipe not found in database, checking Spoonacular for ID: ${recipeId}`
        );
        try {
          const response = await axios.get(
            `${SPOONACULAR_BASE_URL}/${recipeId}/information`,
            {
              params: {
                apiKey: process.env.SPOONACULAR_API_KEY,
                includeNutrition: true,
              },
              timeout: 8000, // 8 second timeout
            }
          );

          const recipeData = response.data;

          // Log to verify instructions were received
          console.log(
            `Spoonacular recipe found, instructions length: ${
              recipeData.instructions?.length || 0
            }`
          );
          if (recipeData.instructions) {
            console.log(
              `Sample instructions: ${recipeData.instructions.substring(
                0,
                50
              )}...`
            );
          }

          // Create and save the recipe to our database for future use
          recipe = new Recipe({
            sourceId: recipeData.id.toString(),
            name: recipeData.title,
            ingredients: recipeData.extendedIngredients.map(
              (ing) => ing.original
            ),
            instructions: recipeData.instructions || "No instructions provided",
            image: recipeData.image,
            prepTime: recipeData.readyInMinutes || 30,
            servings: recipeData.servings || 4,
            source: "spoonacular",
            nutritionFacts: {
              calories:
                recipeData.nutrition?.nutrients.find(
                  (n) => n.name === "Calories"
                )?.amount || 0,
              protein:
                recipeData.nutrition?.nutrients.find(
                  (n) => n.name === "Protein"
                )?.amount || 0,
              carbs:
                recipeData.nutrition?.nutrients.find(
                  (n) => n.name === "Carbohydrates"
                )?.amount || 0,
              fats:
                recipeData.nutrition?.nutrients.find((n) => n.name === "Fat")
                  ?.amount || 0,
            },
          });

          // Set a default createdBy to avoid validation errors
          const Admin = mongoose.model("Admin");
          const admin = await Admin.findOne();
          if (admin) {
            recipe.createdBy = admin._id;
          } else {
            // Use a placeholder ObjectId if no admin exists
            recipe.createdBy = new mongoose.Types.ObjectId();
          }

          await recipe.save();
          console.log(`Saved Spoonacular recipe to database: ${recipe._id}`);
        } catch (error) {
          console.error("Error fetching recipe from Spoonacular:", error);
          // Continue to 404 if Spoonacular fetch fails
        }
      }

      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: "Recipe not found",
        });
      }

      // Log to make sure the recipe has complete data
      console.log(
        `Recipe found: ${recipe.name}, instructions length: ${
          recipe.instructions?.length || 0
        }`
      );

      // Increment view count
      await recipeController.incrementViewCount(recipeId);

      // Track this view in history if user is authenticated
      if (req.user && req.user._id) {
        await recipeController.trackRecipeView(
          req.user._id,
          recipeId,
          recipe,
          fromSearch === "true" || recipe.source === "ai"
        );
      }

      res.json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      console.error("Error fetching recipe details:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching recipe details",
        error: error.message,
      });
    }
  },

  // Get recipe video from YouTube
  getRecipeVideo: async (req, res) => {
    try {
      const { query } = req.query;

      // Use the frontend-specific YouTube API key if available, fall back to the admin key
      const apiKey =
        process.env.YOUTUBE_API_KEY_FRONTEND || process.env.YOUTUBE_API_KEY;

      // Debug logs (similar to admin controller)
      console.log("\n=== Get Recipe Video Request (User) ===");
      console.log("Query:", query);
      console.log("User:", req.user?._id);
      console.log("YouTube API Key:", apiKey ? "Present" : "Missing");

      if (!apiKey) {
        console.error("YouTube API key missing for frontend");
        return res.status(500).json({
          success: false,
          error: "YouTube API key not configured",
        });
      }

      // Check if YouTube quota has been exceeded via Redis
      try {
        if (redisClient) {
          const quotaExceeded = await redisClient.get("youtube_quota_exceeded");
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
            key: apiKey,
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
          if (redisClient) {
            await redisClient.setEx(
              "youtube_quota_exceeded",
              6 * 60 * 60,
              "true"
            );
          }
        } catch (redisError) {
          console.error("Redis error when setting quota flag:", redisError);
        }

        return res.json({
          success: false,
          error: "YouTube API quota exceeded",
          message: "Video search temporarily unavailable",
          quotaExceeded: true,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to fetch video",
        error: error.response?.data?.error?.message || error.message,
      });
    }
  },

  // Add the getTrendingRecipes function to the recipeController
  getTrendingRecipes: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 5;

      console.log("Fetching trending recipes. Limit:", limit);

      // Log current view counts to help debug
      const topViewedRecipes = await Recipe.find()
        .sort({ viewCount: -1 })
        .limit(5);
      console.log("Top 5 recipes by view count:");
      topViewedRecipes.forEach((recipe) => {
        console.log(
          `- ${recipe.name}: ${recipe.viewCount || 0} views, ${
            recipe.favoriteCount || 0
          } favorites, ${recipe.searchCount || 0} searches`
        );
      });

      // Find recipes with the most views or interactions
      // Removed isPublished restriction to show all recipes regardless of publication status
      const trendingRecipes = await Recipe.aggregate([
        // Remove the $match stage that filtered for isPublished: true
        {
          $addFields: {
            score: {
              $add: [
                { $ifNull: ["$viewCount", 0] },
                { $multiply: [{ $ifNull: ["$favoriteCount", 0] }, 2] }, // Weight favorites more
                { $ifNull: ["$searchCount", 0] },
              ],
            },
          },
        },
        {
          $sort: { score: -1 },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            image: 1,
            prepTime: 1,
            cookTime: 1,
            servings: 1,
            ingredients: 1,
            instructions: 1,
            tags: 1,
            cuisine: 1,
            viewCount: 1,
            favoriteCount: 1,
            searchCount: 1,
            score: 1,
          },
        },
      ]);

      console.log(`Found ${trendingRecipes.length} trending recipes`);
      if (trendingRecipes.length > 0) {
        console.log(
          "Top trending recipe:",
          trendingRecipes[0].name,
          "with score:",
          trendingRecipes[0].score
        );
      }

      return res.status(200).json({
        success: true,
        message: "Trending recipes retrieved successfully",
        data: trendingRecipes,
      });
    } catch (error) {
      console.error("Error fetching trending recipes:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching trending recipes",
        error: error.message,
      });
    }
  },

  // Add the getRecipeHistory function to the recipeController
  getRecipeHistory: async (req, res) => {
    try {
      const userId = req.user._id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      console.log(
        `Fetching recipe history for user ${userId}, page ${page}, limit ${limit}`
      );

      // Find user's recipe history
      const historyEntries = await RecipeHistory.find({ user: userId })
        .sort({ viewedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "recipe",
          "name image prepTime cookTime servings ingredients instructions"
        );

      console.log(`Found ${historyEntries.length} history entries`);

      // Process each history entry to include recipe details
      const history = await Promise.all(
        historyEntries.map(async (entry) => {
          // If we have a populated recipe reference, use that
          if (entry.recipe) {
            console.log(`History entry has recipe: ${entry.recipe.name}`);
            return {
              _id: entry._id,
              recipe: entry.recipe,
              sourceType: entry.sourceType,
              sourceId: entry.sourceId,
              viewedAt: entry.viewedAt,
              // Map recipe fields to top level for compatibility
              name: entry.recipe.name,
              image: entry.recipe.image,
              prepTime: entry.recipe.prepTime,
              servings: entry.recipe.servings,
              ingredients: entry.recipe.ingredients,
              instructions: entry.recipe.instructions,
            };
          }
          // If we don't have a recipe but have a sourceId, try to get external details
          else if (entry.sourceId) {
            console.log(
              `History entry has sourceId but no recipe: ${entry.sourceId}`
            );

            // For Spoonacular IDs, we could fetch details from their API
            // This is just a placeholder for now
            let placeholderRecipe = {
              name: `Recipe ${entry.sourceId}`,
              image: "https://via.placeholder.com/150",
              prepTime: 30,
              servings: 4,
              ingredients: ["Ingredients not available"],
              instructions: "Instructions not available",
            };

            return {
              _id: entry._id,
              sourceType: entry.sourceType,
              sourceId: entry.sourceId,
              viewedAt: entry.viewedAt,
              ...placeholderRecipe,
            };
          }
          // Fallback for entries with neither recipe nor sourceId
          else {
            console.log(
              `History entry has neither recipe nor sourceId: ${entry._id}`
            );
            return {
              _id: entry._id,
              viewedAt: entry.viewedAt,
              name: "Unknown Recipe",
              image: "https://via.placeholder.com/150",
              prepTime: 0,
              servings: 0,
              ingredients: ["No ingredients available"],
              instructions: "No instructions available",
            };
          }
        })
      );

      // Get total count for pagination
      const totalCount = await RecipeHistory.countDocuments({ user: userId });
      console.log(`Total history entries: ${totalCount}`);

      return res.status(200).json({
        success: true,
        message: "Recipe history retrieved successfully",
        data: history,
        pagination: {
          total: totalCount,
          page: page,
          limit: limit,
          pages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching recipe history:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching recipe history",
        error: error.message,
      });
    }
  },

  // Add the clearRecipeHistory function to the recipeController
  clearRecipeHistory: async (req, res) => {
    try {
      const userId = req.user._id;

      // Delete all history entries for this user
      await RecipeHistory.deleteMany({ user: userId });

      return res.status(200).json({
        success: true,
        message: "Recipe history cleared successfully",
      });
    } catch (error) {
      console.error("Error clearing recipe history:", error);
      return res.status(500).json({
        success: false,
        message: "Error clearing recipe history",
        error: error.message,
      });
    }
  },

  // Add to recipe history
  addToRecipeHistory: async (req, res) => {
    try {
      // Check if user exists in the request
      if (!req.user || !req.user._id) {
        console.error("No authenticated user found for history tracking");
        return res.status(401).json({
          success: false,
          message: "Authentication required for history tracking",
        });
      }

      const userId = req.user._id;
      const { recipeId } = req.params;
      const {
        sourceType: clientSourceType,
        recipeName,
        fromSearch = false, // Default to false if not specified
        ...additionalData
      } = req.body || {};

      console.log(
        `Adding recipe ${recipeId} to history for user ${userId} (fromSearch: ${fromSearch})`
      );

      // Validate inputs
      if (!userId || !recipeId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: userId and recipeId",
        });
      }

      let recipe = null;
      let sourceType = clientSourceType || "local";
      let sourceId = null;

      // Try to find recipe by ID first
      if (mongoose.Types.ObjectId.isValid(recipeId)) {
        recipe = await Recipe.findById(recipeId);

        // If recipe is found, increment its view count
        if (recipe) {
          await recipeController.incrementViewCount(recipe._id);
        }
      }

      // If we couldn't find it by ID, try sourceId
      if (!recipe) {
        try {
          recipe = await Recipe.findOne({ sourceId: recipeId });
          if (recipe) {
            console.log(`Found recipe by sourceId: ${recipe.name}`);
            sourceType = "spoonacular";
            sourceId = recipeId;
          }
        } catch (error) {
          console.log(`Error finding recipe by sourceId: ${error.message}`);
          // Continue - we'll create a placeholder
        }
      }

      // Special handling for AI-generated recipes that might not be in the database yet
      if (
        !recipe &&
        (sourceType === "ai" || recipeId.toString().startsWith("ai-"))
      ) {
        console.log(
          `AI-generated recipe ${recipeId} not found, creating placeholder`
        );
        sourceType = "ai";
        sourceId = recipeId;

        // Create a Recipe entry for AI-generated recipes to track them
        if (additionalData && additionalData.image && recipeName) {
          try {
            console.log(
              `Creating new recipe record for AI recipe: ${recipeName}`
            );
            const newRecipe = new Recipe({
              name: recipeName,
              sourceId: sourceId || recipeId,
              sourceType: "ai",
              image: additionalData.image,
              prepTime: additionalData.prepTime || 30,
              servings: additionalData.servings || 4,
              ingredients: additionalData.ingredients || [],
              instructions:
                additionalData.instructions || "Instructions not available",
              viewCount: 1, // Start with one view
              favoriteCount: 0,
              searchCount: 0,
              lastViewedAt: new Date(),
            });

            recipe = await newRecipe.save();
            console.log(
              `Successfully created AI recipe record with ID: ${recipe._id}`
            );
          } catch (saveError) {
            console.error(`Error saving new AI recipe: ${saveError.message}`);
            // Continue with history tracking even if recipe save fails
          }
        }
      }

      // If no recipe found at all, we'll still add it to history with just the ID
      if (!recipe) {
        console.log(
          `Recipe ${recipeId} not found, adding placeholder to history`
        );
        // For numeric IDs, assume it's a Spoonacular ID
        if (/^\d+$/.test(recipeId)) {
          sourceType = clientSourceType || "spoonacular";
          sourceId = recipeId;
        } else {
          // For other formats, it could be an external or AI-generated recipe
          sourceType = clientSourceType || "external";
          sourceId = recipeId;
        }
      }

      let historyEntry = null;

      // IMPROVED HANDLING: Use findOneAndUpdate with upsert for all cases
      try {
        // Handle case of recipe with ID in our database
        if (recipe && recipe._id) {
          historyEntry = await RecipeHistory.findOneAndUpdate(
            { user: userId, recipe: recipe._id },
            {
              $set: {
                viewedAt: new Date(),
                sourceType,
                sourceId: sourceId || null,
                recipeName: recipeName || recipe.name || null,
                fromSearch: fromSearch, // Use the fromSearch flag
                ...additionalData,
              },
            },
            {
              new: true,
              upsert: true, // Create if doesn't exist
            }
          );
        }
        // Handle case for external recipes with sourceId
        else if (sourceId) {
          historyEntry = await RecipeHistory.findOneAndUpdate(
            {
              user: userId,
              sourceId: sourceId,
              sourceType: sourceType,
              recipe: null, // Important: specify recipe as null
            },
            {
              $set: {
                viewedAt: new Date(),
                recipeName: recipeName || `Recipe ${sourceId}`,
                ...additionalData,
              },
            },
            {
              new: true,
              upsert: true, // Create if doesn't exist
            }
          );
        }
        // Fallback case - unknown recipe
        else {
          // Generate a unique ID for this unknown recipe based on name and timestamp
          const uniqueIdentifier = `unknown-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 10)}`;

          historyEntry = await RecipeHistory.findOneAndUpdate(
            {
              user: userId,
              recipe: null,
              sourceId: uniqueIdentifier, // Use our generated unique ID
              sourceType: "unknown",
            },
            {
              $set: {
                viewedAt: new Date(),
                recipeName: recipeName || "Unknown Recipe",
                ...additionalData,
              },
            },
            {
              new: true,
              upsert: true,
            }
          );
        }
      } catch (error) {
        // Check for duplicate key error
        if (error.code === 11000) {
          console.log("Duplicate key error, trying alternative approach");

          // Extract the error details to determine what's causing the conflict
          const keyPattern = error.keyPattern || {};
          const keyValue = error.keyValue || {};

          console.log("Conflict details:", { keyPattern, keyValue });

          // For recipe conflicts
          if (keyPattern.recipe && keyPattern.user) {
            try {
              historyEntry = await RecipeHistory.findOneAndUpdate(
                { user: userId, recipe: keyValue.recipe },
                { $set: { viewedAt: new Date() } },
                { new: true }
              );

              if (historyEntry) {
                console.log(
                  `Successfully updated existing history entry: ${historyEntry._id}`
                );
              } else {
                console.log(
                  "Couldn't find the conflicting entry - it may have been deleted"
                );
                return res.status(200).json({
                  success: true,
                  message: "History tracking acknowledged but entry not found",
                });
              }
            } catch (updateError) {
              console.error(
                "Error updating conflicting history entry:",
                updateError
              );
              return res.status(200).json({
                success: true,
                message: "History tracking acknowledged but update failed",
              });
            }
          }
          // For sourceId conflicts
          else if (keyPattern.sourceId) {
            try {
              historyEntry = await RecipeHistory.findOneAndUpdate(
                {
                  user: userId,
                  sourceId: keyValue.sourceId,
                  sourceType: keyValue.sourceType || sourceType,
                },
                { $set: { viewedAt: new Date() } },
                { new: true }
              );

              if (historyEntry) {
                console.log(
                  `Successfully updated existing history entry: ${historyEntry._id}`
                );
              } else {
                console.log("Couldn't find the conflicting sourceId entry");
                return res.status(200).json({
                  success: true,
                  message: "History tracking acknowledged but entry not found",
                });
              }
            } catch (updateError) {
              console.error(
                "Error updating conflicting sourceId entry:",
                updateError
              );
              return res.status(200).json({
                success: true,
                message: "History tracking acknowledged but update failed",
              });
            }
          }
          // Generic fallback
          else {
            console.log(
              "Unknown conflict type, returning success without updating"
            );
            return res.status(200).json({
              success: true,
              message:
                "History tracking acknowledged without updating due to conflict",
            });
          }
        } else {
          // For other errors, throw to be caught by the main try/catch
          throw error;
        }
      }

      // Final safety check
      if (!historyEntry) {
        console.log("Warning: No history entry was created or updated");
        return res.status(200).json({
          success: true,
          message: "History tracking acknowledged without confirming update",
        });
      }

      console.log(
        `History entry ${historyEntry._id} successfully updated/created`
      );

      return res.status(200).json({
        success: true,
        message: "Recipe added to history successfully",
        data: {
          _id: historyEntry._id,
          recipeName: historyEntry.recipeName,
          sourceType: historyEntry.sourceType,
          sourceId: historyEntry.sourceId,
          viewedAt: historyEntry.viewedAt,
        },
      });
    } catch (error) {
      console.error("Error adding recipe to history:", error);
      return res.status(500).json({
        success: false,
        message: "Could not add to history: " + error.message,
        error: error.message,
      });
    }
  },

  // Get external recipe details (e.g. from Spoonacular)
  getExternalRecipeDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const { source } = req.query;

      console.log(
        `Fetching external recipe details for ID: ${id}, Source: ${source}`
      );

      // Currently we only support Spoonacular as an external source
      if (source !== "spoonacular") {
        return res.status(400).json({
          success: false,
          message: `Unsupported external source: ${source}`,
        });
      }

      // Check if Spoonacular API key is configured
      if (!process.env.SPOONACULAR_API_KEY) {
        console.error("Spoonacular API key not configured");
        return res.status(500).json({
          success: false,
          message: "External recipe service is not properly configured",
        });
      }

      // First check if we have this recipe in our database
      let recipe = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        recipe = await Recipe.findById(id);
        console.log(`Looked up by ObjectId: ${recipe ? "Found" : "Not found"}`);
      }

      if (!recipe) {
        recipe = await Recipe.findOne({ sourceId: id.toString() });
        console.log(`Looked up by sourceId: ${recipe ? "Found" : "Not found"}`);
      }

      // If found in our database, return it
      if (recipe) {
        console.log(`Found recipe ${id} in local database`);

        // Verify this recipe has complete instructions
        console.log(
          `Recipe instructions length: ${recipe.instructions?.length || 0}`
        );
        if (!recipe.instructions || recipe.instructions.length < 10) {
          console.log(
            `Recipe has insufficient instructions. Will re-fetch from Spoonacular.`
          );
          // Will continue to fetch from API if instructions are missing or too short
        } else {
          return res.status(200).json({
            success: true,
            data: recipe,
            source: "database",
          });
        }
      }

      // Otherwise fetch from Spoonacular
      console.log(`Fetching recipe ${id} from Spoonacular API`);
      const response = await axios.get(
        `${SPOONACULAR_BASE_URL}/${id}/information`,
        {
          params: {
            apiKey: process.env.SPOONACULAR_API_KEY,
            includeNutrition: true,
          },
          timeout: 8000, // 8 second timeout
        }
      );

      const recipeData = response.data;
      console.log(`Spoonacular API response received for recipe ${id}`);
      console.log(
        `Instructions length from API: ${recipeData.instructions?.length || 0}`
      );

      // Log a sample of instructions to verify they're being received
      if (recipeData.instructions) {
        console.log(
          `Sample instructions: ${recipeData.instructions.substring(0, 50)}...`
        );
      } else {
        console.log(
          `No instructions found in Spoonacular response for recipe ${id}`
        );
      }

      // Format the recipe to match our application structure
      const formattedRecipe = {
        name: recipeData.title,
        ingredients: recipeData.extendedIngredients.map((ing) => ing.original),
        instructions: recipeData.instructions || "No instructions provided",
        image: recipeData.image,
        prepTime: recipeData.readyInMinutes || 0,
        cookTime: recipeData.cookingMinutes || 0,
        servings: recipeData.servings || 4,
        sourceId: recipeData.id,
        sourceUrl: recipeData.sourceUrl,
        source: "spoonacular",
        nutritionFacts: recipeData.nutrition
          ? {
              calories:
                recipeData.nutrition.nutrients.find(
                  (n) => n.name === "Calories"
                )?.amount || 0,
              protein:
                recipeData.nutrition.nutrients.find((n) => n.name === "Protein")
                  ?.amount || 0,
              carbs:
                recipeData.nutrition.nutrients.find(
                  (n) => n.name === "Carbohydrates"
                )?.amount || 0,
              fats:
                recipeData.nutrition.nutrients.find((n) => n.name === "Fat")
                  ?.amount || 0,
            }
          : null,
      };

      // If this is a valid recipe with instructions, save it to our database for future use
      if (
        formattedRecipe.instructions &&
        formattedRecipe.instructions.length > 10
      ) {
        try {
          const newRecipe = new Recipe({
            ...formattedRecipe,
            sourceId: recipeData.id.toString(),
          });

          // Set a default createdBy to avoid validation errors
          const Admin = mongoose.model("Admin");
          const admin = await Admin.findOne();
          if (admin) {
            newRecipe.createdBy = admin._id;
          } else {
            // Use a placeholder ObjectId if no admin exists
            newRecipe.createdBy = new mongoose.Types.ObjectId();
          }

          await newRecipe.save();
          console.log(`Saved Spoonacular recipe ${id} to database`);
        } catch (saveError) {
          console.error(`Error saving recipe ${id} to database:`, saveError);
          // Continue even if save fails
        }
      }

      return res.status(200).json({
        success: true,
        data: formattedRecipe,
        source: "spoonacular",
      });
    } catch (error) {
      console.error("Error fetching external recipe:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch recipe details",
        error: error.response?.data?.message || error.message,
      });
    }
  },

  // Increment view count for a recipe
  incrementViewCount: async (recipeId) => {
    try {
      const recipe = await Recipe.findById(recipeId);

      if (!recipe) {
        console.log(`Recipe not found for view increment: ${recipeId}`);
        return null;
      }

      // Increment viewCount and update lastViewedAt
      recipe.viewCount = (recipe.viewCount || 0) + 1;
      recipe.lastViewedAt = new Date();

      // Save the updated recipe
      await recipe.save();

      console.log(
        `Incremented view count for recipe: ${recipe.name} (${recipeId}), new count: ${recipe.viewCount}`
      );

      return recipe;
    } catch (error) {
      console.error(`Error incrementing view count: ${error.message}`);
      return null;
    }
  },

  // Track recipe view in history for analytics
  trackRecipeView: async (userId, recipeId, recipe, fromSearch = false) => {
    if (!userId) {
      console.log("No user ID provided, skipping history tracking");
      return;
    }

    try {
      // Check if this is an AI-generated recipe
      const isAiRecipe =
        recipe && (recipe.source === "ai" || recipe.sourceType === "ai");

      // For AI recipes, we always want to count them in both views and searches
      const markAsSearch =
        fromSearch || isAiRecipe || (recipe && recipe.fromSearch === true);

      // Find or create history entry
      await RecipeHistory.findOneAndUpdate(
        { user: userId, recipe: recipeId },
        {
          $set: {
            viewedAt: new Date(),
            recipeName: recipe?.name || "Unknown Recipe",
            sourceType: recipe?.sourceType || "local",
            sourceId: recipe?.sourceId || null,
            // Set additional fields if available
            thumbnail: recipe?.image || null,
            cuisine: recipe?.cuisine || null,
            mealType: recipe?.mealType || null,
            dietType: recipe?.dietType || [],
            difficulty: recipe?.difficulty || null,
            fromSearch: markAsSearch, // Mark as search if it came from search results or is AI-generated
          },
        },
        { upsert: true, new: true }
      );

      console.log(
        `Tracked recipe view in history for user ${userId}, recipe ${recipeId}, fromSearch: ${markAsSearch}`
      );
    } catch (error) {
      console.error(`Error tracking recipe view in history: ${error.message}`);
    }
  },
};

// Helper function to generate recipes using AI
const generateAIRecipes = async (ingredients) => {
  try {
    const aiResponse = await axios.post(
      "YOUR_AI_ENDPOINT",
      {
        ingredients,
        count: 3, // Number of recipes to generate
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
      }
    );

    return aiResponse.data.recipes;
  } catch (error) {
    console.error("AI Recipe Generation Error:", error);
    return [];
  }
};

export default recipeController;
