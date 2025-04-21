import express from "express";
import * as supportController from "../controllers/supportController.js";
import { protect, admin, adminProtect } from "../middleware/authMiddleware.js";
import SupportTicket from "../models/supportTicketModel.js";

const router = express.Router();

// Guest routes (no authentication required) - must be defined BEFORE the protect middleware
router.post("/guest", supportController.submitGuestSupportRequest);
router.post("/check-status", supportController.checkTicketStatus);
router.post("/tickets-by-email", supportController.getTicketsByEmail);

// User routes are protected with user middleware
router.post("/tickets", protect, supportController.createSupportTicket);
router.get("/tickets", protect, supportController.getUserTickets);
router.get("/tickets/:id", protect, supportController.getTicketDetails);
router.post("/tickets/:id/reply", protect, supportController.replyToTicket);
router.put("/tickets/:id/close", protect, supportController.closeTicket);
router.put("/tickets/:id/reopen", protect, supportController.reopenTicket);

// Admin routes use admin middleware
router.get("/admin/tickets", adminProtect, supportController.getAllTickets);
router.put(
  "/admin/tickets/:id/assign",
  adminProtect,
  supportController.assignTicket
);
router.put(
  "/admin/tickets/:id/priority",
  adminProtect,
  supportController.updateTicketPriority
);
router.put("/admin/tickets/:id", adminProtect, supportController.updateTicket);
router.post(
  "/admin/tickets/:id/reply",
  adminProtect,
  supportController.replyToTicket
);
router.get("/admin/stats", adminProtect, supportController.getTicketStats);
router.post(
  "/admin/send-response-email",
  adminProtect,
  supportController.sendResponseEmail
);

// Protected routes (require authentication)
router.post("/submit-request", protect, supportController.submitSupportRequest);
router.get("/my-tickets", protect, supportController.getUserTickets);
router.get("/tickets/:ticketId", protect, supportController.getTicketById);
router.post(
  "/tickets/:ticketId/replies",
  protect,
  supportController.addTicketReply
);

// Submit support request - This route can be simplified to use the controller method now
router.post("/", protect, supportController.submitSupportRequest);

// Get support categories
router.get("/categories", async (req, res) => {
  try {
    // These could come from a database, but for now they're hardcoded
    const categories = [
      { id: "technical", name: "Technical Issue" },
      { id: "account", name: "Account Related" },
      { id: "billing", name: "Billing Question" },
      { id: "feature", name: "Feature Request" },
      { id: "other", name: "Other" },
      { id: "general", name: "General Inquiry" },
      { id: "unblock", name: "Account Unblocking" },
      { id: "reactivate", name: "Account Reactivation" },
    ];

    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching support categories:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching support categories",
    });
  }
});

export default router;
