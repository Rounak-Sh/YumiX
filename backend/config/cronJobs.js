import cron from "node-cron";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run cleanup tasks every day
export const initCleanupCron = () => {
  // Cleanup inactive recipes - runs daily at 2:00 AM
  cron.schedule("0 2 * * *", () => {
    console.log("Running inactive recipes cleanup cron job");
    const scriptPath = path.resolve(
      __dirname,
      "../scripts/cleanupInactiveRecipes.js"
    );

    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(
          `Error executing recipe cleanup script: ${error.message}`
        );
        return;
      }
      if (stderr) {
        console.error(`Recipe cleanup script stderr: ${stderr}`);
      }
      console.log(`Recipe cleanup script output: ${stdout}`);
    });
  });

  console.log("Recipe cleanup cron job initialized");
};
