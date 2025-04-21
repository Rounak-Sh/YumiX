import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import {
  MagnifyingGlassIcon,
  StarIcon,
  XMarkIcon,
  PlayIcon,
  UserIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { SkeletonLoader } from "../components/Loader";

export default function Recipes() {
  const { theme } = useOutletContext();
  const [ingredients, setIngredients] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const getYoutubeVideoId = async (recipeName) => {
    try {
      const response = await adminApi.getRecipeVideo(recipeName);

      if (response.data.success) {
        return {
          videoId: response.data.videoId,
          thumbnail: response.data.thumbnail,
          title: response.data.title,
          url: response.data.url,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching video for recipe:", recipeName, error);
      return null;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!ingredients.trim()) {
      showToast.error("Please enter ingredients");
      return;
    }

    setLoading(true);
    try {
      const response = await adminApi.searchRecipesByIngredients(ingredients);

      if (response.data.success) {
        // Fetch video IDs for each recipe
        try {
          const recipesWithVideos = await Promise.all(
            response.data.data.map(async (recipe) => {
              const videoData = await getYoutubeVideoId(recipe.name);
              return {
                ...recipe,
                youtube: videoData,
              };
            })
          );
          setRecipes(recipesWithVideos || []);
        } catch (videoError) {
          console.error("Error fetching videos:", videoError);
          // Fall back to recipes without videos
          setRecipes(response.data.data || []);
        }
      } else {
        showToast.error(response.data.message || "Failed to fetch recipes");
      }
    } catch (error) {
      console.error("Recipe search error:", error);
      showToast.error(
        error.response?.data?.message || "Failed to fetch recipes"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureRecipe = async (recipeId) => {
    let recipeToUpdate;

    try {
      recipeToUpdate = recipes.find((r) => r.sourceId === recipeId);
      if (!recipeToUpdate) {
        showToast.error("Recipe not found");
        return;
      }

      if (recipeToUpdate.isFeatured) {
        await adminApi.removeFeaturedRecipe(recipeToUpdate.sourceId);
        showToast.success("Recipe removed from featured");
      } else {
        await adminApi.markRecipeAsFeatured(recipeToUpdate.sourceId, {
          name: recipeToUpdate.name,
          ingredients: recipeToUpdate.ingredients,
          instructions: recipeToUpdate.instructions,
          image: recipeToUpdate.image,
          prepTime: recipeToUpdate.prepTime,
          servings: recipeToUpdate.servings,
        });
        showToast.success("Recipe marked as featured");
      }

      setRecipes(
        recipes.map((recipe) =>
          recipe.sourceId === recipeId
            ? { ...recipe, isFeatured: !recipe.isFeatured }
            : recipe
        )
      );
    } catch (error) {
      console.error("Feature/unfeature error:", error);
      showToast.error(
        recipeToUpdate?.isFeatured
          ? "Failed to unfeature recipe"
          : "Failed to feature recipe"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${theme.text}`}>
          Recipe Management
        </h1>
        <p className={`mt-1 ${theme.textSecondary}`}>
          Search recipes by ingredients and manage featured recipes
        </p>
      </div>

      {/* Search Form */}
      <div className="relative w-full max-w-4xl mx-auto">
        <div className="absolute inset-0 bg-black/20 blur-3xl opacity-20 rounded-2xl"></div>
        <form onSubmit={handleSearch} className="relative flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Enter ingredients (e.g., chicken, rice)"
              disabled={loading}
              className={`w-full h-14 rounded-2xl bg-black px-5 pl-12 text-white placeholder-gray-400 
                border border-white/10
                transition-all duration-300
                focus:bg-white focus:text-black focus:border-black focus:border-2 focus:placeholder-gray-600
                hover:border-white/30
                disabled:opacity-50`}
            />
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 transition-colors duration-300 peer-focus:text-black" />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`h-14 flex items-center gap-2 rounded-2xl px-8 font-medium
              transition-all duration-300 transform
              bg-black text-white border-2 border-white/10
              hover:bg-white hover:text-black hover:border-black
              active:scale-95
              focus:outline-none focus:border-black
              disabled:opacity-50 disabled:cursor-not-allowed`}>
            {loading ? (
              <>
                <div className="h-5 w-5 border-2 border-current border-t-transparent animate-spin rounded-full"></div>
                Searching...
              </>
            ) : (
              "Search Recipes"
            )}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={`text-center ${theme.textSecondary}`}>
          Loading recipes...
        </div>
      )}

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {recipes.map((recipe) => (
          <div
            key={recipe._id}
            className={`rounded-lg ${theme.card} border border-black overflow-hidden hover:shadow-lg transition-shadow duration-300`}>
            {/* Recipe Image/Video - Make entire card clickable */}
            <div
              className="relative h-[180px] bg-gray-100 cursor-pointer"
              onClick={() => setSelectedRecipe(recipe)}>
              {recipe.youtube?.videoId ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={recipe.youtube.thumbnail}
                    alt={recipe.name || recipe.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                      <PlayIcon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={recipe.image}
                    alt={recipe.name || recipe.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                      <BookOpenIcon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-3">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold line-clamp-2 flex-1 mr-2">
                  {recipe.name || recipe.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeatureRecipe(recipe.sourceId);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  {recipe.isFeatured ? (
                    <StarSolidIcon className="h-7 w-7 text-yellow-400" />
                  ) : (
                    <StarIcon className="h-7 w-7 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Recipe Details */}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRecipe(recipe);
                  }}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                  <BookOpenIcon className="h-4 w-4" />
                  <span>View Recipe</span>
                </button>
                <div className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  <span>{recipe.servings} servings</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recipe Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-[90%] max-w-3xl bg-white rounded-lg overflow-hidden shadow-lg border border-black">
            {/* Recipe Title */}
            <div className="flex justify-between items-center p-4 bg-black">
              <h2 className="text-base font-bold text-white">
                {selectedRecipe.name || selectedRecipe.title}
              </h2>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-white hover:text-gray-300">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Video Section - With padding */}
            {selectedRecipe.youtube?.videoId && (
              <div className="w-full px-2 py-2 bg-gray-50">
                <div className="w-full h-[280px]">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedRecipe.youtube.videoId}`}
                    title={selectedRecipe.name || selectedRecipe.title}
                    className="w-full h-full rounded-md border border-black"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Recipe Content - Two columns */}
            <div className="p-4 overflow-y-auto custom-scrollbar max-h-[45vh]">
              <div className="grid grid-cols-2 gap-6">
                {/* Ingredients Column */}
                <div className="pr-4">
                  <h3 className="text-base font-semibold mb-3">Ingredients</h3>
                  <ul className="text-sm space-y-2 pl-4">
                    {Array.isArray(selectedRecipe.ingredients) ? (
                      selectedRecipe.ingredients.map((ingredient, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2 text-lg">•</span>
                          <span className="text-gray-700">
                            {typeof ingredient === "object"
                              ? `${ingredient.name}: ${ingredient.amount} ${ingredient.unit}`
                              : ingredient}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-700">
                        No ingredients available
                      </li>
                    )}
                  </ul>
                </div>

                {/* Instructions Column */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Instructions</h3>
                  <ol className="text-sm space-y-3 pl-4">
                    {selectedRecipe.instructions
                      // First remove HTML tags
                      .replace(/<[^>]*>/g, "")
                      // Then split by periods
                      .split(".")
                      .filter((step) => step.trim())
                      .map((step, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="flex-shrink-0 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center mr-2 text-xs">
                            {idx + 1}
                          </span>
                          <span className="text-gray-700">{step.trim()}</span>
                        </li>
                      ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && recipes.length === 0 && (
        <div
          className={`flex flex-col items-center justify-center rounded-lg ${theme.card} border ${theme.border} py-12`}>
          <MagnifyingGlassIcon className={`h-12 w-12 ${theme.textSecondary}`} />
          <p className={`mt-2 text-center ${theme.text}`}>
            Search for recipes by entering ingredients
          </p>
          <p className={`text-sm ${theme.textSecondary}`}>
            Example: chicken, rice, tomatoes
          </p>
        </div>
      )}
    </div>
  );
}
