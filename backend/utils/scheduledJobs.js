import cron from "node-cron";
import { Subscription, User } from "../models/index.js";
import userNotificationController from "../controllers/user/notificationController.js";
import logger from "./logger.js";

/**
 * Initialize scheduled jobs
 */
export const initScheduledJobs = () => {
  // Schedule the check for expiring subscriptions to run at midnight every day
  cron.schedule("0 0 * * *", checkExpiringSubscriptions);

  logger.info("Scheduled jobs initialized");
};

/**
 * Check for subscriptions that are about to expire in the next 3 days
 * and send notifications to the users
 */
export const checkExpiringSubscriptions = async () => {
  try {
    logger.info("Running scheduled job: Check expiring subscriptions");

    // Calculate date 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Find subscriptions that expire between now and 3 days from now
    const expiringSubscriptions = await Subscription.find({
      expiryDate: {
        $gte: new Date(),
        $lte: threeDaysFromNow,
      },
      notificationSent: { $ne: true }, // Only get ones where we haven't sent a notification
    });

    logger.info(
      `Found ${expiringSubscriptions.length} subscriptions expiring soon`
    );

    // Process each expiring subscription
    for (const subscription of expiringSubscriptions) {
      try {
        // Create expiration notification
        await userNotificationController.createUserNotification({
          userId: subscription.userId,
          title: "Subscription Expiring Soon",
          message: `Your ${subscription.planType} subscription will expire in a few days. Renew now to avoid interruption!`,
          type: "subscription",
          data: {
            subscriptionId: subscription._id,
            planType: subscription.planType,
            expiryDate: subscription.expiryDate,
          },
        });

        // Mark notification as sent
        subscription.notificationSent = true;
        await subscription.save();

        logger.info(
          `Expiration notification sent for subscription ${subscription._id}`
        );
      } catch (error) {
        logger.error(
          `Error creating notification for subscription ${subscription._id}:`,
          error
        );
        // Continue with next subscription even if this one fails
      }
    }

    logger.info("Expiring subscriptions check completed");
  } catch (error) {
    logger.error("Error checking for expiring subscriptions:", error);
  }
};

export default {
  initScheduledJobs,
  checkExpiringSubscriptions,
};
