import React, { useState, useEffect } from "react";
import { HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import { extractRecipeId } from "../utils/recipeUtils";
import { useNavigate } from "react-router-dom";

/**
 * Get a YouTube thumbnail URL for a recipe
 * @param {string} recipeName - The name of the recipe
 * @returns {string} - YouTube thumbnail URL
 */
const getYouTubeThumbnail = (recipeName) => {
  if (!recipeName) return "/api/image-proxy/youtube/cooking"; // Use our proxy endpoint

  // Clean the recipe name for YouTube search
  const searchQuery = recipeName.replace(/recipe|spoonacular/gi, "").trim();

  // If no valid search term, use a food-related thumbnail through our proxy
  if (!searchQuery || searchQuery.length < 3) {
    return "/api/image-proxy/youtube/cooking";
  }

  // Use our backend proxy for YouTube thumbnails instead of direct access
  return `/api/image-proxy/youtube/${encodeURIComponent(searchQuery)}`;
};

// Utility function to check if Spoonacular image URL has proper format
function isValidSpoonacularId(id) {
  return id && /^\d+$/.test(id);
}

/**
 * Get the image URL for a recipe, with fallbacks for different scenarios
 * @param {Object} recipe - Recipe object containing image info
 * @returns {string} - URL for the recipe image
 */
function getImageUrl(recipe) {
  // Case 1: Recipe has a valid Spoonacular ID - use our proxy
  if (recipe?.id && isValidSpoonacularId(recipe.id)) {
    return `/api/image-proxy/spoonacular/${recipe.id}?size=556x370`;
  }

  // Case 2: Check if image URL is from Spoonacular - extract ID and use our proxy
  if (recipe?.image && typeof recipe.image === "string") {
    // Check if it's a Spoonacular URL
    const spoonacularMatches = recipe.image.match(
      /spoonacular\.com\/recipeImages\/(\d+)-\d+x\d+/
    );
    if (spoonacularMatches && spoonacularMatches[1]) {
      return `/api/image-proxy/spoonacular/${spoonacularMatches[1]}?size=556x370`;
    }

    // Alternative Spoonacular URL format
    const altSpoonacularMatches = recipe.image.match(
      /images\.spoonacular\.com\/file\/wximages\/(\d+)-\d+x\d+/
    );
    if (altSpoonacularMatches && altSpoonacularMatches[1]) {
      return `/api/image-proxy/spoonacular/${altSpoonacularMatches[1]}?size=556x370`;
    }

    // If recipe has any other image URL (non-Spoonacular), use it directly
    if (
      recipe.image.match(/^https?:\/\//) &&
      !recipe.image.includes("spoonacular.com") &&
      !recipe.image.includes("img.spoonacular.com")
    ) {
      return recipe.image;
    }
  }

  // Case 3: Extract ID from recipe fields
  if (recipe?.sourceId && isValidSpoonacularId(recipe.sourceId)) {
    return `/api/image-proxy/spoonacular/${recipe.sourceId}?size=556x370`;
  }

  // Case 4: For AI-generated recipes or recipes without proper images, use YouTube thumbnail
  if (recipe?.title || recipe?.name) {
    return getYouTubeThumbnail(recipe.title || recipe.name);
  }

  // Default fallback - generic cooking video thumbnail
  return `/api/image-proxy/youtube/cooking`;
}

/**
 * Standardized RecipeCard component for consistent display across the application
 */
const RecipeCard = ({
  recipe,
  onClick,
  showFavorite = true,
  showIngredients = true,
  showViewButton = true,
  className = "",
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [finalImageUrl, setFinalImageUrl] = useState(null);

  // Handle if recipe is undefined or null
  if (!recipe) {
    return null;
  }

  // Extract recipe ID using standardized utility
  const recipeId = extractRecipeId(recipe);

  // Check if this recipe is a favorite
  const isRecipeFavorite = isFavorite(recipeId);

  // Determine recipe source type
  const sourceType = recipe.sourceType || recipe.source || "unknown";

  // Get diet type tags
  const dietType = recipe.dietType || recipe.diets || [];
  const diets = Array.isArray(dietType) ? dietType : [dietType];

  // Extract preparation time
  const prepTime =
    typeof recipe.prepTime === "string" && recipe.prepTime.includes("min")
      ? recipe.prepTime
      : recipe.prepTime
      ? `${recipe.prepTime} mins`
      : recipe.readyInMinutes
      ? `${recipe.readyInMinutes} mins`
      : "30 mins";

  const servings = recipe.servings || 4;

  // Initialize the image URL when recipe changes
  useEffect(() => {
    if (recipe) {
      setFinalImageUrl(getImageUrl(recipe));
      setImageError(false);
      setRetryCount(0);
    }
  }, [recipe]);

  // Handle click on the recipe card
  const handleClick = () => {
    if (onClick) {
      onClick(recipe);
    }
  };

  // Handle favorite toggling
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (isAuthenticated) {
      toggleFavorite(recipe);
    } else {
      // Redirect to login if not authenticated
      navigate("/login");
    }
  };

  // Handle image loading error
  const handleImageError = () => {
    // Log more data for debugging
    console.log(`Image error for recipe:`, {
      id: recipe.id,
      title: recipe.title || recipe.name,
      currentUrl: finalImageUrl,
      retryCount,
    });

    if (retryCount < 2) {
      // Try to reload the same image URL (handles temporary network issues)
      console.log(
        `Image load failed for ${
          recipe.title || recipe.name || "unknown recipe"
        }, retry ${retryCount + 1}/2`
      );
      setRetryCount((prev) => prev + 1);

      // For Spoonacular proxy URLs, try a different size on retry
      if (finalImageUrl.includes("/api/image-proxy/spoonacular/")) {
        const newSize = retryCount === 0 ? "312x231" : "240x150";
        const baseUrl = finalImageUrl.split("?")[0];
        setFinalImageUrl(`${baseUrl}?size=${newSize}&t=${Date.now()}`);
      } else {
        // Force a re-render by appending a timestamp
        setFinalImageUrl(
          `${finalImageUrl}${
            finalImageUrl.includes("?") ? "&" : "?"
          }t=${Date.now()}`
        );
      }
    } else {
      console.log(
        `Image load failed after 2 retries, using YouTube thumbnail fallback for: ${
          recipe.title || recipe.name || "unknown recipe"
        }`
      );
      setImageError(true);

      // Use our proxy endpoint for YouTube thumbnail as fallback
      const fallbackUrl = `/api/image-proxy/youtube/${encodeURIComponent(
        recipe.title || recipe.name || "cooking"
      )}`;
      console.log(`Using fallback URL: ${fallbackUrl}`);
      setFinalImageUrl(fallbackUrl);
    }
  };

  // Get the display name for the recipe
  const getDisplayName = () => {
    // If the recipe comes from history and has a proper name, use it
    if (recipe.recipeName && !recipe.recipeName.match(/^Recipe\s+\d+$/)) {
      return recipe.recipeName;
    }

    // If there's a proper name that's not just "Recipe ID", use it
    if (recipe.name && !recipe.name.match(/^Recipe\s+\d+$/)) {
      return recipe.name;
    }

    // If there's a title, use that
    if (recipe.title) {
      return recipe.title;
    }

    // For Spoonacular recipes from history, try to create a better name
    if (recipe.sourceType === "spoonacular" && recipe.sourceId) {
      const cleanId = String(recipe.sourceId).replace(/\D/g, "");
      if (recipe.recipeName && recipe.recipeName !== `Recipe ${cleanId}`) {
        return recipe.recipeName;
      }
      return `Spoonacular Recipe ${cleanId}`;
    }

    // Default to recipe ID with source type
    if (recipeId) {
      if (sourceType === "spoonacular") {
        return `Spoonacular Recipe ${recipeId}`;
      } else if (sourceType === "ai") {
        return `AI Generated Recipe`;
      }
      return `Recipe ${recipeId}`;
    }

    // Ultimate fallback
    return "Unknown Recipe";
  };

  // Get ingredients array or fallback
  const getIngredients = () => {
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      return recipe.ingredients
        .slice(0, 3)
        .map((ing) =>
          typeof ing === "string"
            ? ing
            : ing.name || ing.original || String(ing)
        );
    } else if (
      recipe.extendedIngredients &&
      Array.isArray(recipe.extendedIngredients)
    ) {
      return recipe.extendedIngredients
        .slice(0, 3)
        .map((ing) => ing.name || ing.original || String(ing));
    }
    return [];
  };

  // Card style with source type badge
  return (
    <div
      className={`bg-white rounded-xl shadow-md overflow-hidden transition-all hover:shadow-lg cursor-pointer transform hover:scale-[1.02] flex flex-col h-full ${className}`}
      onClick={handleClick}>
      {/* Image */}
      <div className="relative h-52 w-full overflow-hidden bg-gray-100">
        <img
          src={finalImageUrl}
          alt={getDisplayName()}
          className={`w-full h-full object-cover ${
            imageError ? "fallback-image" : ""
          }`}
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleImageError}
          data-recipe-id={recipe.id || "unknown"}
          data-recipe-title={recipe.title || recipe.name || "unknown"}
        />

        {/* Source type badge */}
        <div className="absolute bottom-3 right-3">
          <span className="px-3 py-1 bg-gray-700/70 rounded-full text-white text-xs">
            {sourceType === "spoonacular"
              ? "Spoonacular"
              : sourceType === "ai"
              ? "AI Generated"
              : sourceType === "local"
              ? "Local"
              : "Recipe"}
          </span>
        </div>

        {/* Show favorite button if enabled */}
        {showFavorite && (
          <button
            onClick={handleFavoriteClick}
            className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transform hover:scale-105 transition-all">
            {isRecipeFavorite ? (
              <HeartIcon className="h-5 w-5 text-red-500" />
            ) : (
              <HeartOutlineIcon className="h-5 w-5 text-gray-500 hover:text-red-500" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col">
        <div className="flex-1">
          <h3 className="font-medium text-gray-800 mb-1 line-clamp-2">
            {getDisplayName()}
          </h3>

          {/* Recipe meta info */}
          <div className="flex items-center text-xs text-gray-500 mb-2 space-x-2">
            <span className="flex items-center">
              <svg
                className="h-3 w-3 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {prepTime}
            </span>
            <span className="flex items-center">
              <svg
                className="h-3 w-3 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {servings} servings
            </span>
          </div>

          {/* Ingredients preview (if enabled) */}
          {showIngredients && (
            <div className="mb-2">
              <div className="space-y-1">
                {getIngredients().map((ingredient, index) => (
                  <div
                    key={index}
                    className="text-xs text-gray-600 line-clamp-1">
                    • {ingredient}
                  </div>
                ))}
                {getIngredients().length === 0 && (
                  <div className="text-xs text-gray-400">
                    No ingredients available
                  </div>
                )}
                {getIngredients().length > 0 &&
                  (recipe.ingredients?.length > 3 ||
                    recipe.extendedIngredients?.length > 3) && (
                    <div className="text-xs text-blue-500">
                      + more ingredients
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* View button (if enabled) */}
        {showViewButton && (
          <button className="mt-2 text-xs bg-[#FFCF50] hover:bg-[#F7B500] text-[#23486A] font-semibold py-1.5 px-3 rounded-md transition-all">
            View Recipe
          </button>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;
