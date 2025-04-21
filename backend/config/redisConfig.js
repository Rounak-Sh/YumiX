import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.log(
          "Redis max retries reached. Stopping reconnection attempts."
        );
        return new Error("Max retries reached");
      }
      // Retry with exponential backoff
      return Math.min(retries * 100, 3000);
    },
  },
  password: process.env.REDIS_PASSWORD,
});

redisClient.on("error", (err) => {
  console.log("Redis Client Error:", {
    message: err.message,
    code: err.code,
    details: err.details,
    timestamp: new Date().toISOString(),
  });
});

redisClient.on("connect", () => {
  console.log("Redis Client Connected:", {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    timestamp: new Date().toISOString(),
  });
});

redisClient.on("reconnecting", () => {
  console.log("Redis Client Reconnecting...");
});

redisClient.on("ready", () => {
  console.log("Redis Client Ready for operations");
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Redis Connection Error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString(),
    });
  }
};

// Helper function to safely execute Redis operations
const safeRedisOperation = async (operation) => {
  try {
    // First check if Redis client exists
    if (!redisClient) {
      console.error("Redis client is not initialized");
      return null;
    }

    // Check if Redis is ready, if not try to connect
    if (!redisClient.isReady) {
      console.log("Redis client not ready, attempting to connect...");
      try {
        await connectRedis();
        // Wait a bit for connection to establish
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (connectError) {
        console.error("Failed to connect to Redis:", {
          message: connectError.message,
          code: connectError.code,
          timestamp: new Date().toISOString(),
        });
        return null;
      }
    }

    // Check again if Redis is ready after connection attempt
    if (!redisClient.isReady) {
      console.error("Redis still not ready after connection attempt");
      return null;
    }

    // Execute the operation with a timeout
    const result = await Promise.race([
      operation(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis operation timeout")), 5000)
      ),
    ]);

    return result;
  } catch (error) {
    console.error("Redis Operation Error:", {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    });
    return null;
  }
};

export { redisClient, connectRedis, safeRedisOperation };
