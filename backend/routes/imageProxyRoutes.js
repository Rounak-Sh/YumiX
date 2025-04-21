import express from "express";
import axios from "axios";
import { createProxyMiddleware } from "http-proxy-middleware";
import logger from "../utils/logger";

const router = express.Router();

// Setup cache for successful image requests
const imageCache = new Map();
const MAX_CACHE_SIZE = 1000; // Limit cache size to prevent memory issues

/**
 * Proxy route for Spoonacular images to avoid CORS issues
 *
 * This route fetches images from Spoonacular and serves them with proper CORS headers
 * Usage: /api/image-proxy/spoonacular/:imageId?size=556x370
 */
router.get("/spoonacular/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    const size = req.query.size || "556x370"; // Default size

    // Log the image request
    logger.info(`Spoonacular image proxy request: ID=${imageId}, Size=${size}`);

    // Validate imageId to prevent security issues
    if (!imageId || !/^\d+$/.test(imageId)) {
      logger.warn(`Invalid Spoonacular image ID: ${imageId}`);
      return res.status(400).send("Invalid image ID");
    }

    // Validate size parameter to prevent potential injection
    if (!size.match(/^\d+x\d+$/)) {
      logger.warn(`Invalid size parameter: ${size}`);
      return res.status(400).send("Invalid size parameter");
    }

    // Create cache key
    const cacheKey = `spoonacular-${imageId}-${size}`;

    // Check if we have this image cached
    if (imageCache.has(cacheKey)) {
      logger.info(`Serving cached image for ID=${imageId}, Size=${size}`);
      const cachedData = imageCache.get(cacheKey);

      // Set appropriate headers
      res.setHeader("Content-Type", cachedData.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("X-Cache", "HIT");

      return res.send(cachedData.data);
    }

    // Construct image URLs (try both domains as fallbacks)
    const urls = [
      `https://spoonacular.com/recipeImages/${imageId}-${size}.jpg`,
      `https://spoonacular.com/recipeImages/${imageId}-${size}.jpeg`,
      `https://images.spoonacular.com/file/wximages/${imageId}-${size}.jpg`,
      `https://images.spoonacular.com/file/wximages/${imageId}-${size}.jpeg`,
    ];

    // Try multiple URLs with a timeout
    let imageData = null;
    let contentType = null;
    let succeeded = false;

    for (const url of urls) {
      try {
        logger.info(`Trying to fetch image from: ${url}`);
        const response = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 5000, // 5 second timeout
        });

        // If we got here, the request succeeded
        imageData = response.data;
        contentType = response.headers["content-type"] || "image/jpeg";
        succeeded = true;

        // Cache the successful image data
        if (imageCache.size >= MAX_CACHE_SIZE) {
          // Clear the first (oldest) entry if we hit the size limit
          const firstKey = imageCache.keys().next().value;
          imageCache.delete(firstKey);
        }

        imageCache.set(cacheKey, {
          data: imageData,
          contentType,
          timestamp: Date.now(),
        });

        logger.info(`Successfully fetched image from: ${url}`);
        break; // Exit the loop once we have a successful request
      } catch (error) {
        logger.error(`Failed to fetch from ${url}: ${error.message}`);
        // Continue to try the next URL
      }
    }

    if (succeeded) {
      // Set appropriate headers
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("X-Cache", "MISS");

      return res.send(imageData);
    }

    // If all requests failed, return a SVG placeholder
    logger.warn(`All image fetch attempts failed for ID=${imageId}`);

    // Set appropriate headers for the SVG placeholder
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Redirect to a YouTube thumbnail instead of SVG placeholder
    // This will give a better visual experience
    return res.redirect(`/api/image-proxy/youtube/food%20${imageId}`);
  } catch (error) {
    logger.error(`Image proxy error: ${error.message}`);
    return res.status(500).send("Error fetching image");
  }
});

// Add in a YouTube thumbnail endpoint for food-related images
router.get("/youtube/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const cleanQuery = decodeURIComponent(query).trim();
    logger.info(`YouTube image proxy request for: ${cleanQuery}`);

    if (!cleanQuery || cleanQuery.length < 2) {
      return res.status(400).send("Invalid query parameter");
    }

    // Reliable YouTube video IDs for food categories
    const foodVideoIds = {
      cake: "jADHtfRVP6c",
      chocolate: "XoNIsoqT5s0",
      cookies: "RxiG-_ANMjU",
      pasta: "6rTi-XA7bLI",
      chicken: "TGYKLtQ7vXI",
      beef: "x_ZRiGTcTFM",
      pizza: "sv3TXMSv6Lw",
      salad: "NMt9dh9FJzE",
      fish: "O0WLcA-Qhks",
      vegetable: "Z2nIGQT-Qd4",
      dessert: "SQHeTbJkqkw",
      breakfast: "v2Zbs8H_Q6M",
      bread: "lipLMAz2HQ4",
      soup: "dHTy_yQ_wQ0",
      fruit: "1_YABPeBZZM",
      cheese: "QaHQlrBIXuQ",
      vegan: "7CxIplM279U",
      baking: "w4-YdT-24C8",
    };

    // Default video ID - use a reliable cooking video
    let videoId = "TGYKLtQ7vXI";

    // Look for specific food words in the query
    for (const [keyword, id] of Object.entries(foodVideoIds)) {
      if (cleanQuery.toLowerCase().includes(keyword)) {
        videoId = id;
        break;
      }
    }

    // Construct YouTube thumbnail URL
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

    try {
      const response = await axios.get(thumbnailUrl, {
        responseType: "arraybuffer",
        timeout: 5000,
      });

      // Set appropriate headers
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.setHeader("Access-Control-Allow-Origin", "*");

      return res.send(response.data);
    } catch (error) {
      logger.error(`Failed to fetch YouTube thumbnail: ${error.message}`);
      // Fall back to a direct thumbnail URL
      return res.redirect(
        "https://img.youtube.com/vi/TGYKLtQ7vXI/mqdefault.jpg"
      );
    }
  } catch (error) {
    logger.error(`YouTube image proxy error: ${error.message}`);
    return res.status(500).send("Error fetching image");
  }
});

export default router;
