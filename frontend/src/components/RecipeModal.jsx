import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon, HeartIcon, PlayIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { getRecipeVideo } from "../services/recipeService";
import { showToast } from "../utils/toast";
import YouTubePlayer from "./YouTubePlayer";
import {
  extractYouTubeVideoId,
  getYouTubeWatchUrl,
} from "../utils/youtubeHelpers";

/**
 * Common RecipeModal component that can be used throughout the app
 * for displaying recipe details with video playback
 *
 * @deprecated This component is being replaced by UnifiedRecipeModal.
 * Please use UnifiedRecipeModal instead for all new code.
 */
const RecipeModal = ({
  recipe,
  isOpen,
  onClose,
  onToggleFavorite = () => {}, // Default no-op function
}) => {
  // Log deprecation warning in development environment
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "RecipeModal is deprecated. Please use UnifiedRecipeModal instead."
      );
    }
  }, []);

  const [recipeWithVideo, setRecipeWithVideo] = useState(recipe);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true); // Default to thumbnail for better user experience
  const [videoError, setVideoError] = useState(false);
  const iframeRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const { isFavorite } = useFavorites();

  // Fetch YouTube video for the recipe if it doesn't have one
  useEffect(() => {
    if (!recipe) return;

    setRecipeWithVideo(recipe);
    setVideoError(false);

    if (!recipe.youtube && recipe.name && recipe.name.length > 3) {
      const fetchVideo = async () => {
        setIsLoadingVideo(true);
        try {
          const response = await getRecipeVideo(recipe.name);
          if (response.success) {
            setRecipeWithVideo({
              ...recipe,
              youtube: {
                videoId: response.videoId,
                thumbnail: response.thumbnail,
                title: response.title,
                url: response.url,
              },
            });
          } else {
            console.log("Error fetching video:", response.message);
            // Check for API limits in error message
            if (
              response.message?.includes("quota") ||
              response.message?.includes("limit")
            ) {
              setVideoError({
                message: "Video previews unavailable due to API limits",
              });
              window.__skipYouTubeVideoFetch = true; // Set global flag to prevent future requests
            } else {
              setVideoError(true);
            }
          }
        } catch (error) {
          console.error("Error fetching recipe video:", error);
          // Check for quota errors in the response
          if (
            error?.response?.data?.message?.includes("quota") ||
            error?.message?.includes("quota") ||
            error?.message?.includes("API limit")
          ) {
            setVideoError({
              message: "Video previews unavailable due to API limits",
            });
            window.__skipYouTubeVideoFetch = true; // Set global flag to prevent future requests
          } else {
            setVideoError(true);
          }
        } finally {
          setIsLoadingVideo(false);
        }
      };

      fetchVideo();
    }
  }, [recipe]);

  // Function to handle iframe load errors
  const handleIframeError = (errorInfo) => {
    console.error("YouTube iframe failed to load", errorInfo);

    // If we've already displayed an error, don't show it again
    if (videoError) return;

    setVideoError(errorInfo);
    setShowThumbnail(true);
  };

  // Extract video ID from various YouTube URL formats
  const getCleanVideoId = (id) => {
    return extractYouTubeVideoId(id) || "";
  };

  // Attempt to detect if the iframe has loaded properly
  useEffect(() => {
    if (!showThumbnail && iframeRef.current) {
      // Add a timeout to check if the video loaded
      const timeoutId = setTimeout(() => {
        try {
          // If we can't access the contentWindow, it might be blocked
          if (!iframeRef.current.contentWindow) {
            handleIframeError();
          }
        } catch (error) {
          // Any error here likely means the iframe is blocked
          handleIframeError();
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [showThumbnail]);

  if (!isOpen || !recipeWithVideo) return null;

  const openYouTubeVideo = (e) => {
    e.preventDefault();
    if (recipeWithVideo?.youtube?.videoId) {
      const videoId = getCleanVideoId(recipeWithVideo.youtube.videoId);
      window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
    }
  };

  const tryPlayEmbedded = () => {
    setShowThumbnail(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Recipe Title & Close Button Header */}
        <div className="flex justify-between items-center p-4 bg-[#23486A] text-white">
          <h2 className="text-xl font-bold">{recipeWithVideo.name}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Recipe Video Section */}
        {recipeWithVideo.youtube && recipeWithVideo.youtube.videoId ? (
          <div className="w-full px-4 py-4 bg-gray-50">
            <div className="w-full h-[280px]">
              {!showThumbnail ? (
                <YouTubePlayer
                  videoId={getCleanVideoId(recipeWithVideo.youtube.videoId)}
                  width="100%"
                  height="280px"
                  className="rounded-md border border-black"
                  showFallbackOnError={true}
                  onError={handleIframeError}
                />
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={`https://img.youtube.com/vi/${getCleanVideoId(
                      recipeWithVideo.youtube.videoId
                    )}/hqdefault.jpg`}
                    alt={recipeWithVideo.youtube.title || recipeWithVideo.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center text-white p-4">
                    <p className="mb-3 text-center">
                      {videoError?.message || "Video preview unavailable"}
                    </p>
                    <div className="flex space-x-3">
                      <a
                        href={getYouTubeWatchUrl(
                          getCleanVideoId(recipeWithVideo.youtube.videoId)
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition-colors">
                        Watch on YouTube
                      </a>
                      <button
                        onClick={tryPlayEmbedded}
                        className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded-md transition-colors">
                        Try Embedded
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-between items-center">
              <a
                href={getYouTubeWatchUrl(
                  getCleanVideoId(recipeWithVideo.youtube.videoId)
                )}
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
                  {!showThumbnail && (
                    <button
                      onClick={() => setShowThumbnail(true)}
                      className="bg-gray-200 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-300 text-sm">
                      Show Thumbnail
                    </button>
                  )}
                  {showThumbnail && (
                    <button
                      onClick={tryPlayEmbedded}
                      className="bg-gray-200 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-300 text-sm">
                      Try Embedded Video
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative w-full h-64">
            <img
              src={recipeWithVideo.image}
              alt={recipeWithVideo.name}
              className="w-full h-full object-cover"
            />
            {/* Favorite Button */}
            {isAuthenticated && (
              <button
                onClick={(e) => onToggleFavorite(e, recipeWithVideo)}
                className="absolute top-4 left-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100">
                {isFavorite(recipeWithVideo._id || recipeWithVideo.sourceId) ? (
                  <HeartIconSolid className="w-5 h-5 text-red-500" />
                ) : (
                  <HeartIcon className="w-5 h-5 text-gray-600 hover:text-red-500" />
                )}
              </button>
            )}
          </div>
        )}

        <div className="p-6">
          {/* Recipe Info Boxes */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 flex-1">
              <h3 className="text-sm text-gray-500 mb-1">Time</h3>
              <p className="font-medium">
                {recipeWithVideo.totalTime || "Not specified"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 flex-1">
              <h3 className="text-sm text-gray-500 mb-1">Cuisine</h3>
              <p className="font-medium">
                {recipeWithVideo.cuisine || "Not specified"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 flex-1">
              <h3 className="text-sm text-gray-500 mb-1">Category</h3>
              <p className="font-medium">
                {recipeWithVideo.category || "Not specified"}
              </p>
            </div>
          </div>

          {/* Favorite Button below info boxes */}
          {isAuthenticated && (
            <div className="mb-6">
              <button
                onClick={(e) => onToggleFavorite(e, recipeWithVideo)}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">
                {isFavorite(recipeWithVideo._id || recipeWithVideo.sourceId) ? (
                  <>
                    <HeartIconSolid className="w-5 h-5 text-red-500" />
                    <span>Favorited</span>
                  </>
                ) : (
                  <>
                    <HeartIcon className="w-5 h-5" />
                    <span>Add to Favorites</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Recipe Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Ingredients Column */}
            <div>
              <h3 className="font-semibold text-lg text-gray-800 mb-2">
                Ingredients
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                {Array.isArray(recipeWithVideo.ingredients) ? (
                  recipeWithVideo.ingredients.map((ingredient, index) => (
                    <li key={index} className="text-gray-700">
                      {typeof ingredient === "object"
                        ? ingredient?.name
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
                {recipeWithVideo.instructions ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: recipeWithVideo.instructions.replace(
                        /\n/g,
                        "<br/>"
                      ),
                    }}
                  />
                ) : (
                  <p>No instructions available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;
