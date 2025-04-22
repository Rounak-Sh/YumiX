import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import dotenv from "dotenv";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to .env file
const envPath = path.resolve(__dirname, "..", ".env");

// Create readline interface for terminal input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Load current .env file
let envConfig;
try {
  const envContent = fs.readFileSync(envPath, "utf8");
  envConfig = dotenv.parse(envContent);
  console.log("Current .env file loaded");
} catch (error) {
  console.error("Error loading .env file:", error.message);
  process.exit(1);
}

// Get current OTP setting
const currentSetting = envConfig.SKIP_ADMIN_OTP === "true";
console.log(
  `\nCurrent admin OTP setting: ${currentSetting ? "BYPASSED" : "ENABLED"}`
);
console.log(
  `OTP verification is currently ${
    currentSetting ? "DISABLED" : "ENABLED"
  } for admin login`
);

// Ask for confirmation
rl.question(
  `\nDo you want to ${
    currentSetting ? "ENABLE" : "DISABLE"
  } OTP verification? (y/n): `,
  async (answer) => {
    if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
      // Toggle the setting
      const newSetting = !currentSetting;
      envConfig.SKIP_ADMIN_OTP = newSetting ? "true" : "false";

      // Create new .env content
      const newEnvContent = Object.entries(envConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");

      // Write back to .env file
      try {
        fs.writeFileSync(envPath, newEnvContent);
        console.log(
          `\nAdmin OTP verification has been ${
            newSetting ? "DISABLED" : "ENABLED"
          }`
        );
        console.log(
          `OTP verification is now ${
            newSetting ? "BYPASSED" : "REQUIRED"
          } for admin login`
        );
        console.log(
          "\nYou need to restart the server for changes to take effect"
        );
      } catch (error) {
        console.error("Error updating .env file:", error.message);
      }
    } else {
      console.log("\nOperation cancelled. No changes made.");
    }

    rl.close();
  }
);
