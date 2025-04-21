import React from "react";
import { HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import { extractRecipeId } from "../utils/recipeUtils";

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

  // Get appropriate image URL based on recipe type
  const getImageUrl = () => {
    // If recipe has an image that's not from Spoonacular, use it directly
    if (
      recipe.image &&
      !recipe.image.includes("undefined") &&
      !recipe.image.includes("spoonacular.com") &&
      !recipe.image.includes("img.spoonacular.com")
    ) {
      return recipe.image;
    }

    // Extract actual Spoonacular ID from the recipe object
    let spoonacularId = null;

    // For history items, check the nested recipe object first
    if (sourceType === "spoonacular" && recipe.recipe) {
      if (
        typeof recipe.recipe.id === "number" ||
        (typeof recipe.recipe.id === "string" && /^\d+$/.test(recipe.recipe.id))
      ) {
        // Recipe has a numeric ID directly in recipe.id
        spoonacularId = recipe.recipe.id;
      } else if (recipe.recipe.spoonacularId) {
        // Check for a dedicated spoonacularId field
        spoonacularId = recipe.recipe.spoonacularId;
      }
    }

    // If we found a valid numeric ID in the recipe object
    if (spoonacularId) {
      // Always use the proxy for Spoonacular images
      return `/api/image-proxy/spoonacular/${spoonacularId}?size=556x370`;
    }

    // Try to extract ID from sourceId if it's numeric (legacy)
    if (sourceType === "spoonacular" && recipe.sourceId) {
      if (
        typeof recipe.sourceId === "number" ||
        (typeof recipe.sourceId === "string" && /^\d+$/.test(recipe.sourceId))
      ) {
        return `/api/image-proxy/spoonacular/${recipe.sourceId}?size=556x370`;
      }
    }

    // For numeric IDs that might be Spoonacular - ensure clean numeric ID
    if (typeof recipeId === "number" || /^\d+$/.test(recipeId)) {
      const cleanId = String(recipeId).replace(/\D/g, "");
      if (cleanId) {
        // Use our proxy instead of direct URL
        return `/api/image-proxy/spoonacular/${cleanId}?size=556x370`;
      }
    }

    // If the image URL is from Spoonacular, proxy it
    if (
      recipe.image &&
      (recipe.image.includes("spoonacular.com") ||
        recipe.image.includes("img.spoonacular.com"))
    ) {
      // Extract the recipe ID from the URL
      const match = recipe.image.match(/\/(\d+)-\d+x\d+\.jpg/);
      if (match && match[1]) {
        return `/api/image-proxy/spoonacular/${match[1]}?size=556x370`;
      }
    }

    // Use a data URI instead of external placeholder service
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='18' text-anchor='middle' alignment-baseline='middle' font-family='Helvetica, Arial, sans-serif' fill='%23999999'%3ENo Image Available%3C/text%3E%3C/svg%3E";
  };

  // Handle favorite toggling without propagating the click
  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Handle case where recipe might not have a valid ID
    if (!recipeId) {
      showToast("Cannot save this recipe to favorites", "error");
      return;
    }

    // Check authentication
    if (!isAuthenticated) {
      showToast("Please log in to save favorites", "info");
      return;
    }

    try {
      // Use the standardized toggleFavorite function
      toggleFavorite(recipe);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast("Failed to update favorites", "error");
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
      onClick={onClick}>
      {/* Image */}
      <div className="relative h-52 w-full overflow-hidden bg-gray-100">
        <img
          src={getImageUrl()}
          alt={getDisplayName()}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={(e) => {
            // Prevent infinite loop by tracking retry attempts
            const currentRetries = parseInt(e.target.dataset.retries || "0");
            if (currentRetries >= 2) {
              console.log("Max retries reached, using fallback image");
              e.target.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='18' text-anchor='middle' alignment-baseline='middle' font-family='Helvetica, Arial, sans-serif' fill='%23999999'%3ENo Image Available%3C/text%3E%3C/svg%3E";
              return;
            }

            // Increment retry counter
            e.target.dataset.retries = currentRetries + 1;

            // Try a different Spoonacular image size if the current one fails
            const currentSrc = e.target.src;
            if (
              currentSrc.includes("/api/image-proxy/spoonacular/") &&
              currentSrc.includes("size=556x370")
            ) {
              // Try the smaller image size through our proxy
              const newSrc = currentSrc.replace("size=556x370", "size=312x231");
              console.log(
                "Trying smaller Spoonacular image via proxy:",
                newSrc
              );
              e.target.src = newSrc;
              return;
            }

            // If we're using the API proxy and that's failing, try a different size as last resort
            if (currentSrc.includes("/api/image-proxy/spoonacular/")) {
              // Extract the ID from the URL
              const matches = currentSrc.match(
                /\/api\/image-proxy\/spoonacular\/(\d+)/
              );
              if (matches && matches[1]) {
                const spoonacularId = matches[1];
                // Try an even smaller image size (240x150) as last resort
                const lastResortUrl = `/api/image-proxy/spoonacular/${spoonacularId}?size=240x150`;
                console.log("Trying last resort image size:", lastResortUrl);
                e.target.src = lastResortUrl;
                return;
              }
            }

            // Recipe has a nested recipe object with ID
            if (recipe.recipe && recipe.recipe.id) {
              const directUrl = `/api/image-proxy/spoonacular/${recipe.recipe.id}?size=556x370`;
              console.log(
                "Trying direct URL with nested recipe.id:",
                directUrl
              );
              e.target.src = directUrl;
              return;
            }

            // If that doesn't work or for other images, use the SVG fallback
            console.log(
              "Using fallback image for:",
              recipe.sourceId || recipeId
            );
            e.target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='18' text-anchor='middle' alignment-baseline='middle' font-family='Helvetica, Arial, sans-serif' fill='%23999999'%3ENo Image Available%3C/text%3E%3C/svg%3E";
          }}
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
            onClick={handleToggleFavorite}
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
