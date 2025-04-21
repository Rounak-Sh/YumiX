import { redisClient } from "../config/redisConfig.js";
import jwt from "jsonwebtoken";

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

// Generate access token
export const generateAccessToken = (userId) => {
  if (!userId) {
    throw new Error("User ID is required to generate token");
  }

  // Ensure userId is a string
  const id = userId.toString();

  console.log("Generating token for user ID:", id);

  return jwt.sign(
    {
      id,
      type: "user", // Add a type to distinguish between user and admin tokens
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // 7 days
  });

  // Store refresh token in Redis with user ID as key
  redisClient.setEx(
    `refresh_token:${userId}`,
    REFRESH_TOKEN_EXPIRY,
    refreshToken
  );

  return refreshToken;
};

// Verify refresh token and generate new access token
export const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);

    if (!storedToken || storedToken !== refreshToken) {
      return {
        success: false,
        message: "Invalid refresh token",
      };
    }

    const accessToken = generateAccessToken(decoded.id);

    return {
      success: true,
      accessToken,
      userId: decoded.id,
      expiresIn: 1800, // 30 minutes in seconds
    };
  } catch (error) {
    console.error("Refresh token error:", error);
    return {
      success: false,
      message: "Invalid or expired refresh token",
    };
  }
};

// Invalidate refresh token on logout
export const invalidateRefreshToken = async (userId) => {
  await redisClient.del(`refresh_token:${userId}`);
};

// Handle failed login attempts
export const handleFailedLogin = async (identifier) => {
  try {
    const key = `login_attempts:${identifier}`;

    // Get current attempts
    const attempts = await redisClient.get(key);
    const currentAttempts = attempts ? parseInt(attempts) : 0;

    // Increment attempts
    await redisClient.set(key, currentAttempts + 1);

    // Set expiry if not already set
    if (currentAttempts === 0) {
      await redisClient.expire(key, LOCK_TIME);
    }

    console.log(
      `Failed login for ${identifier}. Attempts: ${
        currentAttempts + 1
      }/${MAX_LOGIN_ATTEMPTS}`
    );

    // If max attempts reached, lock the account
    if (currentAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
      console.log(`Account ${identifier} locked for ${LOCK_TIME} seconds`);
    }
  } catch (error) {
    console.error("Error handling failed login:", error);
  }
};

// Check if account is locked
export const isAccountLocked = async (identifier) => {
  try {
    const key = `login_attempts:${identifier}`;
    const attempts = await redisClient.get(key);

    if (!attempts) {
      return false;
    }

    const currentAttempts = parseInt(attempts);
    const isLocked = currentAttempts >= MAX_LOGIN_ATTEMPTS;

    if (isLocked) {
      // Get remaining lock time
      const ttl = await redisClient.ttl(key);
      console.log(`Account ${identifier} is locked. Unlock in ${ttl} seconds`);
    }

    return isLocked;
  } catch (error) {
    console.error("Error checking account lock:", error);
    return false; // Default to not locked in case of error
  }
};

// Reset login attempts on successful login
export const resetLoginAttempts = async (identifier) => {
  try {
    const key = `login_attempts:${identifier}`;
    await redisClient.del(key);
    console.log(`Reset login attempts for ${identifier}`);
  } catch (error) {
    console.error("Error resetting login attempts:", error);
  }
};

// Manually unlock an account
export const unlockAccount = async (identifier) => {
  try {
    const key = `login_attempts:${identifier}`;
    await redisClient.del(key);
    console.log(`Manually unlocked account for ${identifier}`);
    return true;
  } catch (error) {
    console.error("Error unlocking account:", error);
    return false;
  }
};
