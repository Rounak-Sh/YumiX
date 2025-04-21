import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import Loader, { SkeletonLoader } from "@/components/Loader";
import {
  XMarkIcon,
  PlayIcon,
  UserIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

export default function FeaturedRecipes() {
  const { theme } = useOutletContext();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [unfeaturingId, setUnfeaturingId] = useState(null);

  useEffect(() => {
    loadFeaturedRecipes();
  }, []);

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
      console.error("Error fetching video ID:", error);
      return null;
    }
  };

  const loadFeaturedRecipes = async () => {
    try {
      const response = await adminApi.getFeaturedRecipes();
      if (response.data.data) {
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
          setRecipes(recipesWithVideos);
        } catch (videoError) {
          console.error("Error fetching videos:", videoError);
          // Fall back to recipes without videos
          setRecipes(response.data.data);
        }
      }
    } catch (error) {
      console.error("Error loading featured recipes:", error);
      showToast.error("Failed to load featured recipes");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfeatureRecipe = async (recipeId) => {
    setUnfeaturingId(recipeId);
    try {
      await adminApi.removeFeaturedRecipe(recipeId);
      showToast.success("Recipe removed from featured");
      setRecipes(recipes.filter((recipe) => recipe.sourceId !== recipeId));
    } catch (error) {
      showToast.error("Failed to unfeature recipe");
    } finally {
      setUnfeaturingId(null);
    }
  };

  if (loading) {
    return <Loader type="grid" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${theme.text}`}>Featured Recipes</h1>
        <p className={`mt-1 ${theme.textSecondary}`}>
          Manage recipes featured on the home page
        </p>
      </div>

      {/* Featured Recipes Grid */}
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
                    alt={recipe.name}
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
                    alt={recipe.name}
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
                  {recipe.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnfeatureRecipe(recipe.sourceId);
                  }}
                  disabled={unfeaturingId === recipe.sourceId}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-70">
                  {unfeaturingId === recipe.sourceId ? (
                    <div className="h-7 w-7 flex items-center justify-center">
                      <SkeletonLoader size="small" type="simple" />
                    </div>
                  ) : (
                    <StarSolidIcon className="h-7 w-7 text-yellow-400" />
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

      {/* Full Recipe Modal - Updated to match the second screenshot */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-[90%] max-w-3xl bg-white rounded-lg overflow-hidden shadow-lg border border-black">
            {/* Recipe Title */}
            <div className="flex justify-between items-center p-4 bg-black">
              <h2 className="text-base font-bold text-white">
                {selectedRecipe.name}
              </h2>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-white hover:text-gray-300">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Video Section - With padding */}
            {selectedRecipe.youtube?.videoId ? (
              <div className="w-full px-2 py-2 bg-gray-50">
                <div className="w-full h-[280px]">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedRecipe.youtube.videoId}`}
                    title={selectedRecipe.name}
                    className="w-full h-full rounded-md border border-black"
                    allowFullScreen
                    width="560"
                    height="315"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            ) : (
              <div className="w-full px-2 py-2 bg-gray-50">
                {selectedRecipe.image && (
                  <div className="relative w-full h-[280px]">
                    <img
                      src={selectedRecipe.image}
                      alt={selectedRecipe.name}
                      className="w-full h-full object-cover rounded-md border border-black"
                    />
                  </div>
                )}
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
        <div className={`text-center ${theme.textSecondary} py-12`}>
          No featured recipes yet
        </div>
      )}
    </div>
  );
}
