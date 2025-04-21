import axiosInstance from "../config/axios";

// Search featured recipes
export const searchFeaturedRecipes = async (query) => {
  try {
    // Don't proceed with empty queries
    if (!query || query.trim() === "") {
      return {
        success: false,
        message: "Search query is required",
        recipes: [],
      };
    }

    console.log(`Searching for recipes with query: ${query}`);
    const response = await axiosInstance.get(
      `/api/recipes/search?query=${encodeURIComponent(query)}`
    );
    return response.data;
  } catch (error) {
    console.error("Error searching featured recipes:", error);

    // Check if this is a connection error
    if (error.isConnectionError) {
      return {
        success: false,
        message:
          "Cannot connect to recipe service. Please check your internet connection.",
        recipes: [],
      };
    }

    // Handle specific HTTP error codes
    if (error.response) {
      const { status } = error.response;

      // Handle rate limiting (429)
      if (status === 429) {
        return {
          success: false,
          message:
            error.response.data?.message ||
            "You've reached your search limit for today.",
          status: 429,
          recipes: [],
        };
      }

      // Handle server errors (500, 502, 503)
      if (status >= 500) {
        return {
          success: false,
          message:
            "The recipe service is currently unavailable. Please try again later.",
          status: status,
          recipes: [],
        };
      }

      // Handle bad requests (400)
      if (status === 400) {
        return {
          success: false,
          message: error.response.data?.message || "Invalid search query.",
          recipes: [],
        };
      }
    }

    // Generic error fallback
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to search recipes. Please try again later.",
      recipes: [],
    };
  }
};

// Get recipe details by ID
export const getRecipeById = async (recipeId) => {
  try {
    const response = await axiosInstance.get(`/api/recipes/${recipeId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching recipe details:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch recipe details. Please try again later.",
      data: null,
    };
  }
};

// Get featured recipes
export const getFeaturedRecipes = async () => {
  try {
    const response = await axiosInstance.get("/api/recipes/featured");
    return response.data;
  } catch (error) {
    console.error("Error fetching featured recipes:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch featured recipes. Please try again later.",
      data: [],
    };
  }
};

// Search recipes by ingredients
export const searchRecipesByIngredients = async (ingredients) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      return {
        success: false,
        message: "Authentication required to search recipes by ingredients",
        data: [],
      };
    }

    const response = await axiosInstance.post("/api/recipes/search", {
      ingredients: ingredients,
    });

    // Handle the case where API quota is exceeded but the server returns a 200 status
    if (response.data.source === "api_quota_exceeded") {
      return {
        success: true,
        message:
          response.data.message ||
          "API quota has been exceeded. Please try again later.",
        data: [],
        source: "api_quota_exceeded",
        remainingSearches: response.data.remainingSearches,
        maxSearches: response.data.maxSearches,
      };
    }

    // Handle the case where only database results are returned
    if (
      response.data.source === "database" &&
      response.data.message &&
      response.data.message.includes("External API quota exceeded")
    ) {
      return {
        ...response.data,
        message:
          response.data.message ||
          "Showing results from database only. External API is currently unavailable.",
      };
    }

    // Pass through remainingSearches info if present
    if (response.data.remainingSearches !== undefined) {
      return {
        ...response.data,
        // Make sure remainingSearches is properly passed through
        remainingSearches: response.data.remainingSearches,
      };
    }

    return response.data;
  } catch (error) {
    console.error("Error searching recipes by ingredients:", error);

    // Handle rate limit errors (HTTP 429)
    if (error.response && error.response.status === 429) {
      return {
        success: false,
        status: 429,
        message:
          error.response.data?.message ||
          "You've reached your daily search limit. Please upgrade for more searches.",
        data: [],
        remainingSearches: error.response.data?.remainingSearches || 0,
        upgradeRequired: error.response.data?.upgradeRequired || true,
      };
    }

    // Handle 502 Bad Gateway - likely Spoonacular API issues
    if (error.response && error.response.status === 502) {
      return {
        success: false,
        status: 502,
        message:
          "Recipe search service is temporarily unavailable. Please try again later or try a different search.",
        data: [],
      };
    }

    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to search recipes. Please try again later.",
      data: [],
    };
  }
};

// Get recipe video from YouTube
export const getRecipeVideo = async (recipeName) => {
  try {
    const response = await axiosInstance.get(
      `/api/recipes/video?query=${encodeURIComponent(recipeName)}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching recipe video:", error);
    return {
      success: false,
      message: "Failed to fetch recipe video",
      videoId: null,
    };
  }
};

// Add recipe to history
export const addToHistory = async (recipeId, data = {}) => {
  // Skip if recipeId is missing or global flag is set
  if (!recipeId || window.skipHistoryTracking === true) {
    console.log(
      `History tracking skipped: ${
        !recipeId ? "No recipeId" : "skipHistoryTracking flag is set"
      }`
    );
    return {
      success: false,
      message: "History tracking skipped",
    };
  }

  // Create a history key that doesn't include timestamps to prevent the toast fix from affecting recipe history
  const sessionStorageKey = `history_tracked_${recipeId}`;

  // Check for recent tracking but with a much shorter cooldown (10 seconds instead of 1 hour)
  // This prevents duplicate tracking during navigation but allows revisiting the same recipe later
  const recentlyTracked = sessionStorage.getItem(sessionStorageKey);
  if (recentlyTracked) {
    const timeSinceTracked = Date.now() - parseInt(recentlyTracked);
    // Only consider a recipe as "recently tracked" for 10 seconds
    // This allows multiple entries of the same recipe after small delays
    if (timeSinceTracked < 10 * 1000) {
      console.log(`Recipe ${recipeId} was tracked very recently, skipping`);
      return {
        success: true,
        message: "Recipe already tracked very recently",
      };
    }
  }

  // For related recipe checks, use a 5-minute window instead of 1 hour
  // Check if this is a numeric ID (likely Spoonacular) and lookup AI version too
  if (typeof recipeId === "number" || /^\d+$/.test(recipeId)) {
    // Check if we already tracked an AI version with this Spoonacular ID embedded
    const aiKeysPattern = `history_tracked_ai-`;
    try {
      // Look for AI recipes with this ID
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(aiKeysPattern)) {
          const storedData = sessionStorage.getItem(key);
          if (storedData?.includes(`"sourceId":${recipeId}`)) {
            const timestamp = parseInt(storedData);
            if (timestamp && Date.now() - timestamp < 5 * 60 * 1000) {
              // 5 minutes
              console.log(
                `Found related AI recipe recently tracked, but allowing history entry`
              );
              // We found a related entry but we'll still add this one
              break;
            }
          }
        }
      }
    } catch (e) {
      // Ignore sessionStorage errors
      console.warn("Error accessing sessionStorage:", e);
    }
  }

  try {
    // Check if we have authentication token to prevent 401 errors
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("User not authenticated, skipping history tracking");
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    // Prepare request body - ensure we have minimal required data
    const requestBody = {
      sourceType:
        data.sourceType ||
        (data.source === "ai"
          ? "ai"
          : typeof recipeId === "number"
          ? "spoonacular"
          : "local"),
      recipeName:
        data.name || data.recipeName || data.title || `Recipe ${recipeId}`,
    };

    // For AI-generated recipes, ensure we include all important data
    if (requestBody.sourceType === "ai" || data.source === "ai") {
      // Log this specifically for debugging AI recipe tracking
      console.log("Preparing AI recipe for history tracking:", data);

      // Include all relevant fields for AI recipes
      requestBody.prepTime = data.prepTime || data.readyInMinutes || 30;
      requestBody.servings = data.servings || 4;
      requestBody.image = data.image || null;

      // Include full ingredients list for AI recipes
      if (data.ingredients && Array.isArray(data.ingredients)) {
        requestBody.ingredients = data.ingredients.map((ing) =>
          typeof ing === "string"
            ? ing
            : ing.name || ing.original || String(ing)
        );
      }

      // Include full instructions
      if (data.instructions || data.steps) {
        requestBody.instructions = data.instructions || data.steps;
      }

      // Include other useful AI recipe data
      if (data.tips && Array.isArray(data.tips)) {
        requestBody.tips = data.tips;
      }

      if (data.cuisine) requestBody.cuisine = data.cuisine;
      if (data.dietType) requestBody.dietType = data.dietType;
      if (data.difficulty) requestBody.difficulty = data.difficulty;

      // Make sure we have a clear recipe name
      if (
        !requestBody.recipeName ||
        requestBody.recipeName.includes("Recipe ")
      ) {
        requestBody.recipeName =
          data.name || data.title || "AI Generated Recipe";
      }

      // Add spoonacular reference if available
      if (data.spoonacularId) {
        requestBody.spoonacularId = data.spoonacularId;
      }
    } else {
      // For non-AI recipes, add important details if available, but limit data size
      if (data.prepTime) requestBody.prepTime = data.prepTime;
      if (data.servings) requestBody.servings = data.servings;
      if (data.image) requestBody.image = data.image;

      // Only include a subset of ingredients if available to avoid payload size issues
      if (
        data.ingredients &&
        Array.isArray(data.ingredients) &&
        data.ingredients.length > 0
      ) {
        requestBody.ingredients = data.ingredients
          .slice(0, 5)
          .map((ing) =>
            typeof ing === "string"
              ? ing
              : ing.name || ing.original || String(ing)
          );
      }
    }

    console.log(`Adding recipe ${recipeId} to history with data:`, requestBody);

    // Make the API request
    try {
      const response = await axiosInstance.post(
        `/api/recipes/history/${recipeId}`,
        requestBody
      );

      // Only mark as tracked if successful
      if (response.data && response.data.success) {
        // Store timestamp only (no longer storing JSON data)
        sessionStorage.setItem(sessionStorageKey, Date.now().toString());

        console.log(`Successfully added recipe ${recipeId} to history`);
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // For 500 errors, don't retry this recipe for a short while
      if (error.response?.status === 500) {
        // Store with a short timeout (10 seconds) to avoid hammering server
        sessionStorage.setItem(sessionStorageKey, Date.now().toString());

        // Log detailed error information
        console.error("Server error (500) adding to history:", error);
        console.error("Response data:", error.response?.data);
        console.error("Request data was:", requestBody);

        // If this is a server issue, return a nicer message to the user
        return {
          success: false,
          message:
            "Server error adding to history - service may be temporarily unavailable",
          isServerError: true,
        };
      }

      // For authentication errors (401)
      if (error.response?.status === 401) {
        console.warn("Authentication required for history tracking");
        return {
          success: false,
          message: "Authentication required for history tracking",
          isAuthError: true,
        };
      }

      // For all other errors
      console.error("Error adding to history:", error);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to add recipe to history",
      };
    }
  } catch (error) {
    console.error("Fatal error in addToHistory function:", error);
    return {
      success: false,
      message: "Internal error in history tracking",
    };
  }
};

// Get recipe history
export const getRecipeHistory = async (page = 1, limit = 10) => {
  // Add retry mechanism for server connection issues
  const maxRetries = 2;
  let retryCount = 0;

  const attemptFetch = async () => {
    try {
      const response = await axiosInstance.get("/api/recipes/history", {
        params: { page, limit },
      });

      // Ensure we have a properly structured response
      return {
        success: true,
        data: response.data?.data || [],
        pagination: response.data?.pagination || {
          total: 0,
          page: 1,
          limit: limit,
          pages: 1,
        },
      };
    } catch (error) {
      // If this is a network error and we haven't exceeded retries, try again
      if (
        (error.message?.includes("Network Error") || !error.response) &&
        retryCount < maxRetries
      ) {
        retryCount++;
        console.log(`Network error, retrying (${retryCount}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
        return attemptFetch();
      }

      console.error("Error fetching recipe history:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to load recipe history",
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: limit,
          pages: 1,
        },
        isNetworkError:
          error.message?.includes("Network Error") || !error.response,
      };
    }
  };

  return attemptFetch();
};

// Clear recipe history
export const clearRecipeHistory = async () => {
  try {
    const response = await axiosInstance.delete("/api/recipes/history");
    return response.data;
  } catch (error) {
    console.error("Error clearing recipe history:", error);
    throw error;
  }
};

// Get trending recipes
export const getTrendingRecipes = async (limit = 5) => {
  try {
    const response = await axiosInstance.get(
      `/api/recipes/trending?limit=${limit}`
    );
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Error fetching trending recipes:", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch trending recipes",
    };
  }
};
