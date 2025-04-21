import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { yumix2 } from "../assets/assets.jsx";
import { showToast } from "@/utils/toast";
import { motion } from "framer-motion";
import { getUserFavorites, removeFavorite } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useTheme } from "../context/ThemeContext";
import FavoritesLimitAlert from "../components/FavoritesLimitAlert";
import { UnifiedRecipeModal } from "../components";
import { addToHistory, getRecipeById } from "../services/recipeService";
import {
  HeartIcon,
  ClockIcon,
  UserGroupIcon,
  TrashIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";

// Simple debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Favorites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    fetchFavorites,
    removeFromFavorites,
    addToFavorites,
    isFavorite,
    toggleFavorite: toggleFavoriteInContext,
  } = useFavorites();
  const { isDarkMode } = useTheme();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch user favorites
  useEffect(() => {
    const fetchUserFavorites = async () => {
      try {
        setLoading(true);
        const response = await getUserFavorites();
        if (response.success) {
          setFavorites(response.data || []);
        } else {
          setError(response.message || "Failed to fetch favorites");
          showToast.error("Failed to fetch favorites");
        }
      } catch (error) {
        setError("An error occurred while fetching favorites");
        showToast.error("An error occurred while fetching favorites");
      } finally {
        setLoading(false);
      }
    };

    fetchUserFavorites();
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(favorites.length / itemsPerPage);
  const paginatedFavorites = favorites.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleRemoveFavorite = async (recipeId) => {
    try {
      // Optimistically update UI
      setFavorites((prevFavorites) =>
        prevFavorites.filter((recipe) => recipe._id !== recipeId)
      );

      // Update context
      removeFromFavorites(recipeId);

      // Call API
      const response = await removeFavorite(recipeId);

      if (!response.success) {
        showToast.error(response.message || "Failed to remove from favorites");
        // Refetch favorites to revert changes if API call failed
        const refreshResponse = await getUserFavorites();
        if (refreshResponse.success) {
          setFavorites(refreshResponse.data || []);
        }
      }
    } catch (error) {
      showToast.error("An error occurred while removing the favorite");
      // Refetch favorites to revert changes
      const refreshResponse = await getUserFavorites();
      if (refreshResponse.success) {
        setFavorites(refreshResponse.data || []);
      }
    }
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

  // Debounced history tracking to prevent multiple calls
  const addToHistoryDebounced = debounce(async (recipeId) => {
    try {
      if (user && recipeId) {
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
    // Show loading state first
    setModalLoading(true);
    setSelectedRecipe(recipe); // Set initial recipe data for immediate UI feedback

    try {
      // Ensure we have a valid recipe ID
      if (!recipe || !recipe._id) {
        console.error("Invalid recipe data:", recipe);
        showToast.error("Unable to view recipe details");
        setModalLoading(false);
        return;
      }

      console.log("Fetching complete recipe details for:", recipe.name);

      // Make a dedicated API call to get the complete recipe details
      const response = await getRecipeById(recipe._id);

      if (response.success && response.data) {
        // Combine data from both sources to ensure we have everything
        const completeRecipe = {
          ...recipe, // Keep original favorite data
          ...response.data, // Add freshly fetched data
          ingredients: response.data.ingredients || recipe.ingredients || [],
          instructions:
            response.data.instructions ||
            recipe.instructions ||
            "Instructions not available",
        };

        // Update with the enhanced recipe data
        setSelectedRecipe(completeRecipe);

        // Add to history
        if (recipe._id.match(/^[0-9a-fA-F]{24}$/)) {
          addToHistoryDebounced(recipe._id);
        }
      } else {
        console.error("Failed to fetch complete recipe:", response.message);
        showToast.error("Could not load all recipe details");
      }
    } catch (error) {
      console.error("Error fetching complete recipe details:", error);
      showToast.error("Error loading recipe details");
    } finally {
      setModalLoading(false);
    }
  };

  // Simplified favorite toggle handler using the context's functionality
  const handleToggleFavorite = async (e, recipe) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling
    }

    if (!user) {
      showToast("Please log in to save favorites", "info");
      return;
    }

    try {
      const recipeId = recipe?._id;
      if (!recipeId) {
        showToast("Invalid recipe data", "error");
        return;
      }

      const currentlyFavorite = isFavorite(recipeId);
      const action = currentlyFavorite
        ? "removeFromFavorites"
        : "addToFavorites";

      // Let the context handle the API call and state updates
      await toggleFavoriteInContext(recipe);

      showToast(
        currentlyFavorite ? "Removed from favorites" : "Added to favorites",
        "success"
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast("An error occurred while updating favorites", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br mt-8 from-[#FFCF50]/10 to-[#23486A]/10 relative">
      {/* Main Content */}
      <div className="flex-1 md:ml-0 relative z-10">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#23486A] p-4 flex items-center justify-between rounded-b-2xl shadow-lg">
          <button
            onClick={toggleSidebar}
            className="text-white focus:outline-none">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <img src={yumix2} alt="YuMix" className="h-8 w-auto" />
        </div>

        {/* Favorites Content */}
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {/* Favorites Limit Alert */}
          <FavoritesLimitAlert className="mb-6" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-white">
                <span className="border-b-4 border-[#FFCF50] pb-1">
                  My Favorite Recipes
                </span>
              </h1>
              <p className="text-white mt-4 text-lg font-medium">
                {favorites.length}
                {favorites.length === 1 ? " recipe" : " recipes"} saved
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFCF50]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg text-red-600 text-center">
              {error}
            </div>
          ) : favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {favorites.map((recipe) => (
                <motion.div
                  key={recipe._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-[#23486A]/10 hover:border-[#23486A]/30 group">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={recipe.image}
                      alt={recipe.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-0 right-0 p-2">
                      <button
                        onClick={() => handleRemoveFavorite(recipe._id)}
                        className="bg-white/80 hover:bg-white p-2 rounded-full text-red-500 hover:text-red-600 transition-colors shadow-md">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    {recipe.category && (
                      <div className="absolute top-0 left-0 p-2">
                        <span className="bg-[#23486A]/80 text-white px-2 py-1 rounded-md text-xs">
                          {recipe.category}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-[#23486A] mb-2 group-hover:text-[#23486A] transition-colors">
                      {recipe.name}
                    </h3>
                    <div className="flex justify-between text-sm text-[#23486A]/70 mb-3">
                      <span className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {recipe.prepTime || recipe.readyInMinutes || "30"} min
                      </span>
                      <span className="flex items-center">
                        <UserGroupIcon className="w-4 h-4 mr-1" />
                        {recipe.servings || "4"} servings
                      </span>
                    </div>
                    {recipe.savedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Saved on {formatDate(recipe.savedAt)}
                        </span>
                        <HeartIconSolid className="w-5 h-5 text-[#FFCF50]" />
                      </div>
                    )}
                    <button
                      onClick={(e) => handleViewRecipe(recipe)}
                      className="w-full mt-3 text-[#23486A] hover:text-white font-medium text-sm flex items-center justify-center py-2 border-2 border-[#23486A] rounded-lg hover:bg-[#23486A] transition-all">
                      View Recipe
                      <ArrowRightIcon className="ml-1 w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center p-16 bg-white/10 dark:bg-[#192339]/50 rounded-xl border border-gray-200 dark:border-[#2A3B5C]/30">
              <HeartIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
                No Favorite Recipes Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Start exploring recipes and save your favorites to see them
                here!
              </p>
              <Link
                to="/recipes"
                className="inline-flex items-center px-6 py-3 bg-[#FFCF50] hover:bg-[#FFB81C] text-[#23486A] font-bold rounded-lg">
                Discover Recipes
                <MagnifyingGlassIcon className="ml-2 w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recipe Modal */}
      <UnifiedRecipeModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onToggleFavorite={handleToggleFavorite}
        loading={modalLoading}
      />
    </div>
  );
};

export default Favorites;
