// Export all report controllers from a single file
import { generateUserReport } from "./userReportController.js";
import { generatePaymentReport } from "./paymentReportController.js";
import { generateSubscriptionReport } from "./subscriptionReportController.js";
import { generateRecipeReport } from "./recipeReportController.js";

export {
  generateUserReport,
  generatePaymentReport,
  generateSubscriptionReport,
  generateRecipeReport,
};
