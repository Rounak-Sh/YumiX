import express from "express";
import { redisClient, safeRedisOperation } from "../config/redisConfig.js";
import mongoose from "mongoose";

const router = express.Router();

// Basic health check endpoint
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check that includes Redis and MongoDB status
router.get("/detailed", async (req, res) => {
  // Check MongoDB connection
  const isMongoConnected = mongoose.connection.readyState === 1;

  // Check Redis connection
  let redisStatus = {
    isConnected: false,
    isReady: false,
    message: "Not initialized",
  };

  try {
    redisStatus.isConnected = redisClient.isOpen;
    redisStatus.isReady = redisClient.isReady;

    // Try a test operation
    const pingResult = await safeRedisOperation(async () => {
      return await redisClient.ping();
    });

    redisStatus.message =
      pingResult === "PONG"
        ? "Connected and responsive"
        : "Connected but not responsive";
    redisStatus.pingResult = pingResult;
  } catch (error) {
    redisStatus.message = `Error: ${error.message}`;
    redisStatus.error = {
      code: error.code,
      message: error.message,
    };
  }

  // Return complete health status
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: "running",
        uptime: process.uptime(),
      },
      mongodb: {
        status: isMongoConnected ? "connected" : "disconnected",
        readyState: mongoose.connection.readyState,
      },
      redis: redisStatus,
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasRedisConfig: !!process.env.REDIS_HOST && !!process.env.REDIS_PORT,
      hasMongoConfig: !!process.env.MONGODB_URI,
      hasSpoonacularKey: !!process.env.SPOONACULAR_API_KEY,
    },
  });
});

// Test Redis connection specifically
router.get("/redis-test", async (req, res) => {
  try {
    // Attempt to set a test value
    const testKey = "health:test";
    const testValue = `test-${Date.now()}`;

    const setResult = await safeRedisOperation(async () => {
      return await redisClient.set(testKey, testValue, { EX: 60 }); // Expire in 60 seconds
    });

    if (setResult !== "OK") {
      return res.status(500).json({
        status: "error",
        message: "Failed to set test value in Redis",
        result: setResult,
      });
    }

    // Attempt to get the test value
    const getResult = await safeRedisOperation(async () => {
      return await redisClient.get(testKey);
    });

    if (getResult !== testValue) {
      return res.status(500).json({
        status: "error",
        message: "Retrieved value does not match what was set",
        expected: testValue,
        actual: getResult,
      });
    }

    // Success!
    res.status(200).json({
      status: "ok",
      message: "Redis is working correctly",
      test: {
        key: testKey,
        originalValue: testValue,
        retrievedValue: getResult,
        match: getResult === testValue,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Redis test failed",
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
      },
    });
  }
});

export default router;
