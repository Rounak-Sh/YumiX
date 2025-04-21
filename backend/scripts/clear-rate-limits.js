import { redisClient } from "../config/redisConfig.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function connectRedis() {
  try {
    console.log("Connecting to Redis...");
    if (!redisClient.isReady) {
      await redisClient.connect();
    }
    console.log("Connected to Redis");
    return true;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    return false;
  }
}

async function clearRateLimitKeys() {
  try {
    // Connect to Redis if not already connected
    const connected = await connectRedis();
    if (!connected) {
      console.error("Cannot clear rate limits - Redis connection failed");
      process.exit(1);
    }

    console.log("Searching for rate limit keys...");

    // Clear various rate limit keys
    const rateLimitKeys = await redisClient.keys("rl:*");
    console.log(`Found ${rateLimitKeys.length} rate limit keys`);

    if (rateLimitKeys.length > 0) {
      await redisClient.del(rateLimitKeys);
      console.log(`Cleared ${rateLimitKeys.length} rate limit keys`);
    }

    // Clear login attempt keys
    const loginKeys = await redisClient.keys("login_attempts:*");
    console.log(`Found ${loginKeys.length} login attempt keys`);

    if (loginKeys.length > 0) {
      await redisClient.del(loginKeys);
      console.log(`Cleared ${loginKeys.length} login attempt keys`);
    }

    // Clear cached search results
    const searchKeys = await redisClient.keys("search_*");
    console.log(`Found ${searchKeys.length} search cache keys`);

    if (searchKeys.length > 0) {
      await redisClient.del(searchKeys);
      console.log(`Cleared ${searchKeys.length} search cache keys`);
    }

    // Clear recipe search keys
    const recipeSearchKeys = await redisClient.keys("recipe_search:*");
    console.log(`Found ${recipeSearchKeys.length} recipe search keys`);

    if (recipeSearchKeys.length > 0) {
      await redisClient.del(recipeSearchKeys);
      console.log(`Cleared ${recipeSearchKeys.length} recipe search keys`);
    }

    console.log("Rate limit cleanup completed");
  } catch (error) {
    console.error("Error clearing rate limits:", error);
  } finally {
    await redisClient.quit();
    console.log("Redis connection closed");
  }
}

// If script is run directly (not imported)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  clearRateLimitKeys();
}

export { clearRateLimitKeys };
