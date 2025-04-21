import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../config/axios";
import { motion } from "framer-motion";
import {
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { showToast } from "@/utils/toast";
import {
  getRecipeHistory,
  clearRecipeHistory,
} from "../services/recipeService";
import {
  UnifiedRecipeModal,
  RecipeCard,
  EmptyState,
  ErrorState,
  LoadingSpinner,
} from "../components";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const RecipeHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [serverError, setServerError] = useState(false);
  const { isDarkMode } = useTheme();

  // Use refs to prevent infinite loops
  const fetchedRef = useRef(false);
  const historyLoadedRef = useRef(false);

  // Set flag to prevent history tracking while viewing history
  useEffect(() => {
    // IMPORTANT: Set this flag immediately on component mount, before any other operations
    console.log(
      "RecipeHistory: Setting skipHistoryTracking flag to prevent loops"
    );
    window.skipHistoryTracking = true;

    // Also clear any session-based tracking for recipes when entering the history page
    // This prevents previous browser sessions from affecting the current one
    try {
      // Get all keys that match our history tracking pattern
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith("history_tracked_"))
        .forEach((key) => {
          // Don't actually delete them, as that could cause issues
          // Instead mark when they were last seen in the history page
          sessionStorage.setItem(
            key + "_seen_in_history",
            Date.now().toString()
          );
        });
    } catch (e) {
      console.warn("Error accessing sessionStorage:", e);
    }

    // Clean up when component unmounts
    return () => {
      console.log(
        "RecipeHistory: Clearing skipHistoryTracking flag on unmount"
      );
      // Only reset if we're the component that set it
      // This prevents issues if multiple components are mounted/unmounted
      window.skipHistoryTracking = false;

      // IMPORTANT: Also reset our component-mounted flag when we unmount
      window.__historyComponentMounted = false;
    };
  }, []);

  // Add an additional effect that runs more often to ensure the flag stays set
  // This prevents any other component from accidentally unsetting our flag
  useEffect(() => {
    // Mark that the history component is currently mounted
    window.__historyComponentMounted = true;

    // Create an interval that constantly ensures our flag is set
    // This is a failsafe to prevent any race conditions
    const flagCheckInterval = setInterval(() => {
      if (window.__historyComponentMounted && !window.skipHistoryTracking) {
        console.log(
          "RecipeHistory: Resetting skipHistoryTracking flag (it was cleared)"
        );
        window.skipHistoryTracking = true;
      }
    }, 500); // Check every 500ms

    return () => {
      clearInterval(flagCheckInterval);
    };
  }, []);

  // Set window.showRecipeModal for compatibility
  useEffect(() => {
    const originalShowRecipeModal = window.showRecipeModal;

    window.showRecipeModal = (recipe) => {
      setSelectedRecipe(recipe);
    };

    return () => {
      window.showRecipeModal = originalShowRecipeModal;
    };
  }, []);

  // Helper function to normalize recipe data from different sources
  const normalizeRecipeData = (item) => {
    // Log what's coming in
    console.log("Normalizing history item:", item);

    // Shallow copy to avoid mutating the original
    const normalizedItem = { ...item };

    // Extract key properties
    const sourceType = item.sourceType || "unknown";
    const sourceId = item.sourceId || null;

    // For Spoonacular recipes, extract the actual numeric ID
    let actualSpoonacularId = null;
    if (sourceType === "spoonacular") {
      // Check recipe.id first (most reliable)
      if (
        item.recipe &&
        item.recipe.id &&
        (typeof item.recipe.id === "number" ||
          /^\d+$/.test(String(item.recipe.id)))
      ) {
        actualSpoonacularId = item.recipe.id;
      }
      // Then check dedicated spoonacularId field
      else if (item.recipe && item.recipe.spoonacularId) {
        actualSpoonacularId = item.recipe.spoonacularId;
      }
      // Check if sourceId is already a clean numeric ID
      else if (sourceId && /^\d+$/.test(String(sourceId))) {
        actualSpoonacularId = sourceId;
      }

      // Log extraction attempt
      console.log(
        `Extracted Spoonacular ID: ${actualSpoonacularId} from recipe:`,
        {
          recipeId: item.recipe?.id,
          sourceId,
          spoonacularId: item.recipe?.spoonacularId,
        }
      );
    }

    // Get best recipe name - try multiple fields and clean it
    let name = "";
    if (item.recipeName && !item.recipeName.includes("Recipe ")) {
      name = item.recipeName;
    } else if (item.recipe?.name) {
      name = item.recipe.name;
    } else if (item.name && !item.name.includes("Recipe ")) {
      name = item.name;
    } else if (item.title) {
      name = item.title;
    } else if (sourceType === "spoonacular" && sourceId) {
      // For Spoonacular recipes, fetch details or build display name
      // Try to extract recipe name from history data
      const dishNames = [
        "pasta",
        "burger",
        "salad",
        "chicken",
        "soup",
        "steak",
        "fish",
        "tacos",
        "curry",
        "pizza",
      ];
      const randomDishIndex = Math.floor(Math.random() * dishNames.length);

      // If we didn't find a proper name in history, use a better generic name
      if (item.cuisineType) {
        name = `${item.cuisineType} ${dishNames[randomDishIndex]} recipe`;
      } else {
        name = `${
          dishNames[randomDishIndex].charAt(0).toUpperCase() +
          dishNames[randomDishIndex].slice(1)
        } recipe`;
      }

      // Always include the ID for reference
      const idToShow = actualSpoonacularId || sourceId;
      name = `${name} (${idToShow})`;
    } else {
      // Generic fallback name
      name = sourceType === "ai" ? "AI Generated Recipe" : "Recipe";
    }

    // Capitalize first letter of recipe name
    if (name && typeof name === "string") {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    // Get best image URL
    let imageUrl = null;
    if (item.image && !item.image.includes("undefined")) {
      imageUrl = item.image;
    } else if (item.recipe?.image) {
      imageUrl = item.recipe.image;
    } else if (sourceType === "spoonacular" && actualSpoonacularId) {
      // Use the extracted actual ID for Spoonacular images, but with our proxy
      imageUrl = `/api/image-proxy/spoonacular/${actualSpoonacularId}?size=556x370`;
    } else if (sourceType === "spoonacular" && sourceId) {
      // Make sure sourceId is clean
      const cleanId = String(sourceId).replace(/\D/g, "");
      if (cleanId) {
        imageUrl = `/api/image-proxy/spoonacular/${cleanId}?size=556x370`;
      }
    }

    // If still no image, use SVG placeholder
    if (!imageUrl) {
      imageUrl =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='18' text-anchor='middle' alignment-baseline='middle' font-family='Helvetica, Arial, sans-serif' fill='%23999999'%3ENo Image Available%3C/text%3E%3C/svg%3E";
    }

    // Now map into normalized object, combining with the original properties
    const result = {
      ...normalizedItem,
      _id:
        item._id ||
        `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      id: item._id || item.id || item.sourceId || `recipe-${Date.now()}`,
      name: name,
      title: name, // Duplicate for compatibility
      image: imageUrl,
      sourceType: sourceType,
      sourceId: sourceId,
      prepTime: item.prepTime || item.recipe?.prepTime || 30,
      servings: item.servings || item.recipe?.servings || 4,
      viewedAt: item.viewedAt || new Date().toISOString(),
      // Ensure these fields are always present for the RecipeCard
      ingredients: item.ingredients || item.recipe?.ingredients || [],
      instructions: item.instructions || item.recipe?.instructions || "",
      // Add actual Spoonacular ID for the RecipeCard component to use
      spoonacularId: actualSpoonacularId,
    };

    // Log normalized result
    console.log("Normalized result:", result);
    return result;
  };

  // Load history when page changes
  useEffect(() => {
    if (!historyLoadedRef.current || page > 1) {
      historyLoadedRef.current = true;
      loadHistory(page);
    }
  }, [page]); // Added page as a dependency to reload data when page changes

  // Load initial history
  useEffect(() => {
    if (!fetchedRef.current) {
      loadHistory(page);
    }
  }, []);

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
    // We'll let the useEffect handle the data loading
    // This is more reliable than trying to do it here
  };

  const loadHistory = async (pageNum) => {
    try {
      setLoading(true);
      setServerError(false);
      console.log(`Loading history page ${pageNum}`);

      fetchedRef.current = true;

      const response = await getRecipeHistory(pageNum);
      console.log("History response:", response);

      if (response && response.success) {
        // Process history items using the normalizeRecipeData helper
        const processedData = (response.data || []).map(normalizeRecipeData);

        setHistory(processedData);

        // Set pagination data
        if (response.pagination) {
          setTotalPages(response.pagination.pages || 1);
        } else {
          setTotalPages(response.totalPages || 1);
        }
      } else {
        setError(response.message || "Failed to load recipe history");
        showToast.error(response.message || "Failed to load recipe history");
        setHistory([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching recipe history:", error);
      setError("Failed to load recipe history");
      showToast.error("Failed to load recipe history");
      setHistory([]);
      setTotalPages(1);

      // Check if this is a server connection error
      if (error.message?.includes("Network Error") || !error.response) {
        setServerError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Retry loading if server error occurred
  const handleRetryLoad = () => {
    setServerError(false);
    setError(null);
    loadHistory(page);
  };

  const handleClearHistory = async () => {
    try {
      const response = await clearRecipeHistory();
      if (response.success) {
        setHistory([]);
        showToast.success("Recipe history cleared");
      } else {
        showToast.error("Failed to clear history");
      }
    } catch (error) {
      console.error("Error clearing history:", error);
      showToast.error("Failed to clear history");

      // Check if this is a server connection error
      if (error.message?.includes("Network Error") || !error.response) {
        setServerError(true);
      }
    }
  };

  // Add a new function to fetch recipe details from Spoonacular when needed
  const fetchSpoonacularRecipeDetails = async (sourceId) => {
    if (!sourceId) return null;

    try {
      console.log(`Fetching Spoonacular recipe details for ID: ${sourceId}`);
      const response = await axiosInstance.get(
        `/api/recipes/external/${sourceId}`,
        {
          params: { source: "spoonacular" },
        }
      );

      if (response.data && response.data.success) {
        console.log(
          `Successfully fetched details for Spoonacular recipe ${sourceId}`
        );
        return response.data.data;
      } else {
        console.error(
          `Error fetching Spoonacular recipe ${sourceId}:`,
          response.data?.message
        );
        return null;
      }
    } catch (error) {
      console.error(`Failed to fetch Spoonacular recipe ${sourceId}:`, error);
      return null;
    }
  };

  // Handle recipe selection with Spoonacular detail fetching
  const handleRecipeSelect = async (recipe) => {
    // If it's a Spoonacular recipe with just the basic info, fetch complete details
    if (
      recipe.sourceType === "spoonacular" &&
      recipe.sourceId &&
      (!recipe.ingredients ||
        recipe.ingredients.length <= 1 ||
        recipe.ingredients[0] === "Ingredients not available")
    ) {
      setLoading(true);
      const detailedRecipe = await fetchSpoonacularRecipeDetails(
        recipe.sourceId
      );

      if (detailedRecipe) {
        // Merge the detailed data with our history record data
        setSelectedRecipe({
          ...recipe,
          ...detailedRecipe,
          name: recipe.name || detailedRecipe.name || recipe.recipeName,
          source: "spoonacular",
        });
      } else {
        // If fetch fails, still show the recipe with the data we have
        setSelectedRecipe(recipe);
        showToast.warning("Couldn't fetch complete recipe details");
      }
      setLoading(false);
    } else {
      // For non-Spoonacular recipes or those that already have complete data
      setSelectedRecipe(recipe);
    }
  };

  // Modify the card click handler to use our new function
  const handleCardClick = (recipe) => {
    handleRecipeSelect(recipe);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const navigate = useNavigate();

  if (loading && history.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFCF50]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br mt-8 from-[#FFCF50]/10 to-[#23486A]/10 relative">
      <div className="container mx-auto px-4 py-8">
        {/* Header with yellow underline */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            <span className="border-b-4 border-[#FFCF50] pb-1">
              Recipe History
            </span>
          </h1>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center">
              <i className="fa-solid fa-trash-can mr-2"></i>
              Clear History
            </button>
          )}
        </div>

        {serverError ? (
          <div className="bg-red-500/10 rounded-xl p-6 text-center">
            <p className="text-red-500 text-lg mb-4">
              Cannot connect to server. Please check your internet connection.
            </p>
            <button
              onClick={handleRetryLoad}
              className="mt-2 px-4 py-2 bg-[#FFCF50] text-[#23486A] rounded-lg flex items-center gap-2 mx-auto">
              <i className="fa-solid fa-arrow-rotate-right"></i>
              Try Again
            </button>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : history.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {history.map((recipe) => (
              <RecipeCard
                key={recipe._id}
                recipe={recipe}
                onClick={() => handleCardClick(recipe)}
                showIngredients={false} // Simplify history cards
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-16 bg-white/10 dark:bg-[#192339]/50 rounded-xl border border-gray-200 dark:border-[#2A3B5C]/30">
            <div className="text-gray-400 text-8xl mb-6">
              <i className="fa-regular fa-clock"></i>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
              No Recipe History Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Your recently viewed recipes will appear here
            </p>
            <button
              onClick={() => navigate("/search-recipe")}
              className="px-6 py-3 bg-[#FFCF50] hover:bg-[#FFB81C] text-[#23486A] font-bold rounded-lg">
              Discover Recipes
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && (
              <button
                onClick={() => handlePageChange(page - 1)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-[#23486A]/10 text-[#23486A] hover:bg-[#23486A]/20"
                }`}>
                <i className="fa-solid fa-chevron-left mr-1"></i>
                Prev
              </button>
            )}
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                className={`px-4 py-2 rounded-lg ${
                  page === i + 1
                    ? "bg-[#FFCF50] text-[#23486A]"
                    : `${
                        isDarkMode
                          ? "bg-white/10 text-white hover:bg-white/20"
                          : "bg-[#23486A]/10 text-[#23486A] hover:bg-[#23486A]/20"
                      }`
                }`}>
                {i + 1}
              </button>
            ))}
            {page < totalPages && (
              <button
                onClick={() => handlePageChange(page + 1)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-[#23486A]/10 text-[#23486A] hover:bg-[#23486A]/20"
                }`}>
                Next
                <i className="fa-solid fa-chevron-right ml-1"></i>
              </button>
            )}
          </div>
        )}

        {/* Recipe Modal */}
        <UnifiedRecipeModal
          recipe={selectedRecipe}
          isOpen={!!selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          source={selectedRecipe?.sourceType || selectedRecipe?.source}
        />
      </div>
    </div>
  );
};

export default RecipeHistory;
