import { useState, useRef, useEffect } from "react";
import {
  XMarkIcon,
  HeartIcon,
  PlayIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { useFavorites } from "../../context/FavoritesContext";
import { useAuth } from "../../context/AuthContext";
import { showToast } from "../../utils/toast";
import YouTubePlayerFallback from "../YouTubePlayerFallback";

/**
 * Enhanced Recipe Modal with tabbed interface for AI-generated recipes
 *
 * @deprecated This component is being replaced by UnifiedRecipeModal.
 * Please use UnifiedRecipeModal instead for all new code.
 */
const EnhancedRecipeModal = ({ recipe, isOpen, onClose, onSave, source }) => {
  // Log deprecation warning in development environment
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "EnhancedRecipeModal is deprecated. Please use UnifiedRecipeModal instead."
      );
    }
  }, []);

  const [activeTab, setActiveTab] = useState("recipe");
  const [selectedVideo, setSelectedVideo] = useState(
    recipe?.youtubeVideos?.[0] || null
  );
  const [videoError, setVideoError] = useState(false);
  const [showFallbackUI, setShowFallbackUI] = useState(false);
  const iframeRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Reset video error state when video changes
  useEffect(() => {
    setVideoError(false);
    setShowFallbackUI(false);
  }, [selectedVideo]);

  // Check if iframe loaded correctly
  useEffect(() => {
    if (activeTab === "videos" && iframeRef.current && !showFallbackUI) {
      const timeoutId = setTimeout(() => {
        try {
          // If we can't access contentWindow, it might be blocked
          if (!iframeRef.current.contentWindow) {
            handleVideoError();
          }
        } catch (error) {
          // Any error here likely means iframe is blocked
          handleVideoError();
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, showFallbackUI, selectedVideo]);

  const handleVideoError = (e) => {
    console.error("YouTube iframe failed to load", e);

    // If we've already displayed an error, don't show it again
    if (videoError) return;

    // Log detailed information about the error
    try {
      const iframeSrc = e.target.src;
      console.log("Failed iframe src:", iframeSrc);

      // Check if this is due to Content-Security-Policy
      if (e.message && e.message.includes("Content Security Policy")) {
        setVideoError({
          message:
            "Video blocked by Content Security Policy. Try opening in YouTube directly.",
          type: "csp",
        });
      } else {
        // Default error for connection refused or other issues
        setVideoError({
          message:
            "Video preview unavailable. Try opening in YouTube directly.",
          type: "connection",
        });
      }
    } catch (err) {
      console.error("Error analyzing video error:", err);
      setVideoError({
        message: "Video preview unavailable. Try opening in YouTube directly.",
        type: "unknown",
      });
    }

    setShowFallbackUI(true);
  };

  // Extract video ID from various YouTube URL formats
  const getCleanVideoId = (id) => {
    if (!id) return "";

    // If it's a full URL, extract the ID
    if (typeof id === "string" && id.includes("youtube.com")) {
      // Handle both /watch?v= and /embed/ formats
      if (id.includes("/watch?v=")) {
        return id.split("/watch?v=")[1].split("&")[0];
      } else if (id.includes("/embed/")) {
        return id.split("/embed/")[1].split("?")[0];
      }
    }

    // If it's already an ID, return it as is
    return id;
  };

  const tryPlayEmbedded = () => {
    setVideoError(false);
    setShowFallbackUI(false);
  };

  if (!isOpen || !recipe) return null;

  const openYouTubeVideo = (video) => {
    if (video?.videoId) {
      const videoId = getCleanVideoId(video.videoId);
      window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      showToast("Please log in to save favorites", "info");
      return;
    }

    try {
      // Make sure recipe has an ID to avoid issues with favorites tracking
      const recipeId = recipe._id || recipe.sourceId || `ai-${Date.now()}`;
      await toggleFavorite(recipeId, recipe);
      showToast(
        isFavorite(recipeId)
          ? "Recipe removed from favorites"
          : "Recipe added to favorites",
        "success"
      );
    } catch (error) {
      showToast("Failed to update favorites", "error");
    }
  };

  const handleSave = () => {
    if (onSave) onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header with Source Badge */}
        <div className="flex justify-between items-center p-4 bg-[#23486A] text-white">
          <div className="flex items-center">
            <h2 className="text-xl font-bold">{recipe.name}</h2>
            {source && (
              <span
                className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                  source === "gemini"
                    ? "bg-blue-500"
                    : source === "spoonacular"
                    ? "bg-green-500"
                    : "bg-gray-500"
                }`}>
                {source === "gemini"
                  ? "Gemini AI"
                  : source === "spoonacular"
                  ? "Spoonacular"
                  : source}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "recipe"
                ? "border-b-2 border-[#FFCF50] text-[#23486A]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("recipe")}>
            Recipe
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "videos"
                ? "border-b-2 border-[#FFCF50] text-[#23486A]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("videos")}
            disabled={
              !recipe.youtubeVideos || recipe.youtubeVideos.length === 0
            }>
            Videos
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "nutrition"
                ? "border-b-2 border-[#FFCF50] text-[#23486A]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("nutrition")}>
            Nutrition
          </button>
        </div>

        {/* Recipe Tab Content */}
        {activeTab === "recipe" && (
          <div className="p-6">
            {/* Recipe Image */}
            <div className="relative w-full h-64 mb-6">
              <img
                src={recipe.image || "/placeholder.svg"}
                alt={recipe.name}
                className="w-full h-full object-cover rounded-lg"
              />

              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  onClick={handleToggleFavorite}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100">
                  {isFavorite(
                    recipe._id || recipe.sourceId || `ai-${recipe.name}`
                  ) ? (
                    <HeartIconSolid className="w-5 h-5 text-red-500" />
                  ) : (
                    <HeartIcon className="w-5 h-5 text-gray-600 hover:text-red-500" />
                  )}
                </button>

                <button
                  onClick={handleSave}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100">
                  <ArrowDownTrayIcon className="w-5 h-5 text-gray-600 hover:text-blue-500" />
                </button>
              </div>
            </div>

            {/* Recipe Info Boxes */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="bg-gray-100 px-4 py-2 rounded-md">
                <span className="block text-sm text-gray-500">Prep Time</span>
                <span className="font-semibold">
                  {recipe.prepTime || 0} min
                </span>
              </div>

              <div className="bg-gray-100 px-4 py-2 rounded-md">
                <span className="block text-sm text-gray-500">Cook Time</span>
                <span className="font-semibold">
                  {recipe.cookTime || 0} min
                </span>
              </div>

              <div className="bg-gray-100 px-4 py-2 rounded-md">
                <span className="block text-sm text-gray-500">Servings</span>
                <span className="font-semibold">{recipe.servings || 4}</span>
              </div>

              <div className="bg-gray-100 px-4 py-2 rounded-md">
                <span className="block text-sm text-gray-500">Total Time</span>
                <span className="font-semibold">
                  {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                </span>
              </div>
            </div>

            {/* Ingredients and Instructions in Two Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ingredients Column */}
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">
                  Ingredients
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {Array.isArray(recipe.ingredients) ? (
                    recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-gray-700">
                        {typeof ingredient === "object"
                          ? ingredient.name
                          : ingredient}
                      </li>
                    ))
                  ) : (
                    <li>No ingredients available</li>
                  )}
                </ul>
              </div>

              {/* Instructions Column */}
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">
                  Instructions
                </h3>
                <div className="text-gray-700">
                  {recipe.instructions ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: recipe.instructions.replace(/\n/g, "<br/>"),
                      }}
                    />
                  ) : (
                    <p>No instructions available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Videos Tab Content */}
        {activeTab === "videos" && (
          <div className="p-6">
            {recipe.youtubeVideos && recipe.youtubeVideos.length > 0 ? (
              <div>
                {/* Video Player - With fallback */}
                <div className="w-full aspect-video mb-4">
                  {!showFallbackUI ? (
                    <iframe
                      ref={iframeRef}
                      src={`https://www.youtube.com/embed/${getCleanVideoId(
                        selectedVideo?.videoId
                      )}`}
                      title={selectedVideo?.title || "Recipe Video"}
                      width="560"
                      height="315"
                      className="w-full h-full rounded-md border border-black"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      onError={handleVideoError}
                    />
                  ) : (
                    <YouTubePlayerFallback
                      videoId={selectedVideo?.videoId}
                      title={selectedVideo?.title || recipe.name}
                      thumbnailUrl={
                        selectedVideo?.thumbnail || "/placeholder.svg"
                      }
                    />
                  )}
                </div>

                {/* Video Controls */}
                <div className="flex justify-between items-center mb-4">
                  <a
                    href={`https://www.youtube.com/watch?v=${selectedVideo?.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm">
                    Open in YouTube
                  </a>

                  {videoError ? (
                    <div className="text-sm text-red-500">
                      {typeof videoError === "object" && videoError.message
                        ? videoError.message
                        : "YouTube embedding restricted. Please open in YouTube."}
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      {!showFallbackUI && (
                        <button
                          onClick={() => setShowFallbackUI(true)}
                          className="bg-gray-200 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-300 text-sm">
                          Show Thumbnail
                        </button>
                      )}
                      {showFallbackUI && (
                        <button
                          onClick={tryPlayEmbedded}
                          className="bg-gray-200 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-300 text-sm">
                          Try Embedded Video
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Video Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {recipe.youtubeVideos.map((video) => (
                    <div
                      key={video.videoId}
                      className={`cursor-pointer rounded-md overflow-hidden border-2 ${
                        selectedVideo?.videoId === video.videoId
                          ? "border-[#FFCF50]"
                          : "border-transparent"
                      }`}
                      onClick={() => setSelectedVideo(video)}>
                      <div className="relative">
                        <img
                          src={video.thumbnail || "/placeholder.svg"}
                          alt={video.title}
                          className="w-full aspect-video object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors">
                          <PlayIcon className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-sm font-medium line-clamp-2">
                          {video.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {video.channelTitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No videos available for this recipe
                </p>
              </div>
            )}
          </div>
        )}

        {/* Nutrition Tab Content */}
        {activeTab === "nutrition" && (
          <div className="p-6">
            <h3 className="font-semibold text-lg text-gray-800 mb-4">
              Nutrition Facts
            </h3>

            {recipe.nutritionFacts ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="border-b border-gray-300 pb-2 mb-2">
                  <p className="text-lg font-bold">Per Serving</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Calories</span>
                    <span>{recipe.nutritionFacts.calories || 0} kcal</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Protein</span>
                    <span>{recipe.nutritionFacts.protein || 0}g</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Carbohydrates</span>
                    <span>{recipe.nutritionFacts.carbs || 0}g</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Fats</span>
                    <span>{recipe.nutritionFacts.fats || 0}g</span>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  <p>
                    * Percent Daily Values are based on a 2,000 calorie diet.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">
                No nutrition information available for this recipe
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedRecipeModal;
