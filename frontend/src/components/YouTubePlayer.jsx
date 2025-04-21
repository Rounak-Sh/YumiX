import { useState, useEffect, useRef } from "react";
import {
  extractYouTubeVideoId,
  createYouTubeEmbedUrl,
  getYouTubeWatchUrl,
  handleYouTubeIframeError,
} from "../utils/youtubeHelpers";

/**
 * A reusable YouTube player component with error handling
 * and fallback display options
 */
const YouTubePlayer = ({
  videoUrl,
  videoId,
  width = "100%",
  height = "315px",
  className = "",
  autoplay = false,
  controls = true,
  showFallbackOnError = true,
  onError = null,
  onLoad = null,
}) => {
  const [error, setError] = useState(null);
  const [showThumbnail, setShowThumbnail] = useState(true); // Default to thumbnail view for safety
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef(null);

  // Track if mounting/unmounting
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Extract video ID from URL if not provided directly
  const actualVideoId = videoId || extractYouTubeVideoId(videoUrl);

  // Create embed URL with appropriate options
  const embedUrl = actualVideoId
    ? createYouTubeEmbedUrl(actualVideoId, {
        autoplay: autoplay ? 1 : 0,
        controls: controls ? 1 : 0,
      })
    : null;

  // Direct watch URL for fallback
  const watchUrl = actualVideoId ? getYouTubeWatchUrl(actualVideoId) : null;

  // Thumbnail URL for fallback display
  const thumbnailUrl = actualVideoId
    ? `https://img.youtube.com/vi/${actualVideoId}/hqdefault.jpg`
    : null;

  // Handle iframe load events
  const handleIframeLoad = () => {
    if (!isMounted.current) return;

    setIsLoading(false);
    // Only switch to iframe view if no errors occurred during load
    if (!error) {
      setShowThumbnail(false);
    }

    if (onLoad) onLoad();
  };

  // Handle iframe errors
  const handleError = (e) => {
    if (!isMounted.current) return;

    console.log("YouTube player error detected:", e);
    const errorInfo = handleYouTubeIframeError(e, embedUrl);
    setError(errorInfo);
    setShowThumbnail(true);
    setIsLoading(false);

    if (onError) onError(errorInfo);
  };

  // Set up error handling
  useEffect(() => {
    // Check if global flag is set
    if (window.__skipYouTubeVideoFetch) {
      handleError({
        message: "YouTube API quota exceeded",
        type: "quota",
      });
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleIframeError = (e) => handleError(e);
    iframe.addEventListener("error", handleIframeError);

    // Attempt to detect blocked content errors
    try {
      // Test if we can access the contentWindow
      // This will throw an error if blocked by CSP
      const test = iframe.contentWindow?.location?.href;
    } catch (e) {
      console.log("Error accessing iframe content window:", e);
      // Don't trigger error handling immediately, as this can sometimes
      // happen even for successful embeds
    }

    // Set a timeout to check if video loaded properly - longer timeout for slow connections
    const timeoutId = setTimeout(() => {
      if (isLoading && isMounted.current) {
        console.log("Video load timeout triggered");
        handleError({
          message:
            "Video loading timed out. You can try watching directly on YouTube.",
          type: "timeout",
        });
      }
    }, 8000); // Extended timeout to 8 seconds

    return () => {
      iframe.removeEventListener("error", handleIframeError);
      clearTimeout(timeoutId);
    };
  }, [embedUrl]);

  // Reset error state when video changes
  useEffect(() => {
    setError(null);
    setShowThumbnail(true); // Always start with thumbnail for safety
    setIsLoading(true);
  }, [videoUrl, videoId]);

  // If no video ID could be extracted
  if (!actualVideoId) {
    return <div className="text-center p-4">Invalid YouTube URL or ID</div>;
  }

  // Show thumbnail fallback if there's an error and fallback is enabled
  if ((showThumbnail || error) && showFallbackOnError) {
    return (
      <div
        className={`youtube-player-fallback ${className}`}
        style={{ width, position: "relative" }}>
        <img
          src={thumbnailUrl || "/placeholder.svg"}
          alt="Video thumbnail"
          style={{ width: "100%", height, objectFit: "cover" }}
          className="rounded"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white p-4 rounded">
          {error ? (
            <>
              <p className="mb-2 text-center text-sm">{error.message}</p>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    setError(null);
                    setShowThumbnail(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-all text-sm">
                  Try Embedded Player Again
                </button>
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-all text-sm text-center">
                  Watch on YouTube
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-white/20 rounded-full mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-sm">Click to play video</p>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => setShowThumbnail(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-all text-sm">
                  Play Embedded Video
                </button>
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-all text-sm text-center">
                  Watch on YouTube
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Show the iframe
  return (
    <div
      className={`youtube-player ${className}`}
      style={{ width, height: "100%" }}>
      {isLoading && (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        src={`https://www.youtube-nocookie.com/embed/${actualVideoId}?enablejsapi=1`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={handleIframeLoad}
        className={`rounded ${
          isLoading || showThumbnail ? "hidden" : "block"
        } h-full w-full`}
        loading="lazy"></iframe>
    </div>
  );
};

export default YouTubePlayer;
