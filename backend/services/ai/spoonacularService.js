import axios from "axios";

// API Key from environment variables only
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

// Base URL
const SPOONACULAR_BASE_URL = "https://api.spoonacular.com/recipes";

/**
 * Search recipes by ingredients
 * @param {Array} ingredients - List of ingredients
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Object>} Search results
 */
export const searchRecipesByIngredients = async (ingredients, options = {}) => {
  try {
    if (!SPOONACULAR_API_KEY) {
      return {
        success: false,
        error:
          "Spoonacular API key is missing. Please set the SPOONACULAR_API_KEY environment variable.",
        isAuthError: true,
      };
    }

    const response = await axios.get(
      `${SPOONACULAR_BASE_URL}/findByIngredients`,
      {
        params: {
          apiKey: SPOONACULAR_API_KEY,
          ingredients: ingredients.join(","),
          number: options.number || 5,
          ranking: options.ranking || 1,
          ignorePantry: options.ignorePantry || true,
        },
      }
    );

    return {
      success: true,
      recipes: response.data,
    };
  } catch (error) {
    console.error("Spoonacular API error:", error);

    // Check for rate limiting or quota errors
    if (error.response?.status === 402) {
      return {
        success: false,
        error: "Daily quota exceeded for Spoonacular API",
        isQuotaError: true,
      };
    }

    return {
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Unknown error with Spoonacular API",
    };
  }
};

/**
 * Search recipes by query
 * @param {string} query - Search query
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Object>} Search results
 */
export const searchRecipesByQuery = async (query, options = {}) => {
  try {
    const response = await axios.get(`${SPOONACULAR_BASE_URL}/complexSearch`, {
      params: {
        apiKey: SPOONACULAR_API_KEY,
        query,
        number: options.number || 5,
        addRecipeInformation: options.addRecipeInformation || true,
        fillIngredients: options.fillIngredients || true,
      },
    });

    return {
      success: true,
      recipes: response.data.results,
    };
  } catch (error) {
    console.error("Spoonacular API error:", error);

    // Check for rate limiting or quota errors
    if (error.response?.status === 402) {
      return {
        success: false,
        error: "Daily quota exceeded for Spoonacular API",
        isQuotaError: true,
      };
    }

    return {
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Unknown error with Spoonacular API",
    };
  }
};

/**
 * Get detailed recipe information
 * @param {number} recipeId - Recipe ID
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Object>} Recipe details
 */
export const getRecipeInformation = async (recipeId, options = {}) => {
  try {
    const response = await axios.get(
      `${SPOONACULAR_BASE_URL}/${recipeId}/information`,
      {
        params: {
          apiKey: SPOONACULAR_API_KEY,
          includeNutrition: options.includeNutrition || true,
        },
      }
    );

    return {
      success: true,
      recipe: response.data,
    };
  } catch (error) {
    console.error("Spoonacular API error:", error);

    // Check for rate limiting or quota errors
    if (error.response?.status === 402) {
      return {
        success: false,
        error: "Daily quota exceeded for Spoonacular API",
        isQuotaError: true,
      };
    }

    return {
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Unknown error with Spoonacular API",
    };
  }
};

/**
 * Format Spoonacular recipe to match our application's structure
 * @param {Object} recipeData - Raw recipe data from Spoonacular
 * @returns {Object} Formatted recipe data
 */
export const formatSpoonacularRecipe = (recipeData) => {
  return {
    name: recipeData.title,
    ingredients: recipeData.extendedIngredients.map((ing) => ing.original),
    instructions: recipeData.instructions || "No instructions provided",
    prepTime:
      recipeData.preparationMinutes ||
      Math.floor(recipeData.readyInMinutes / 2),
    cookTime:
      recipeData.cookingMinutes || Math.floor(recipeData.readyInMinutes / 2),
    servings: recipeData.servings,
    image: recipeData.image,
    sourceUrl: recipeData.sourceUrl,
    source: "spoonacular",
    sourceId: recipeData.id,
    nutritionFacts: {
      calories:
        recipeData.nutrition?.nutrients.find((n) => n.name === "Calories")
          ?.amount || 0,
      protein:
        recipeData.nutrition?.nutrients.find((n) => n.name === "Protein")
          ?.amount || 0,
      carbs:
        recipeData.nutrition?.nutrients.find((n) => n.name === "Carbohydrates")
          ?.amount || 0,
      fats:
        recipeData.nutrition?.nutrients.find((n) => n.name === "Fat")?.amount ||
        0,
    },
  };
};
