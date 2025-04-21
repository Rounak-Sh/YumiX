// Script to reset the YouTube API quota exceeded flag
import { redisClient } from "../config/redisConfig.js";

async function resetYouTubeQuota() {
  console.log("Starting YouTube quota reset script...");

  try {
    if (!redisClient.isReady) {
      console.log("Redis client not connected, connecting now...");
      await redisClient.connect();
    }

    console.log("Checking current quota status...");
    const currentValue = await redisClient.get("youtube_quota_exceeded");
    console.log(`Current quota status: ${currentValue || "not set"}`);

    if (currentValue === "true") {
      console.log("Deleting YouTube quota exceeded flag...");
      await redisClient.del("youtube_quota_exceeded");
      console.log("YouTube quota exceeded flag successfully cleared!");
    } else {
      console.log("YouTube quota flag is not set, no action needed.");
    }

    // Verify the deletion
    const verifyValue = await redisClient.get("youtube_quota_exceeded");
    console.log(
      `Verification - current quota status: ${
        verifyValue || "not set (success)"
      }`
    );

    // Close Redis connection
    await redisClient.quit();
    console.log("Redis connection closed.");

    console.log("Script completed successfully.");
  } catch (error) {
    console.error("Error resetting YouTube quota:", error);
  }
}

// Run the function and exit
resetYouTubeQuota()
  .then(() => {
    console.log("Reset operation completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error in reset operation:", err);
    process.exit(1);
  });
