import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../context/SubscriptionContext";
import { useTheme } from "../../context/ThemeContext";
import { showToast } from "../../utils/toast";
import axiosInstance from "../../config/axios";
import LoadingSpinner from "../LoadingSpinner";
import { UnifiedRecipeModal } from "../../components";
import axios from "axios";
import { addToHistory } from "../../services/recipeService";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/solid";

const RecipeGenerator = () => {
  const [ingredients, setIngredients] = useState("");
  const [dishName, setDishName] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [generationSource, setGenerationSource] = useState(null);

  const { isAuthenticated } = useAuth();
  const { isSubscribed, remainingSearches } = useSubscription();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication status and redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      showToast("Please log in to use the AI Recipe Generator", "info");
      navigate("/login", {
        state: {
          from: location.pathname,
          returnUrl: location.pathname,
        },
      });
    }
  }, [isAuthenticated, navigate, location.pathname]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!ingredients && !dishName) {
      showToast("Please provide either ingredients or a dish name", "error");
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      showToast("Please log in to generate recipes", "info");
      navigate("/login");
      return;
    }

    // Check if user has remaining searches (for non-subscribed users)
    if (!isSubscribed && remainingSearches <= 0) {
      showToast(
        "You've reached your daily search limit. Please upgrade to premium.",
        "error"
      );
      navigate("/subscription");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Parse ingredients into an array if provided
      const ingredientsArray = ingredients
        ? ingredients
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : [];

      // Log API request for debugging
      console.log("Sending AI recipe request with:", {
        ingredients: ingredientsArray,
        dishName: dishName.trim(),
        baseURL: axiosInstance.defaults.baseURL,
        hasToken: !!localStorage.getItem("token"),
      });

      let response;

      // Try different API endpoint patterns - there might be path mismatches in the configuration
      try {
        // First try the standard endpoint for your axios config
        response = await axiosInstance.post("/ai-recipes/generate", {
          ingredients: ingredientsArray,
          dishName: dishName.trim(),
        });
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(
            "First endpoint attempt failed, trying alternate path..."
          );
          // Try alternate path with /api prefix (this is likely the correct one based on the axios config)
          response = await axiosInstance.post("/api/ai-recipes/generate", {
            ingredients: ingredientsArray,
            dishName: dishName.trim(),
          });
        } else {
          // If it's not a 404, rethrow the original error
          throw error;
        }
      }

      if (response.data.success) {
        setGeneratedRecipe(response.data.data);
        setGenerationSource(response.data.source);
        setShowModal(true);

        // We'll remove the duplicate history tracking from here
        // since UnifiedRecipeModal already handles history tracking
        // This prevents duplicate entries in the history
      } else {
        setError(response.data.message || "Failed to generate recipe");
        showToast(
          response.data.message || "Failed to generate recipe",
          "error"
        );
      }
    } catch (error) {
      console.error("Error generating recipe:", error);
      // Log more detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error("Server response error:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
      } else {
        // Something happened in setting up the request
        console.error("Request setup error:", error.message);
      }

      setError(
        error.response?.data?.message ||
          "An error occurred while generating the recipe"
      );
      showToast(
        error.response?.data?.message ||
          "An error occurred while generating the recipe",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle saving the generated recipe
  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return;

    // Ensure the recipe has a proper sourceType and consistent AI identification
    const enhancedRecipe = {
      ...generatedRecipe,
      sourceType: "ai",
      source: "ai",
      // Add a unique ID with a descriptive name for history tracking if it doesn't have one
      sourceId: generatedRecipe.sourceId || generateAIRecipeId(generatedRecipe),
      // Make sure we have a proper recipe name
      name:
        generatedRecipe.name || generatedRecipe.title || generateRecipeName(),
      // Record when it was created
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await axiosInstance.post("/ai-recipes/save", {
        recipeData: enhancedRecipe,
      });

      if (response.data.success) {
        // Update the current recipe with the enhanced data
        setGeneratedRecipe(enhancedRecipe);
        showToast("Recipe saved successfully!", "success");
      } else {
        showToast(response.data.message || "Failed to save recipe", "error");
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
      showToast(
        error.response?.data?.message ||
          "An error occurred while saving the recipe",
        "error"
      );
    }
  };

  // Generate a unique AI recipe ID that includes a timestamp and descriptive name
  const generateAIRecipeId = (recipe) => {
    // Create a timestamp
    const timestamp = Date.now();

    // Get a name based on ingredients or dish name
    let nameSegment = "";

    if (recipe.name && !recipe.name.toLowerCase().includes("recipe")) {
      // Use the recipe name if available
      nameSegment = recipe.name;
    } else if (dishName) {
      // Use the dish name if provided
      nameSegment = dishName;
    } else if (ingredients) {
      // Use the first few ingredients
      const ingList = ingredients.split(",").slice(0, 3);
      nameSegment = ingList.join("-");
    } else {
      // Fallback
      nameSegment = "Custom-Recipe";
    }

    // Convert to URL-friendly format
    nameSegment = nameSegment
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9-]/g, "") // Remove special characters
      .replace(/-+/g, "-"); // Avoid multiple consecutive hyphens

    return `ai-${timestamp}-${nameSegment}`;
  };

  // Generate a recipe name if none is available
  const generateRecipeName = () => {
    if (dishName) {
      return dishName.charAt(0).toUpperCase() + dishName.slice(1);
    }

    if (ingredients) {
      const mainIngredients = ingredients.split(",").slice(0, 3);
      const formattedIngredients = mainIngredients
        .map((ing) => ing.trim().charAt(0).toUpperCase() + ing.trim().slice(1))
        .join(" and ");

      return `${formattedIngredients} Recipe`;
    }

    return "AI Generated Recipe";
  };

  return (
    <div
      className={`${
        isDarkMode ? "bg-[#1A3A5F]/75" : "bg-[#f0f0f0]/60"
      } rounded-xl p-16 mt-8 mb-2`}>
      {/* Main content area */}
      <div className="w-full pb-0">
        <div className="max-w-7xl mx-auto">
          {/* Main content container - yellow background with grid pattern */}
          <div
            className={`bg-[#FFD15C] border-4 ${
              isDarkMode ? "border-[#192339]" : "border-[#1A3A5F]"
            } overflow-hidden shadow-xl relative`}>
            <div className="relative">
              {/* Header area */}
              <div className="px-8 pt-8 pb-4">
                <div className="flex items-center mb-2">
                  <SparklesIcon className="h-7 w-7 text-gray-100 mr-2" />
                  <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-100">
                    AI Recipe Generator
                  </h1>
                </div>
                <p className="text-[#192339]/80 text-lg mb-6">
                  Create custom recipes based on ingredients you have or a dish
                  you'd like to make. Our AI will generate a delicious recipe
                  just for you.
                </p>

                {/* Form container with conditional styling based on theme */}
                <div
                  className={`${
                    isDarkMode ? "bg-[#192339]" : "bg-[#2A3B5C]"
                  } rounded-xl p-6 shadow-lg mb-6`}>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                      <label
                        htmlFor="ingredients"
                        className="block text-white font-medium mb-2">
                        Ingredients (comma-separated)
                      </label>
                      <textarea
                        id="ingredients"
                        value={ingredients}
                        onChange={(e) => setIngredients(e.target.value)}
                        placeholder="e.g. chicken, rice, onions, garlic"
                        className={`w-full px-4 py-3 ${
                          isDarkMode
                            ? "bg-[#253355] border-[#2d3e5f]"
                            : "bg-[#334366] border-[#405580]"
                        } border-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#FFD15C]`}
                        rows={3}
                      />
                    </div>

                    <div className="mb-6">
                      <label
                        htmlFor="dishName"
                        className="block text-white font-medium mb-2">
                        Dish Name (optional)
                      </label>
                      <input
                        type="text"
                        id="dishName"
                        value={dishName}
                        onChange={(e) => setDishName(e.target.value)}
                        placeholder="e.g. Chicken Curry"
                        className={`w-full px-4 py-3 ${
                          isDarkMode
                            ? "bg-[#253355] border-[#2d3e5f]"
                            : "bg-[#334366] border-[#405580]"
                        } border-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#FFD15C]`}
                      />
                    </div>

                    <div className="flex justify-start">
                      <button
                        type="submit"
                        disabled={loading || (!ingredients && !dishName)}
                        className="bg-[#FFD15C] text-[#192339] px-6 py-3 rounded-md font-medium hover:bg-[#FFDA7C] transition-colors flex items-center">
                        {loading ? (
                          <span className="flex items-center">
                            <LoadingSpinner size="sm" className="mr-2" />
                            Generating...
                          </span>
                        ) : (
                          <>
                            <SparklesIcon className="h-5 w-5 mr-2" />
                            Generate Recipe
                          </>
                        )}
                      </button>

                      {!isSubscribed && (
                        <span className="text-sm text-gray-300 ml-4 self-center">
                          {remainingSearches} searches remaining today
                        </span>
                      )}
                    </div>
                  </form>
                </div>

                {/* Error display */}
                {error && (
                  <div className="bg-red-800 rounded-xl p-4 mb-6 border border-red-700 shadow-lg">
                    <p className="flex items-center text-white">
                      <i className="fa-solid fa-circle-exclamation text-red-500 mr-2"></i>
                      {error}
                    </p>
                  </div>
                )}

                {/* Tips section with conditional styling */}
                <div
                  className={`${
                    isDarkMode ? "bg-[#192339]" : "bg-[#2A3B5C]"
                  } rounded-xl p-6 shadow-lg mb-8`}>
                  <h3 className="text-lg font-semibold text-white flex items-center mb-3">
                    <i className="fa-solid fa-circle-info text-[#FFD15C] mr-2"></i>
                    Tips for Better Results
                  </h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start">
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="rounded-full bg-[#FFD15C] w-2 h-2 mr-3"></div>
                      </div>
                      <span>
                        List ingredients with quantities if possible (e.g., "2
                        cups flour, 1 tbsp salt")
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="rounded-full bg-[#FFD15C] w-2 h-2 mr-3"></div>
                      </div>
                      <span>
                        Be specific with dish names (e.g., "Italian lasagna"
                        instead of just "pasta dish")
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="rounded-full bg-[#FFD15C] w-2 h-2 mr-3"></div>
                      </div>
                      <span>
                        Include cuisine type for more authentic results (e.g.,
                        "Mexican", "Thai", "Italian")
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="rounded-full bg-[#FFD15C] w-2 h-2 mr-3"></div>
                      </div>
                      <span>
                        Mention dietary restrictions if needed (e.g., "vegan",
                        "gluten-free", "low-carb")
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Modal */}
      {generatedRecipe && (
        <UnifiedRecipeModal
          recipe={generatedRecipe}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSaveRecipe}
          source={generationSource}
        />
      )}
    </div>
  );
};

export default RecipeGenerator;
