import { User, TempUser } from "../models/index.js";
import { redisClient } from "../config/redisConfig.js";

// Cleanup expired OTPs from TempUser collection
export const cleanupExpiredOTPs = async () => {
  try {
    const result = await TempUser.deleteMany({
      otpExpiry: { $lt: new Date() },
    });

    console.log(`Cleaned up ${result.deletedCount} expired OTPs from TempUser`);
  } catch (error) {
    console.error("Error cleaning up expired OTPs:", error);
  }
};

// Cleanup expired reset password OTPs
export const cleanupExpiredResetOTPs = async () => {
  try {
    const result = await User.updateMany(
      {
        resetPasswordOtpExpiry: { $lt: new Date() },
      },
      {
        $unset: {
          resetPasswordOtp: "",
          resetPasswordOtpExpiry: "",
        },
      }
    );

    console.log(
      `Cleaned up ${result.modifiedCount} expired reset password OTPs`
    );
  } catch (error) {
    console.error("Error cleaning up expired reset password OTPs:", error);
  }
};

// Cleanup expired profile update OTPs
export const cleanupExpiredProfileOTPs = async () => {
  try {
    const result = await User.updateMany(
      {
        profileUpdateOtpExpiry: { $lt: new Date() },
      },
      {
        $unset: {
          profileUpdateOtp: "",
          profileUpdateOtpExpiry: "",
        },
      }
    );

    console.log(
      `Cleaned up ${result.modifiedCount} expired profile update OTPs`
    );
  } catch (error) {
    console.error("Error cleaning up expired profile update OTPs:", error);
  }
};

// Cleanup expired login attempts and locks from Redis
export const cleanupExpiredLoginAttempts = async () => {
  try {
    const keys = await redisClient.keys("login_attempts:*");
    let cleaned = 0;

    for (const key of keys) {
      const ttl = await redisClient.ttl(key);
      if (ttl <= 0) {
        await redisClient.del(key);
        cleaned++;
      }
    }

    console.log(`Cleaned up ${cleaned} expired login attempts`);
  } catch (error) {
    console.error("Error cleaning up expired login attempts:", error);
  }
};

// Run all cleanup tasks
export const runCleanupTasks = async () => {
  console.log("Starting cleanup tasks:", new Date().toISOString());

  await Promise.all([
    cleanupExpiredOTPs(),
    cleanupExpiredResetOTPs(),
    cleanupExpiredProfileOTPs(),
    cleanupExpiredLoginAttempts(),
  ]);

  console.log("Cleanup tasks completed:", new Date().toISOString());
};
