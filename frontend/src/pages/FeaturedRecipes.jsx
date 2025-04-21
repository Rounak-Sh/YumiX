import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { showToast } from "@/utils/toast";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import axiosInstance from "../config/axios";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { addToHistory } from "../services/recipeService";
import { toggleFavorite } from "../services/userService";
import { UnifiedRecipeModal } from "../components";

const FeaturedRecipes = () => {
  const { isAuthenticated, user } = useAuth();
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const { isFavorite, addToFavorites, removeFromFavorites, fetchFavorites } =
    useFavorites();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Add refs to track fetch status and prevent duplicates
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  useEffect(() => {
    // Fetch featured recipes on initial load
    if (!isFetchingRef.current) {
      fetchFeaturedRecipes();
    }
  }, []);

  const fetchFeaturedRecipes = async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/recipes/featured");
      const recipes = response.data.data || [];
      setFeaturedRecipes(recipes);
      lastFetchTimeRef.current = Date.now();
    } catch (error) {
      console.error("Error fetching featured recipes:", error);
      showToast("Unable to load recipes. Please try again later.", "error");
      setFeaturedRecipes([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Debounced history tracking to prevent multiple calls
  const addToHistoryDebounced = debounce(async (recipeId) => {
    try {
      if (isAuthenticated && recipeId) {
        const result = await addToHistory(recipeId);
        if (!result.success) {
          console.log(`History update skipped: ${result.message}`);
        }
      }
    } catch (error) {
      console.error("Error in history tracking:", error);
    }
  }, 300);

  const handleViewRecipe = async (recipe) => {
    if (isAuthenticated) {
      // Set recipe first for immediate UI response
      setSelectedRecipe(recipe);

      // Only add to history if recipe has a valid ID
      if (recipe && recipe._id && recipe._id.match(/^[0-9a-fA-F]{24}$/)) {
        addToHistoryDebounced(recipe._id);
      }
    } else {
      navigate("/login?redirect=/featured-recipes");
    }
  };

  // Debounced favorite toggle to prevent rapid API calls
  const toggleFavoriteDebounced = debounce(
    async (recipeId, isFavoriteNow, recipeData) => {
      try {
        return await toggleFavorite(recipeId, isFavoriteNow, recipeData);
      } catch (error) {
        console.error("Error in toggleFavoriteDebounced:", error);
        showToast("An error occurred while updating favorites", "error");
        return {
          success: false,
          message: error?.message || "Failed to update favorites",
        };
      }
    },
    300
  );

  const handleToggleFavorite = async (e, recipe) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    if (!user) {
      showToast("Please log in to save favorites", "info");
      navigate("/login?redirect=/featured-recipes");
      return;
    }

    try {
      // Ensure recipe has an _id property
      const recipeId = recipe?._id;
      if (!recipeId) {
        showToast("Invalid recipe data", "error");
        return;
      }

      const currentlyFavorite = isFavorite(recipeId);

      // Optimistically update UI
      if (currentlyFavorite) {
        removeFromFavorites(recipeId);
      } else {
        addToFavorites(recipeId);
      }

      // Make API call with debounce - pass recipe data for new favorites
      const response = await toggleFavoriteDebounced(
        recipeId,
        !currentlyFavorite,
        !currentlyFavorite ? recipe : null
      );

      // Check if response exists and has a success property that is explicitly false
      if (response && response.success === false) {
        // Only revert and show error if success is explicitly false
        if (currentlyFavorite) {
          addToFavorites(recipeId);
        } else {
          removeFromFavorites(recipeId);
        }

        // Special handling for limit reached error
        if (response.limitReached) {
          showToast(`${response.message}`, "error");
          // Refresh favorites to ensure we have the latest limits
          fetchFavorites(true);
        } else {
          showToast(response.message || "Failed to update favorites", "error");
        }
      } else {
        // Show custom success message for successful operations
        showToast(
          currentlyFavorite ? "Removed from favorites" : "Added to favorites",
          "success"
        );
        // Refresh favorites to update limits info
        fetchFavorites(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast("An error occurred while updating favorites", "error");
    }
  };

  // Simple debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-6 text-white">
        <span className="border-b-4 border-[#FFCF50] pb-1">
          Featured Recipes
        </span>
      </h2>

      {loading ? (
        <div className="flex justify-center items-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFCF50]"></div>
        </div>
      ) : featuredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredRecipes.map((recipe) => (
            <div
              key={recipe._id}
              className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 relative">
              <div className="h-48 overflow-hidden relative">
                <img
                  src={
                    recipe.image ||
                    "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?q=80&w=1776&auto=format&fit=crop"
                  }
                  alt={recipe.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?q=80&w=1776&auto=format&fit=crop";
                  }}
                />
                <button
                  onClick={(e) => handleToggleFavorite(e, recipe)}
                  className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all duration-200 z-10 hover:scale-110">
                  {isFavorite(recipe._id) ? (
                    <HeartSolid className="w-5 h-5 text-red-500" />
                  ) : (
                    <HeartOutline className="w-5 h-5 text-gray-600 hover:text-red-500" />
                  )}
                </button>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg text-[#23486A] mb-2 group-hover:text-[#23486A] transition-colors">
                  {recipe.name || "Delicious Recipe"}
                </h3>
                <div className="flex justify-between text-sm text-[#23486A]/70 mb-4">
                  <span>
                    ⏱️{" "}
                    {recipe.prepTime
                      ? typeof recipe.prepTime === "string" &&
                        recipe.prepTime.includes("min")
                        ? recipe.prepTime
                        : `${recipe.prepTime} min`
                      : "30 min"}
                  </span>
                  <span>🍽️ {recipe.servings || "4"} servings</span>
                </div>
                <button
                  onClick={() => handleViewRecipe(recipe)}
                  className="w-full text-[#23486A] hover:text-white font-medium text-sm flex items-center justify-center py-2 border-2 border-[#23486A] rounded-lg hover:bg-[#23486A] transition-all">
                  View Recipe
                  <svg
                    className="ml-1 w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-10 text-center">
          <p
            className={`text-lg ${
              isDarkMode ? "text-white" : "text-[#23486A]"
            }`}>
            No featured recipes available at the moment.
          </p>
        </div>
      )}

      {/* Recipe Modal */}
      <UnifiedRecipeModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
};

export default FeaturedRecipes;
