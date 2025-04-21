/**
 * YouTube Helpers
 * Utility functions for working with YouTube videos and embeds
 */

/**
 * Extract YouTube video ID from different URL formats
 * @param {string} url - The YouTube URL
 * @returns {string|null} - The extracted video ID or null
 */
export const extractYouTubeVideoId = (url) => {
  console.log("Attempting to extract video ID from:", url);

  if (!url) {
    console.log("URL is empty or undefined");
    return null;
  }

  // If url is already just an ID (11 characters), return it directly
  if (typeof url === "string" && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
    console.log("URL appears to be an ID already:", url);
    return url;
  }

  // Make sure we're working with a string
  if (typeof url !== "string") {
    try {
      url = String(url);
      console.log("Converted non-string to:", url);
    } catch (e) {
      console.error("Failed to convert to string:", e);
      return null;
    }
  }

  let videoId = null;

  // Handle standard youtube.com URLs
  const standardRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
  const standardMatch = url.match(standardRegex);

  // Handle youtube-nocookie.com URLs
  const noCookieRegex =
    /(?:youtube-nocookie\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?/\s]{11})/i;
  const noCookieMatch = url.match(noCookieRegex);

  if (standardMatch && standardMatch[1]) {
    videoId = standardMatch[1];
    console.log("Matched standard YouTube URL. Extracted ID:", videoId);
  } else if (noCookieMatch && noCookieMatch[1]) {
    videoId = noCookieMatch[1];
    console.log("Matched YouTube-nocookie URL. Extracted ID:", videoId);
  } else {
    console.log("No match found in URL patterns");
  }

  return videoId;
};

/**
 * Create a YouTube embed URL with proper parameters
 * @param {string} videoId - The YouTube video ID
 * @param {Object} options - Configuration options
 * @returns {string} - The formatted embed URL
 */
export const createYouTubeEmbedUrl = (videoId, options = {}) => {
  if (!videoId) return null;

  // Use youtube-nocookie.com for better privacy and compatibility
  const baseUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  // Add essential parameters for better embedding
  const params = new URLSearchParams({
    enablejsapi: "1", // Enable iframe API
    origin: window.location.origin, // Set origin for postMessage security
    rel: "0", // Don't show related videos
    modestbranding: "1", // Reduce YouTube branding
    iv_load_policy: "3", // Hide video annotations
  });

  // Add user-provided options
  if (options.autoplay) params.set("autoplay", options.autoplay);
  if (options.controls !== undefined) params.set("controls", options.controls);

  console.log(`Created YouTube embed URL: ${baseUrl}?${params.toString()}`);
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Get direct YouTube watch URL
 * @param {string} videoId - The YouTube video ID
 * @returns {string} - The YouTube watch URL
 */
export const getYouTubeWatchUrl = (videoId) => {
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
};

/**
 * Check if YouTube embed API is ready
 * @returns {boolean} - Whether the API is ready
 */
export const isYouTubeApiReady = () => {
  return window.__youtubeApiReady === true;
};

/**
 * Handle YouTube iframe errors
 * @param {Event} e - Error event
 * @param {string} iframeSrc - Source URL of the iframe
 * @returns {Object} - Error information
 */
export const handleYouTubeIframeError = (e, iframeSrc) => {
  console.error("YouTube iframe error:", e);
  console.log("Iframe source:", iframeSrc);

  let errorInfo = {
    message: "Unable to load YouTube video preview",
    type: "unknown",
  };

  try {
    // Check for CSP errors
    if (e && e.message && e.message.includes("Content-Security-Policy")) {
      errorInfo = {
        message:
          "Video preview blocked by security policy. Click to watch on YouTube.",
        type: "csp",
      };
    }
    // Check for connection errors
    else if (e && (e.type === "error" || e.message?.includes("network"))) {
      errorInfo = {
        message: "Network error loading video. Check your connection.",
        type: "network",
      };
    }
    // Check for API quota issues
    else if (e && e.message && e.message.includes("quota")) {
      errorInfo = {
        message: "Video previews unavailable due to API limits",
        type: "quota",
      };
    }
  } catch (err) {
    console.error("Error analyzing YouTube error:", err);
  }

  return errorInfo;
};

/**
 * Reset YouTube API quota exceeded flag in localStorage
 */
export const resetYouTubeQuotaFlag = () => {
  localStorage.removeItem("youtube_quota_exceeded");
  console.log("YouTube quota flag reset");
  return true;
};
