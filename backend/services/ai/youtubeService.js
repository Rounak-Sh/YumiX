import axios from "axios";
import { redisClient } from "../../config/redisConfig.js";

// YouTube API key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

/**
 * Get YouTube videos related to a search query
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Array} Array of video objects
 */
export const getYouTubeVideos = async (query, maxResults = 3) => {
  try {
    // If no API key is configured, return empty array
    if (!YOUTUBE_API_KEY) {
      console.warn("YouTube API key not configured");
      return [];
    }

    // Check if YouTube quota has been exceeded
    try {
      if (redisClient) {
        const quotaExceeded = await redisClient.get("youtube_quota_exceeded");
        if (quotaExceeded === "true") {
          console.log(
            "YouTube quota exceeded, skipping API call in youtubeService"
          );
          return [];
        }
      }
    } catch (redisError) {
      console.error("Redis error when checking quota:", redisError);
      // Continue anyway if Redis fails
    }

    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          maxResults,
          q: query,
          type: "video",
          videoEmbeddable: true,
          key: YOUTUBE_API_KEY,
        },
      }
    );

    if (!response.data || !response.data.items || !response.data.items.length) {
      return [];
    }

    // Format the response
    return response.data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high.url,
      channelTitle: item.snippet.channelTitle,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);

    // Check for quota exceeded error message
    if (
      error.response?.data?.error?.message?.includes("quota") ||
      (error.message && error.message.includes("quota"))
    ) {
      console.log(
        "YouTube quota exceeded, setting Redis flag from youtubeService"
      );

      // Set quota exceeded flag in Redis with 6-hour expiry
      try {
        if (redisClient) {
          await redisClient.setEx(
            "youtube_quota_exceeded",
            6 * 60 * 60,
            "true"
          );
        }
      } catch (redisError) {
        console.error("Redis error when setting quota flag:", redisError);
      }
    }

    return [];
  }
};
