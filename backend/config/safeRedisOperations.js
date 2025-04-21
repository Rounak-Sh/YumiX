import { redisClient } from "./redisConfig.js";

/**
 * Safely execute a Redis get operation with better error handling
 * @param {string} key - Key to retrieve
 * @param {number} [timeout=3000] - Timeout in ms
 * @returns {Promise<any>} - Returns parsed data or null on error
 */
export const safeRedisGet = async (key, timeout = 3000) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      console.log(`Redis not ready for GET:${key}, returning null`);
      return null;
    }

    // Execute with timeout
    const result = await Promise.race([
      redisClient.get(key),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Redis GET timeout for key: ${key}`)),
          timeout
        )
      ),
    ]);

    // Parse JSON if it looks like JSON
    if (
      result &&
      typeof result === "string" &&
      (result.startsWith("{") || result.startsWith("["))
    ) {
      try {
        return JSON.parse(result);
      } catch (parseError) {
        console.error(
          `Error parsing Redis result for ${key}:`,
          parseError.message
        );
        return result; // Return as string if can't parse
      }
    }

    return result;
  } catch (error) {
    console.error(`Redis GET error for ${key}:`, {
      message: error.message,
      stack: error.stack?.split("\n")[0],
      timestamp: new Date().toISOString(),
    });
    return null;
  }
};

/**
 * Safely execute a Redis set operation with better error handling
 * @param {string} key - Key to set
 * @param {any} value - Value to store (will be stringified if object)
 * @param {object} [options] - Redis options like EX for expiry
 * @param {number} [timeout=3000] - Timeout in ms
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
export const safeRedisSet = async (
  key,
  value,
  options = {},
  timeout = 3000
) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      console.log(`Redis not ready for SET:${key}, operation skipped`);
      return false;
    }

    // Convert objects to JSON strings
    const valueToStore =
      typeof value === "object" ? JSON.stringify(value) : value;

    // Execute with timeout
    const result = await Promise.race([
      redisClient.set(key, valueToStore, options),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Redis SET timeout for key: ${key}`)),
          timeout
        )
      ),
    ]);

    return result === "OK";
  } catch (error) {
    console.error(`Redis SET error for ${key}:`, {
      message: error.message,
      stack: error.stack?.split("\n")[0],
      timestamp: new Date().toISOString(),
    });
    return false;
  }
};

/**
 * Safely execute a Redis del operation with better error handling
 * @param {string|string[]} keys - Key(s) to delete
 * @param {number} [timeout=3000] - Timeout in ms
 * @returns {Promise<number>} - Returns number of keys deleted or 0 on error
 */
export const safeRedisDel = async (keys, timeout = 3000) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      console.log(`Redis not ready for DEL:${keys}, operation skipped`);
      return 0;
    }

    // Execute with timeout
    const result = await Promise.race([
      redisClient.del(keys),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Redis DEL timeout for keys: ${keys}`)),
          timeout
        )
      ),
    ]);

    return result || 0;
  } catch (error) {
    console.error(`Redis DEL error for ${keys}:`, {
      message: error.message,
      stack: error.stack?.split("\n")[0],
      timestamp: new Date().toISOString(),
    });
    return 0;
  }
};

/**
 * Safely check if Redis is connected and operational
 * @returns {Promise<object>} - Status object with connection details
 */
export const checkRedisHealth = async () => {
  const status = {
    isConnected: false,
    isReady: false,
    pingSuccess: false,
    error: null,
  };

  try {
    if (!redisClient) {
      status.error = "Redis client not initialized";
      return status;
    }

    status.isConnected = redisClient.isOpen;
    status.isReady = redisClient.isReady;

    if (status.isReady) {
      // Try a PING command
      const pingResult = await Promise.race([
        redisClient.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis PING timeout")), 2000)
        ),
      ]);

      status.pingSuccess = pingResult === "PONG";
    }

    return status;
  } catch (error) {
    status.error = error.message;
    return status;
  }
};
