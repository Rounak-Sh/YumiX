import express from "express";
import axios from "axios";

const router = express.Router();

// Cache successful image URLs to avoid repeated requests
const imageCache = new Map();

/**
 * Proxy route for Spoonacular images to avoid CORS issues
 *
 * This route fetches images from Spoonacular and serves them with proper CORS headers
 * Usage: /api/image-proxy/spoonacular/:imageId?size=556x370
 */
router.get("/spoonacular/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    const { size = "556x370" } = req.query; // Allow different image sizes
    const cacheKey = `${imageId}-${size}`;

    // Log requested image details
    console.log(`Image proxy request: ID=${imageId}, Size=${size}`);

    // Validate imageId to prevent security issues
    if (!imageId || !/^\d+$/.test(imageId)) {
      console.error(`Invalid image ID: ${imageId}`);
      return res.status(400).send("Invalid image ID");
    }

    // Validate size to prevent security issues
    if (!/^\d+x\d+$/.test(size)) {
      console.error(`Invalid image size: ${size}`);
      return res.status(400).send("Invalid image size");
    }

    // Check cache first
    if (imageCache.has(cacheKey)) {
      const cachedImageData = imageCache.get(cacheKey);
      console.log(`Serving cached image for ${cacheKey}`);

      res.set("Content-Type", cachedImageData.contentType);
      res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.set("X-Cache", "HIT");
      return res.send(cachedImageData.data);
    }

    // Try different Spoonacular image URL formats
    const imageUrls = [
      `https://img.spoonacular.com/recipes/${imageId}-${size}.jpg`,
      `https://spoonacular.com/recipeImages/${imageId}-${size}.jpg`,
      // Add more formats if needed
    ];

    let imageData = null;
    let contentType = null;
    let successUrl = null;

    // Try each URL until one works
    for (const imageUrl of imageUrls) {
      try {
        console.log(`Trying Spoonacular image URL: ${imageUrl}`);

        // Fetch the image with a timeout
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 5000, // 5 second timeout
        });

        // If successful, save the data and break the loop
        imageData = Buffer.from(response.data, "binary");
        contentType = response.headers["content-type"] || "image/jpeg";
        successUrl = imageUrl;
        console.log(`Successfully fetched image from ${imageUrl}`);
        break;
      } catch (error) {
        console.warn(
          `Failed to fetch from URL (${imageUrl}): ${error.message}`
        );
        // Continue to the next URL
      }
    }

    // If we got image data from any URL, cache it and return
    if (imageData) {
      // Cache the successful result
      imageCache.set(cacheKey, {
        data: imageData,
        contentType,
      });

      // Limit cache size to prevent memory issues
      if (imageCache.size > 1000) {
        // Remove oldest entry (first key)
        const firstKey = imageCache.keys().next().value;
        imageCache.delete(firstKey);
      }

      // Set appropriate headers
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.set("X-Cache", "MISS");
      res.set("X-Source", successUrl);

      // Send the image data
      return res.send(imageData);
    }

    // If all URLs failed, throw an error to trigger the fallback SVG
    throw new Error("All image URLs failed");
  } catch (error) {
    console.error("Image proxy error:", error.message);

    // Set the correct content type for the SVG
    res.set("Content-Type", "image/svg+xml");
    res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.set("X-Fallback", "true");

    // Send a SVG placeholder image
    return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <rect width="300" height="300" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-size="18" text-anchor="middle" alignment-baseline="middle" 
        font-family="Helvetica, Arial, sans-serif" fill="#999999">Image Not Available</text>
    </svg>`);
  }
});

export default router;
