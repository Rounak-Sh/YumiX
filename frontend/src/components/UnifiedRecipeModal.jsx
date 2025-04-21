import { useState, useRef, useEffect } from "react";
import {
  XMarkIcon,
  HeartIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import { getRecipeVideo, addToHistory } from "../services/recipeService";
import YouTubePlayer from "./YouTubePlayer";
import {
  extractYouTubeVideoId,
  getYouTubeWatchUrl,
} from "../utils/youtubeHelpers";
import { extractRecipeId } from "../utils/recipeUtils";
import { youtubeIcon } from "../assets/assets";

/**
 * Unified Recipe Modal component that handles both regular and AI-generated recipes
 * Combines features from RecipeModal and EnhancedRecipeModal
 */
const UnifiedRecipeModal = ({
  recipe,
  isOpen,
  onClose,
  onToggleFavorite = () => {}, // Default no-op function
  onSave, // Optional callback for AI-generated recipes
  source, // Optional source indicator for AI-generated recipes
}) => {
  // Derive whether this is an AI-generated recipe
  const isAiGenerated = Boolean(source) || recipe?.source === "ai";

  // State management
  const [activeTab, setActiveTab] = useState("recipe");
  const [recipeWithVideo, setRecipeWithVideo] = useState(recipe);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [showTextOnly, setShowTextOnly] = useState(false); // New state for text-only view

  // Handle multiple videos for AI-generated recipes
  const [selectedVideo, setSelectedVideo] = useState(
    recipe?.youtubeVideos?.[0] || null
  );

  // Refs for managing video components
  const iframeRef = useRef(null);
  const historyTrackedRef = useRef(false);
  const nutritionSectionRef = useRef(null);

  // Context hooks
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Extract video ID from various YouTube URL formats
  const getCleanVideoId = (id) => {
    if (!id) return "";
    return extractYouTubeVideoId(id) || id;
  };

  // Handle favorite toggling
  const handleToggleFavorite = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isAuthenticated) {
      showToast("Please log in to save favorites", "info");
      return;
    }

    // Add debug information about the recipe
    console.log("Toggle favorite for recipe:", {
      name: recipe?.name,
      id: recipe?._id,
      source: recipe?.source || recipe?.sourceType,
      isAiGenerated,
      currentlyFavorite: isFavorite(recipe),
    });

    // Special handling for AI-generated recipes
    if (isAiGenerated) {
      // Ensure the AI recipe has essential properties before adding to favorites
      const enhancedRecipe = {
        ...recipe,
        source: "ai",
        sourceType: "ai",
        // Add any missing required fields
        prepTime: recipe.prepTime || 30,
        servings: recipe.servings || 4,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || "No instructions provided",
      };

      // Pass the enhanced recipe to the toggle function
      onToggleFavorite(enhancedRecipe);
      console.log("Enhanced AI recipe for favorites:", enhancedRecipe);
    } else {
      // For regular recipes, just pass as-is
      onToggleFavorite(recipe);
    }
  };

  // Fetch YouTube video for regular recipes that don't have one
  useEffect(() => {
    if (!recipe) return;

    // Set recipe data
    setRecipeWithVideo(recipe);
    setVideoError(false);

    // Reset history tracking flag when recipe changes
    historyTrackedRef.current = false;

    // For AI-generated recipes with videos, select the first one
    if (recipe.youtubeVideos?.length > 0) {
      setSelectedVideo(recipe.youtubeVideos[0]);
    }

    // Track AI recipe view in history
    if (isAiGenerated && isAuthenticated && !historyTrackedRef.current) {
      try {
        const recipeId = recipe._id || `ai-${Date.now()}`;
        console.log(`Tracking AI recipe view in history: ${recipeId}`);

        // Prepare tracking data for AI recipe
        const historyData = {
          sourceType: "ai",
          source: "ai",
          name: recipe.name,
          recipeName: recipe.name,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          image: recipe.image,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          nutritionFacts: recipe.nutritionFacts,
          fromSearch: true, // Mark as coming from search to count in analytics
        };

        // Trigger history tracking with complete recipe data
        addToHistory(recipeId, historyData)
          .then(() => {
            historyTrackedRef.current = true;
            console.log("AI recipe view tracked successfully");
          })
          .catch((err) =>
            console.error("Failed to track AI recipe view:", err)
          );
      } catch (err) {
        console.error("Error preparing AI recipe history tracking:", err);
      }
    }

    // For regular recipes without video, fetch from YouTube
    if (!recipe?.youtube && !recipe?.youtubeVideos && !isAiGenerated) {
      const fetchVideo = async () => {
        setIsLoadingVideo(true);
        try {
          // Skip very short recipe names or just numbers to prevent bad queries
          if (
            !recipe?.name ||
            recipe?.name.length < 3 ||
            /^\d+$/.test(recipe?.name)
          ) {
            console.log(
              "Skipping video fetch for invalid recipe name:",
              recipe?.name
            );
            setVideoError({
              message: "Recipe name too short for valid video search",
              type: "invalid-name",
            });
            setIsLoadingVideo(false);
            return;
          }

          // Use the same API endpoint as the admin implementation
          const videoResponse = await getRecipeVideo(recipe?.name || "");
          if (videoResponse.success) {
            const videoData = {
              videoId: videoResponse.videoId,
              thumbnail: videoResponse.thumbnail,
              title: videoResponse.title,
              url: videoResponse.url,
            };
            console.log("Retrieved video data:", videoData);

            setRecipeWithVideo((prev) => ({
              ...prev,
              youtube: videoData,
            }));
            setVideoError(false);
          } else {
            // Set an informative error message that will be displayed to users
            if (
              videoResponse.message?.includes("quota") ||
              videoResponse.message?.includes("limit")
            ) {
              setVideoError({
                message: "Video previews unavailable due to API limits",
                type: "quota",
              });

              // If this was a quota error, set a flag to prevent future requests in this session
              console.log(
                "YouTube API quota exceeded - disabling for this session"
              );
              window.__skipYouTubeVideoFetch = true;
            } else {
              setVideoError({
                message: "Unable to load video for this recipe",
                type: "general",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching recipe video:", error);

          // Check for quota errors in the response message
          if (
            error?.response?.data?.message?.includes("quota") ||
            error?.message?.includes("quota") ||
            error?.message?.includes("API limit")
          ) {
            console.log(
              "YouTube API quota exceeded - disabling for this session"
            );
            window.__skipYouTubeVideoFetch = true;
            setVideoError({
              message: "Video previews unavailable due to API limits",
              type: "quota",
            });
          } else {
            setVideoError({
              message: "Failed to load video preview",
              type: "error",
            });
          }
        } finally {
          setIsLoadingVideo(false);
        }
      };

      // Skip video fetch if previously failed with server error
      if (!window.__skipVideoFetch) {
        fetchVideo();
      } else {
        console.log("Skipping video fetch due to previous server errors");
        setVideoError({
          message: "Video loading disabled due to server errors",
          type: "server-error",
        });
        setIsLoadingVideo(false);
      }
    }
  }, [recipe, isAiGenerated]);

  // Reset video error state when selected video changes (for AI recipes)
  useEffect(() => {
    if (selectedVideo) {
      setVideoError(false);
    }
  }, [selectedVideo]);

  // Add recipe to history when modal is opened
  useEffect(() => {
    // CRITICAL: Add more robust checking for skip conditions
    // Skip tracking in any of these cases:
    // 1. Modal isn't open
    // 2. Recipe doesn't exist
    // 3. Already tracked this specific recipe in this component instance
    // 4. User isn't authenticated
    // 5. Global skipHistoryTracking flag is set
    // 6. Recipe was recently tracked (managed by addToHistory)
    if (
      !isOpen ||
      !recipe ||
      historyTrackedRef.current ||
      !isAuthenticated ||
      window.skipHistoryTracking === true
    ) {
      if (window.skipHistoryTracking) {
        console.log(
          "RecipeModal: Skipping history tracking due to global flag"
        );
      }
      return;
    }

    // Get the appropriate ID to use for tracking
    // For AI recipes, prioritize the sourceId if it follows the ai- pattern
    // For Spoonacular recipes, use numeric ID
    let recipeId;

    // Handle AI recipes
    if (source === "ai" || recipe.source === "ai") {
      // If it already has an ai- prefixed sourceId, use that
      if (recipe.sourceId && recipe.sourceId.toString().startsWith("ai-")) {
        recipeId = recipe.sourceId;
      }
      // Otherwise create an ID based on the regular ID if available
      else if (recipe._id || recipe.id) {
        recipeId = recipe._id || recipe.id;
      }
      // If all else fails, create a unique AI ID
      else {
        const timestamp = Date.now();
        const nameSegment = recipe.name
          ? recipe.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "")
          : "generated-recipe";
        recipeId = `ai-${timestamp}-${nameSegment}`;
      }
    }
    // For non-AI recipes
    else {
      recipeId = recipe._id || recipe.id || recipe.sourceId;
    }

    if (!recipeId) {
      console.log("RecipeModal: No valid ID found for history tracking");
      return;
    }

    // Set tracked flag to prevent duplicate calls during renders
    historyTrackedRef.current = true;

    // Add a short delay for AI recipes to prevent issues during navigation
    const delay = source === "ai" || recipe.source === "ai" ? 500 : 0;

    // Flag to avoid multiple attempts
    let attemptMade = false;

    setTimeout(async () => {
      if (attemptMade) return;
      attemptMade = true;

      // Enhanced history data preparation for AI recipes
      let historyData = {
        sourceType: source || recipe.sourceType || recipe.source || "unknown",
        name: recipe.name || recipe.title,
        image: recipe.image || null,
        prepTime: recipe.prepTime || recipe.readyInMinutes || 30,
        servings: recipe.servings || 4,
      };

      // For AI-generated recipes, ensure we capture all relevant data
      if (source === "ai" || recipe.source === "ai") {
        historyData = {
          ...historyData,
          sourceType: "ai",
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || recipe.steps || "",
          tips: recipe.tips || [],
          recipeName: recipe.name || recipe.title || "AI Generated Recipe",
          // Include any other fields that might be useful
          cuisine: recipe.cuisine,
          dietType: recipe.dietType,
          difficulty: recipe.difficulty,
          // Store the AI generation info if available
          generationPrompt: recipe.generationPrompt,
          generationSource: recipe.generationSource || source,
          // Include the Spoonacular ID if this recipe has one
          spoonacularId:
            typeof recipe.sourceId === "number" ? recipe.sourceId : null,
        };
      }

      console.log(`Adding recipe ${recipeId} to history`);

      try {
        await addToHistory(recipeId, historyData);
      } catch (error) {
        // Only log the error but don't display to user since this is background functionality
        console.error("Error adding to history:", error);

        // Log different types of errors for debugging
        if (error.isAuthError) {
          console.log("Auth error in history tracking - user not logged in");
        } else if (error.isServerError) {
          console.error("Server error in history tracking");
        }
      }
    }, delay);
  }, [isOpen, recipe, source, isAuthenticated]);

  // Clean up the old unused iframe load tracking
  // Remove these useEffects that are no longer needed with direct embedding

  useEffect(() => {
    // Add YouTube API if it's not already there
    if (!window.YT) {
      // Create YouTube API script
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";

      // Get the first script tag as a reference node
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // Set up the callback
      window.onYouTubeIframeAPIReady = function () {
        console.log("YouTube API is ready");
        window.__youtubeApiReady = true;
      };
    }

    return () => {
      // Clean up if needed
    };
  }, []);

  if (!isOpen || !recipe) return null;

  // Get video ID from various sources
  const getVideoId = () => {
    if (isAiGenerated && selectedVideo?.videoId) {
      const id = getCleanVideoId(selectedVideo.videoId);
      return id;
    }

    if (recipeWithVideo?.youtube?.videoId) {
      const id = getCleanVideoId(recipeWithVideo.youtube.videoId);
      return id;
    }

    return "";
  };

  // Get video thumbnail URL
  const getVideoThumbnail = () => {
    if (isAiGenerated && selectedVideo?.thumbnail) {
      return selectedVideo.thumbnail;
    }

    if (recipeWithVideo?.youtube?.thumbnail) {
      return recipeWithVideo.youtube.thumbnail;
    }

    // If we have a video ID but no thumbnail, use YouTube's thumbnail
    const videoId = getVideoId();
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    return "";
  };

  // Open video in YouTube directly
  const openInYouTube = (videoId) => {
    const cleanId = getCleanVideoId(videoId);
    if (cleanId) {
      window.open(`https://www.youtube.com/watch?v=${cleanId}`, "_blank");
    }
  };

  // Handle save for AI-generated recipes
  const handleSave = () => {
    if (onSave) onSave();
  };

  // Check if recipe has nutrition facts
  const hasNutritionFacts = Boolean(
    recipe?.nutritionFacts || recipeWithVideo?.nutritionFacts
  );

  // Check if recipe has video content
  const hasVideoContent = Boolean(
    getVideoId() ||
      recipe?.youtubeVideos?.length > 0 ||
      recipeWithVideo?.youtube
  );

  // Function to handle tab changes with scrolling if needed
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);

    // Reset text-only view when switching tabs
    if (showTextOnly && tabName !== "recipe") {
      setShowTextOnly(false);
    }

    // If nutrition tab is selected, scroll to nutrition section after a short delay
    if (tabName === "nutrition") {
      setTimeout(() => {
        if (nutritionSectionRef.current) {
          nutritionSectionRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    }
  };

  // Toggle text-only view
  const toggleTextOnly = () => {
    setShowTextOnly(!showTextOnly);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4 overflow-y-auto">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden mt-14">
        {/* Header with recipe name and close button */}
        <div className="flex justify-between items-center p-3 bg-[#23486A] text-white sticky top-0 z-10">
          <div className="flex items-center">
            <h2 className="text-lg font-bold">{recipe?.name}</h2>
            {source && (
              <span
                className={`ml-3 px-2 py-0.5 text-xs font-medium rounded-full ${
                  source === "gemini"
                    ? "bg-blue-500"
                    : source === "spoonacular"
                    ? "bg-green-500"
                    : source === "cache"
                    ? "bg-yellow-500"
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
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col h-[calc(85vh-48px)]">
          {/* Non-scrollable top section (image, video, tabs) */}
          <div className="flex-none p-4 pb-0">
            {/* Recipe Image or Video based on whether video is available - Only show if not in text-only mode */}
            {!showTextOnly && (
              <div className="relative w-full h-48 mb-4">
                {hasVideoContent ? (
                  /* Video Player */
                  <div className="relative w-full h-48 mb-0 rounded-lg overflow-hidden">
                    <img
                      src={
                        getVideoThumbnail() ||
                        `https://img.youtube.com/vi/${getVideoId()}/hqdefault.jpg`
                      }
                      alt={recipe?.name || "Recipe video"}
                      className="w-full h-full object-cover rounded-lg"
                    />

                    {/* YouTube icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <a
                        href={`https://www.youtube.com/watch?v=${getVideoId()}`}
                        target="_blank"
                        rel="noopener noreferrer">
                        <img
                          src={youtubeIcon}
                          alt="Watch on YouTube"
                          className="w-16 h-16 rounded"
                        />
                      </a>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <button
                        onClick={handleToggleFavorite}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100">
                        {isFavorite(recipe) ? (
                          <HeartIconSolid className="w-4 h-4 text-red-500" />
                        ) : (
                          <HeartIcon className="w-4 h-4 text-gray-600 hover:text-red-500" />
                        )}
                      </button>

                      {isAiGenerated && onSave && (
                        <button
                          onClick={handleSave}
                          className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100">
                          <BookmarkIcon className="w-4 h-4 text-gray-600 hover:text-blue-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Recipe Image with Favorite Button */
                  <>
                    <img
                      src={recipe?.image || "/placeholder.svg"}
                      alt={recipe?.name || "Recipe"}
                      className="w-full h-full object-cover rounded-lg"
                    />

                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <button
                        onClick={handleToggleFavorite}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100">
                        {isFavorite(recipe) ? (
                          <HeartIconSolid className="w-4 h-4 text-red-500" />
                        ) : (
                          <HeartIcon className="w-4 h-4 text-gray-600 hover:text-red-500" />
                        )}
                      </button>

                      {isAiGenerated && onSave && (
                        <button
                          onClick={handleSave}
                          className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100">
                          <BookmarkIcon className="w-4 h-4 text-gray-600 hover:text-blue-500" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tabs Navigation with Text Recipe toggle */}
            <div className="flex justify-between items-center border-b mb-4">
              <div className="flex">
                <button
                  className={`px-3 py-1.5 font-medium text-sm ${
                    activeTab === "recipe" && !showTextOnly
                      ? "border-b-2 border-[#FFCF50] text-[#23486A]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => {
                    handleTabChange("recipe");
                    setShowTextOnly(false);
                  }}>
                  Recipe
                </button>

                {hasNutritionFacts && (
                  <button
                    className={`px-3 py-1.5 font-medium text-sm ${
                      activeTab === "nutrition"
                        ? "border-b-2 border-[#FFCF50] text-[#23486A]"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => handleTabChange("nutrition")}>
                    Nutrition
                  </button>
                )}

                <button
                  className={`px-3 py-1.5 font-medium text-sm ${
                    showTextOnly
                      ? "border-b-2 border-[#FFCF50] text-[#23486A]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={toggleTextOnly}>
                  Text Recipe
                </button>
              </div>

              {/* Action Buttons for text-only view */}
              {showTextOnly && (
                <div className="flex items-center">
                  <button
                    onClick={handleToggleFavorite}
                    className="mr-2 flex items-center text-sm font-medium text-gray-600">
                    {isFavorite(recipe) ? (
                      <>
                        <HeartIconSolid className="w-4 h-4 text-red-500 mr-1" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <HeartIcon className="w-4 h-4 mr-1" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable content section */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
            {/* Recipe Info Boxes - Show for recipe tab and text-only mode */}
            {(activeTab === "recipe" || showTextOnly) && (
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="bg-gray-100 px-3 py-1.5 rounded-md">
                  <span className="block text-xs text-gray-500">Prep Time</span>
                  <span className="font-semibold text-sm">
                    {recipe?.prepTime ||
                      recipeWithVideo?.prepTime ||
                      recipeWithVideo?.readyInMinutes ||
                      0}{" "}
                    min
                  </span>
                </div>

                {recipe?.cookTime && (
                  <div className="bg-gray-100 px-3 py-1.5 rounded-md">
                    <span className="block text-xs text-gray-500">
                      Cook Time
                    </span>
                    <span className="font-semibold text-sm">
                      {recipe?.cookTime || 0} min
                    </span>
                  </div>
                )}

                <div className="bg-gray-100 px-3 py-1.5 rounded-md">
                  <span className="block text-xs text-gray-500">Servings</span>
                  <span className="font-semibold text-sm">
                    {recipe?.servings || recipeWithVideo?.servings || 4}
                  </span>
                </div>

                {recipe?.prepTime && recipe?.cookTime && (
                  <div className="bg-gray-100 px-3 py-1.5 rounded-md">
                    <span className="block text-xs text-gray-500">
                      Total Time
                    </span>
                    <span className="font-semibold text-sm">
                      {(recipe?.prepTime || 0) + (recipe?.cookTime || 0)} min
                    </span>
                  </div>
                )}

                {recipeWithVideo?.matchPercentage && (
                  <div className="bg-green-100 px-3 py-1.5 rounded-md">
                    <span className="block text-xs text-green-700">Match</span>
                    <span className="font-semibold text-sm">
                      {recipeWithVideo?.matchPercentage}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tab Content - Ingredients and Instructions (show for recipe tab and text-only mode) */}
            {(activeTab === "recipe" || showTextOnly) && (
              <div
                className={`${
                  showTextOnly ? "" : "grid grid-cols-1 md:grid-cols-2"
                } gap-4`}>
                {/* Ingredients Column */}
                <div>
                  <h3 className="font-semibold text-base text-gray-800 mb-2">
                    Ingredients
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {Array.isArray(
                      recipe?.ingredients || recipeWithVideo?.ingredients
                    ) ? (
                      (recipe?.ingredients || recipeWithVideo?.ingredients).map(
                        (ingredient, index) => (
                          <li key={index} className="text-gray-700 pb-0.5">
                            {typeof ingredient === "object"
                              ? ingredient?.name
                              : ingredient}
                          </li>
                        )
                      )
                    ) : (
                      <li>No ingredients available</li>
                    )}
                  </ul>
                </div>

                {/* Instructions Column */}
                <div className={showTextOnly ? "mt-6" : ""}>
                  <h3 className="font-semibold text-base text-gray-800 mb-2">
                    Instructions
                  </h3>
                  <div className="text-gray-700">
                    {recipe?.instructions || recipeWithVideo?.instructions ? (
                      <ol className="list-decimal pl-5 space-y-2 text-sm">
                        {parseInstructions(
                          recipe?.instructions ||
                            recipeWithVideo?.instructions ||
                            ""
                        ).map((instruction, index) => (
                          <li key={index} className="text-gray-700 pb-0.5 pl-1">
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm">No instructions available</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Nutrition Tab Content - Only show when nutrition tab is active */}
            {activeTab === "nutrition" && hasNutritionFacts && (
              <div className="mt-6" ref={nutritionSectionRef}>
                <h3 className="font-semibold text-base text-gray-800 mb-3">
                  Nutrition Facts
                </h3>

                {recipe?.nutritionFacts || recipeWithVideo?.nutritionFacts ? (
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    <div className="border-b border-gray-300 pb-2 mb-2">
                      <p className="text-base font-bold">Per Serving</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between border-b border-gray-200 pb-1">
                        <span className="font-medium">Calories</span>
                        <span>
                          {recipe?.nutritionFacts?.calories ||
                            recipeWithVideo?.nutritionFacts?.calories ||
                            0}{" "}
                          kcal
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-gray-200 pb-1">
                        <span className="font-medium">Protein</span>
                        <span>
                          {recipe?.nutritionFacts?.protein ||
                            recipeWithVideo?.nutritionFacts?.protein ||
                            0}
                          g
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-gray-200 pb-1">
                        <span className="font-medium">Carbohydrates</span>
                        <span>
                          {recipe?.nutritionFacts?.carbs ||
                            recipeWithVideo?.nutritionFacts?.carbs ||
                            0}
                          g
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-gray-200 pb-1">
                        <span className="font-medium">Fats</span>
                        <span>
                          {recipe?.nutritionFacts?.fats ||
                            recipeWithVideo?.nutritionFacts?.fats ||
                            0}
                          g
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      <p>
                        * Percent Daily Values are based on a 2,000 calorie
                        diet.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No nutrition information available for this recipe
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedRecipeModal;
function parseInstructions(instructions) {
  if (!instructions) return [];

  // Check if instructions is already an array
  if (Array.isArray(instructions)) {
    return instructions
      .map((item) =>
        typeof item === "string" ? item : item.step || item.text || ""
      )
      .filter(Boolean);
  }

  // Clean up instructions - strip HTML if present
  let cleanInstructions = instructions.replace(/<\/?[^>]+(>|$)/g, "");

  // Possible step separators in text instructions
  const stepSeparators = [
    /\d+\.\s/g, // "1. "
    /step\s+\d+:?/gi, // "Step 1:" or "STEP 1"
    /\n\s*\n/g, // Double line breaks
    /\.\s+(?=[A-Z])/g, // Period followed by capital letter (sentence break)
  ];

  // Try to split by numbered steps first
  if (/\d+\.\s/.test(cleanInstructions)) {
    const steps = cleanInstructions.split(/(?=\d+\.\s)/).filter(Boolean);
    if (steps.length > 1) {
      // Remove the numbering since we'll have it in the list
      return steps.map((step) => step.replace(/^\d+\.\s+/, "").trim());
    }
  }

  // Try to split by "Step X" pattern
  if (/step\s+\d+:?/i.test(cleanInstructions)) {
    const steps = cleanInstructions.split(/(?=step\s+\d+:?)/i).filter(Boolean);
    if (steps.length > 1) {
      // Remove the "Step X:" part
      return steps.map((step) => step.replace(/^step\s+\d+:?\s*/i, "").trim());
    }
  }

  // Split by double newlines if present
  if (cleanInstructions.includes("\n\n")) {
    return cleanInstructions
      .split("\n\n")
      .filter(Boolean)
      .map((step) => step.replace(/^\s*[-*]\s*/, "").trim());
  }

  // Split by single newlines as a fallback
  if (cleanInstructions.includes("\n")) {
    return cleanInstructions
      .split("\n")
      .filter(Boolean)
      .map((step) => step.replace(/^\s*[-*]\s*/, "").trim());
  }

  // If all else fails, try to split by sentences that might be steps
  const sentences = cleanInstructions.match(/[^.!?]+[.!?]+/g) || [
    cleanInstructions,
  ];
  if (sentences.length > 1) {
    return sentences.map((s) => s.trim()).filter((s) => s.length > 10); // Filter out very short sentences
  }

  // If we can't parse it into steps, return as a single step
  return [cleanInstructions];
}
