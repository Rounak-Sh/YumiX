import cron from "node-cron";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import adminNotificationController from "../controllers/admin/notificationController.js";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize notification cleanup cron job
export const initNotificationCleanupCron = () => {
  // Cleanup old notifications - runs daily at 3:30 AM
  cron.schedule("30 3 * * *", async () => {
    console.log("Running old notifications cleanup cron job");
    try {
      // Directly call the cleanup function from the controller
      const result =
        await adminNotificationController.cleanupOldNotifications();
      console.log(
        `Notification cleanup completed: ${result.deletedCount} notifications removed`
      );
    } catch (error) {
      console.error(`Error during notification cleanup: ${error.message}`);
    }
  });

  console.log("Notification cleanup cron job initialized");
};
