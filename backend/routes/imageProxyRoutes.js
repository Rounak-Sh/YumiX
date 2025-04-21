import express from "express";
import axios from "axios";

const router = express.Router();

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

    // Construct the Spoonacular image URL - try both domains
    // First try the img.spoonacular.com domain
    const imageUrl = `https://img.spoonacular.com/recipes/${imageId}-${size}.jpg`;
    console.log(`Proxying Spoonacular image: ${imageUrl}`);

    try {
      // Fetch the image with a timeout
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 8000, // 8 second timeout
      });

      // Set appropriate headers
      res.set("Content-Type", response.headers["content-type"] || "image/jpeg");
      res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

      // Send the image data
      return res.send(Buffer.from(response.data, "binary"));
    } catch (primaryError) {
      console.warn(
        `Failed to fetch from primary URL (${imageUrl}): ${primaryError.message}`
      );

      // Try the fallback spoonacular.com domain if the first one fails
      const fallbackUrl = `https://spoonacular.com/recipeImages/${imageId}-${size}.jpg`;
      console.log(`Trying fallback URL: ${fallbackUrl}`);

      try {
        const fallbackResponse = await axios.get(fallbackUrl, {
          responseType: "arraybuffer",
          timeout: 8000,
        });

        res.set(
          "Content-Type",
          fallbackResponse.headers["content-type"] || "image/jpeg"
        );
        res.set("Cache-Control", "public, max-age=86400");
        return res.send(Buffer.from(fallbackResponse.data, "binary"));
      } catch (fallbackError) {
        console.error(
          `Failed to fetch from fallback URL: ${fallbackError.message}`
        );
        throw new Error(
          `Both primary and fallback image fetch failed: ${primaryError.message}, ${fallbackError.message}`
        );
      }
    }
  } catch (error) {
    console.error("Image proxy error:", error.message);

    // Set the correct content type for the SVG
    res.set("Content-Type", "image/svg+xml");

    // Send a SVG placeholder image
    return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <rect width="300" height="300" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-size="18" text-anchor="middle" alignment-baseline="middle" 
        font-family="Helvetica, Arial, sans-serif" fill="#999999">Image Not Available</text>
    </svg>`);
  }
});

export default router;
