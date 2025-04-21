import SupportTicket from "../models/supportTicketModel.js";
import SupportMessage from "../models/supportMessageModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";
import sendEmail from "../utils/emailService.js";

/**
 * @desc    Create a new support ticket
 * @route   POST /api/support/tickets
 * @access  Private
 */
const createSupportTicket = async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!subject || !message || !category) {
      return res.status(400).json({
        success: false,
        message: "Please provide subject, message, and category",
      });
    }

    // Create new ticket - include message in the ticket creation
    const ticket = await SupportTicket.create({
      subject,
      message, // Add message field to match model requirements
      category,
      priority: priority || "medium",
      userId: userId,
      status: "open",
    });

    // Create initial message
    await SupportMessage.create({
      ticket: ticket._id,
      sender: userId,
      senderType: "user",
      message,
      attachments: req.body.attachments || [],
    });

    // Send confirmation email to the user with ticket ID
    if (req.user.email) {
      try {
        const ticketIdShort = ticket._id.toString().substring(0, 8);
        await sendEmail({
          to: req.user.email,
          subject: `Your Support Request (ID: ${ticketIdShort})`,
          text: `
Dear ${req.user.name || req.user.username || "User"},

Thank you for contacting YuMix Support. Your request has been received successfully.

Ticket ID: ${ticket._id}
Subject: ${subject}
Category: ${category}
Status: Open

You can view updates to your ticket in the support section of your account. We'll also notify you by email when we respond to your request.

Regards,
YuMix Support Team
          `,
        });
      } catch (emailError) {
        console.error("Error sending ticket confirmation email:", emailError);
        // Continue processing even if email fails
      }
    }

    // Send notification email to admin
    try {
      await sendEmail({
        to: process.env.SUPPORT_EMAIL,
        subject: `New Support Ticket: ${subject}`,
        text: `A new support ticket has been created. Ticket ID: ${ticket._id}`,
      });
    } catch (emailError) {
      console.error("Error sending support notification email:", emailError);
      // Continue processing even if email fails
    }

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    console.error("Request body:", req.body); // Log the request body for debugging
    return res.status(500).json({
      success: false,
      message: "Error creating support ticket",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all support tickets for a user
 * @route   GET /api/support/tickets
 * @access  Private
 */
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    // Convert to integers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build filter
    const filter = { userId: userId };
    if (status && status !== "all") {
      filter.status = status;
    }

    // Count total tickets
    const totalTickets = await SupportTicket.countDocuments(filter);

    // Get paginated tickets
    const tickets = await SupportTicket.find(filter)
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("lastRepliedBy", "username profileImage");

    return res.status(200).json({
      success: true,
      message: "Support tickets retrieved successfully",
      data: tickets,
      pagination: {
        total: totalTickets,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalTickets / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching support tickets",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a specific support ticket with messages
 * @route   GET /api/support/tickets/:id
 * @access  Private
 */
const getTicketDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find ticket
    const ticket = await SupportTicket.findById(id)
      .populate("userId", "username email profileImage")
      .populate("assignedTo", "username email");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    // Check if user owns the ticket
    if (
      !req.user.isAdmin &&
      ticket.userId &&
      ticket.userId._id &&
      ticket.userId._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this ticket",
      });
    }

    // Get messages for this ticket - with modified approach
    const messages = await SupportMessage.find({ ticket: id }).sort({
      createdAt: 1,
    });

    // Manually handle population based on sender type
    const populatedMessages = [];
    for (const message of messages) {
      const msg = message.toObject();

      if (message.senderType === "user" && message.sender) {
        // Manually populate user data
        try {
          const userData = await User.findById(message.sender).select(
            "username email profileImage"
          );
          if (userData) {
            msg.sender = userData;
          }
        } catch (err) {
          console.error("Error populating user data:", err);
        }
      } else if (message.senderType === "admin" && message.sender) {
        // Manually populate admin data if needed
        try {
          const Admin = mongoose.model("Admin");
          const adminData = await Admin.findById(message.sender).select(
            "username email profileImage"
          );
          if (adminData) {
            msg.sender = adminData;
          }
        } catch (err) {
          console.error("Error populating admin data:", err);
        }
      }

      populatedMessages.push(msg);
    }

    // Mark ticket as read by user
    if (!req.user.isAdmin) {
      ticket.unreadByUser = false;
      await ticket.save();
    }

    return res.status(200).json({
      success: true,
      message: "Ticket details retrieved successfully",
      data: {
        ticket,
        messages: populatedMessages,
      },
    });
  } catch (error) {
    console.error("Error fetching ticket details:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching ticket details",
      error: error.message,
    });
  }
};

/**
 * @desc    Add a reply to a support ticket
 * @route   POST /api/support/tickets/:id/reply
 * @access  Private
 */
const replyToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments } = req.body;
    let userId, isAdmin;

    // Check if coming from admin routes (adminProtect middleware) or user routes (protect middleware)
    if (req.admin) {
      // Admin middleware sets req.admin
      userId = req.admin._id;
      isAdmin = true;
    } else {
      // User middleware sets req.user
      userId = req.user._id;
      isAdmin = req.user.isAdmin || false;
    }

    // Validate message
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // Find ticket
    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    // Check if user owns the ticket or is admin
    if (
      !isAdmin &&
      ticket.userId &&
      ticket.userId.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reply to this ticket",
      });
    }

    // Create new message
    const newMessage = await SupportMessage.create({
      ticket: id,
      sender: userId,
      senderType: isAdmin ? "admin" : "user",
      message,
      attachments: attachments || [],
    });

    // Update ticket
    ticket.status = isAdmin ? "awaiting-user-reply" : "awaiting-support-reply";
    ticket.lastRepliedBy = userId;
    ticket.updatedAt = Date.now();

    // Set unread flags
    if (isAdmin) {
      ticket.unreadByUser = true;
    } else {
      ticket.unreadByAdmin = true;
    }

    await ticket.save();

    // If admin reply, send email notification to user
    if (isAdmin && ticket.userId) {
      try {
        const user = await User.findById(ticket.userId);
        if (user && user.email) {
          // Send a more detailed email with the actual response content
          await sendEmail({
            to: user.email,
            subject: `Response to Your Support Ticket: ${ticket.subject}`,
            text: `
Dear ${user.name || user.username || "User"},

Our support team has responded to your recent ticket:

Subject: ${ticket.subject}
Ticket ID: ${ticket._id}
Status: ${ticket.status}

Support Team Response:
----------------
${message}
----------------

You can reply to this ticket by logging into your account and visiting the support section.

Regards,
YuMix Support Team
            `,
          });
        }
      } catch (emailError) {
        console.error("Error sending ticket reply notification:", emailError);
        // Continue processing even if email fails
      }
    }

    return res.status(201).json({
      success: true,
      message: "Reply added successfully",
      data: newMessage,
      ticket: ticket,
    });
  } catch (error) {
    console.error("Error replying to ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error replying to ticket",
      error: error.message,
    });
  }
};

/**
 * @desc    Close a support ticket
 * @route   PUT /api/support/tickets/:id/close
 * @access  Private
 */
const closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.isAdmin;

    // Find ticket
    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    // Check if user owns the ticket or is admin
    if (!isAdmin && ticket.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to close this ticket",
      });
    }

    // Update ticket status
    ticket.status = "closed";
    ticket.closedAt = Date.now();
    ticket.closedBy = userId;

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Support ticket closed successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error closing support ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error closing support ticket",
      error: error.message,
    });
  }
};

/**
 * @desc    Reopen a closed ticket
 * @route   PUT /api/support/tickets/:id/reopen
 * @access  Private
 */
const reopenTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find ticket
    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    // Check if user owns the ticket or is admin
    if (!req.user.isAdmin && ticket.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reopen this ticket",
      });
    }

    // Can only reopen closed tickets
    if (ticket.status !== "closed") {
      return res.status(400).json({
        success: false,
        message: "This ticket is not closed",
      });
    }

    // Update ticket status
    ticket.status = req.user.isAdmin
      ? "awaiting-user-reply"
      : "awaiting-support-reply";
    ticket.closedAt = null;
    ticket.closedBy = null;

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Support ticket reopened successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error reopening support ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error reopening support ticket",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all support tickets (admin only)
 * @route   GET /api/admin/support/tickets
 * @access  Admin
 */
const getAllTickets = async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;

    // Convert to integers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build filter
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    if (priority) {
      filter.priority = priority;
    }

    // Count total tickets
    const totalTickets = await SupportTicket.countDocuments(filter);

    // Get paginated tickets
    const tickets = await SupportTicket.find(filter)
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("userId", "username email")
      .populate("assignedTo", "username email")
      .populate("lastRepliedBy", "username email");

    return res.status(200).json({
      success: true,
      message: "All support tickets retrieved successfully",
      data: tickets,
      pagination: {
        total: totalTickets,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalTickets / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching all support tickets:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching all support tickets",
      error: error.message,
    });
  }
};

/**
 * @desc    Assign ticket to admin
 * @route   PUT /api/admin/support/tickets/:id/assign
 * @access  Admin
 */
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    // Find ticket
    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    // Update assigned admin
    ticket.assignedTo = adminId || null;
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: adminId
        ? "Ticket assigned successfully"
        : "Ticket unassigned successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error assigning ticket",
      error: error.message,
    });
  }
};

/**
 * @desc    Update ticket priority
 * @route   PUT /api/admin/support/tickets/:id/priority
 * @access  Admin
 */
const updateTicketPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    // Validate priority
    if (!["low", "medium", "high", "urgent"].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority level",
      });
    }

    // Find ticket
    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    // Update priority
    ticket.priority = priority;
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket priority updated successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error updating ticket priority:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating ticket priority",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a support ticket
 * @route   PUT /api/support/admin/tickets/:id
 * @access  Admin
 */
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find ticket
    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    // Updates allowed for admin: status, priority, assignedTo, response
    if (updates.status) ticket.status = updates.status;
    if (updates.priority) ticket.priority = updates.priority;
    if (updates.assignedTo) ticket.assignedTo = updates.assignedTo;

    // If there's a response, create a new message
    if (updates.response) {
      // Create a message from the admin
      await SupportMessage.create({
        ticket: id,
        sender: req.admin._id, // Admin ID
        senderType: "admin",
        message: updates.response,
        attachments: updates.attachments || [],
      });

      // Update ticket
      ticket.lastRepliedBy = req.admin._id;
      ticket.unreadByUser = true;
      ticket.unreadByAdmin = false;
    }

    // If status is being updated to closed, set closedAt and closedBy
    if (updates.status === "closed" && ticket.status !== "closed") {
      ticket.closedAt = Date.now();
      ticket.closedBy = req.admin._id;
    }

    ticket.updatedAt = Date.now();
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Support ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error updating support ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating support ticket",
      error: error.message,
    });
  }
};

/**
 * @desc    Get support ticket statistics (admin only)
 * @route   GET /api/admin/support/stats
 * @access  Admin
 */
const getTicketStats = async (req, res) => {
  try {
    // Get counts by status
    const open = await SupportTicket.countDocuments({ status: "open" });
    const awaitingUserReply = await SupportTicket.countDocuments({
      status: "awaiting-user-reply",
    });
    const awaitingSupportReply = await SupportTicket.countDocuments({
      status: "awaiting-support-reply",
    });
    const closed = await SupportTicket.countDocuments({ status: "closed" });

    // Get counts by priority
    const low = await SupportTicket.countDocuments({ priority: "low" });
    const medium = await SupportTicket.countDocuments({ priority: "medium" });
    const high = await SupportTicket.countDocuments({ priority: "high" });
    const urgent = await SupportTicket.countDocuments({ priority: "urgent" });

    // Get ticket counts by category
    const categories = await SupportTicket.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Average resolution time (for closed tickets)
    const avgResolutionTimeResult = await SupportTicket.aggregate([
      { $match: { status: "closed", closedAt: { $exists: true } } },
      {
        $project: {
          resolutionTime: { $subtract: ["$closedAt", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$resolutionTime" },
        },
      },
    ]);

    const avgResolutionTimeMs =
      avgResolutionTimeResult.length > 0
        ? avgResolutionTimeResult[0].avgTime
        : 0;
    const avgResolutionTimeHours =
      Math.round((avgResolutionTimeMs / (1000 * 60 * 60)) * 10) / 10;

    return res.status(200).json({
      success: true,
      message: "Support ticket statistics retrieved successfully",
      data: {
        total: open + awaitingUserReply + awaitingSupportReply + closed,
        byStatus: {
          open,
          "awaiting-user-reply": awaitingUserReply,
          "awaiting-support-reply": awaitingSupportReply,
          closed,
        },
        byPriority: {
          low,
          medium,
          high,
          urgent,
        },
        byCategory: categories.map((c) => ({
          category: c._id,
          count: c.count,
        })),
        performance: {
          avgResolutionTimeHours,
        },
      },
    });
  } catch (error) {
    console.error("Error getting ticket statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting ticket statistics",
      error: error.message,
    });
  }
};

/**
 * @desc    Submit a support request as a guest (without authentication)
 * @route   POST /api/support/guest
 * @access  Public
 */
const submitGuestSupportRequest = async (req, res) => {
  try {
    const { email, name, message, subject, requestType } = req.body;

    // Validate required fields
    if (!email || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and message",
      });
    }

    // Create a reference ID for this request
    const referenceId = `GS-${Date.now().toString().slice(-8)}-${Math.floor(
      Math.random() * 1000
    )}`;

    // Determine appropriate subject based on request type
    let emailSubject = subject || "Guest Support Request";

    // Create support ticket without associating with a user
    const ticket = await SupportTicket.create({
      subject: emailSubject,
      message: message,
      category: requestType || "general",
      priority: requestType === "unblock" ? "high" : "medium",
      status: "open",
      guestEmail: email,
      guestName: name || "Guest User",
      referenceId: referenceId,
      isGuestRequest: true,
    });

    // Create initial message
    await SupportMessage.create({
      ticket: ticket._id,
      guestEmail: email,
      guestName: name || "Guest User",
      senderType: "guest",
      message,
      referenceId: referenceId,
    });

    // Send acknowledgement email to guest
    try {
      await sendEmail({
        to: email,
        subject: `Your Support Request (Ref: ${referenceId})`,
        text: `
        Dear ${name || "User"},
        
        Thank you for contacting YuMix Support. Your request has been received and has been assigned reference number: ${referenceId}.
        
        Our support team will review your request and get back to you as soon as possible.
        
        Please keep this reference number for future communication.
        
        Regards,
        YuMix Support Team
        `,
      });
    } catch (emailError) {
      console.error("Error sending support acknowledgement email:", emailError);
      // Continue even if email fails
    }

    // Send notification email to admin
    try {
      await sendEmail({
        to: process.env.SUPPORT_EMAIL,
        subject: `New Guest Support Request: ${emailSubject}`,
        text: `
        A new guest support request has been received.
        
        Reference ID: ${referenceId}
        Type: ${requestType || "General"}
        Email: ${email}
        Name: ${name || "Not provided"}
        
        Message:
        ${message}
        `,
      });
    } catch (emailError) {
      console.error("Error sending admin notification email:", emailError);
      // Continue even if email fails
    }

    return res.status(201).json({
      success: true,
      message: "Your support request has been submitted successfully",
      data: {
        referenceId,
      },
    });
  } catch (error) {
    console.error("Error submitting guest support request:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting support request",
      error: error.message,
    });
  }
};

/**
 * @desc    Submit a support request
 * @route   POST /api/support/submit-request
 * @access  Private
 */
const submitSupportRequest = async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!subject || !message || !category) {
      return res.status(400).json({
        success: false,
        message: "Please provide subject, message, and category",
      });
    }

    // Forward to createSupportTicket
    return createSupportTicket(req, res);
  } catch (error) {
    console.error("Error submitting support request:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting support request",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a support ticket by ID
 * @route   GET /api/support/tickets/:ticketId
 * @access  Private
 */
const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Set up the params for getTicketDetails
    req.params.id = ticketId;

    // Call getTicketDetails directly
    return getTicketDetails(req, res);
  } catch (error) {
    console.error("Error fetching ticket details:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching ticket details",
      error: error.message,
    });
  }
};

/**
 * @desc    Add a reply to a ticket
 * @route   POST /api/support/tickets/:ticketId/replies
 * @access  Private
 */
const addTicketReply = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Forward to the existing function
    req.params.id = ticketId;
    return replyToTicket(req, res);
  } catch (error) {
    console.error("Error adding reply to ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding reply to ticket",
      error: error.message,
    });
  }
};

/**
 * @desc    Send email notification for ticket response
 * @route   POST /api/support/admin/send-response-email
 * @access  Admin
 */
const sendResponseEmail = async (req, res) => {
  try {
    const { to, subject, message, ticketId, ticketType, status } = req.body;

    // Validate required fields
    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Email address, subject, and message are required",
      });
    }

    let emailSuccess = false;
    let emailError = null;

    try {
      // Attempt to send the email notification
      const emailResponse = await sendEmail({
        to,
        subject,
        text: `${message}\n\nTicket ID: ${ticketId}\n\nThis is an automated message. Please do not reply to this email.`,
      });

      console.log(
        `Email notification sent successfully to ${to}`,
        emailResponse
      );
      emailSuccess = true;

      // If this is an unblock request, add special instructions
      if (ticketType === "unblock") {
        let additionalText = "";

        if (status === "approved") {
          additionalText =
            "Your account has been unblocked. You can now log in to your account.";
        } else if (status === "denied") {
          additionalText =
            "If you have additional information that might help us reconsider, you can submit a new unblock request.";
        }

        // Send a follow-up email with more details if needed
        if (additionalText) {
          await sendEmail({
            to,
            subject: "Important Information About Your Account",
            text: `${additionalText}\n\nIf you need further assistance, please contact our support team.\n\nRegards,\nSupport Team`,
          });
        }
      }
    } catch (emailError) {
      // Log the email error but don't fail the request
      console.error("Error sending email notification:", emailError);
      emailError = emailError.message;
      emailSuccess = false;
    }

    // Always create a mock email in development mode for debugging/testing
    if (process.env.NODE_ENV === "development") {
      console.log("--- MOCK EMAIL (Development Mode) ---");
      console.log("To:", to);
      console.log("Subject:", subject);
      console.log("Message:", message);
      console.log("Ticket ID:", ticketId);
      console.log("Type:", ticketType);
      console.log("Status:", status);
      console.log("Email Success:", emailSuccess);
      if (emailError) console.log("Email Error:", emailError);
      console.log("--------------------------------------");

      // For dev mode, consider email as "successfully sent" for testing purposes
      return res.status(200).json({
        success: true,
        message: emailSuccess
          ? "Email notification sent successfully"
          : "Email delivery failed, but response recorded successfully",
        mock: true,
        actualEmailSent: emailSuccess,
        error: emailError,
      });
    }

    // For production, be honest about whether the email was sent
    return res.status(200).json({
      success: true,
      message: emailSuccess
        ? "Email notification sent successfully"
        : "Email delivery failed, but response recorded successfully",
      emailSent: emailSuccess,
      error: emailError,
    });
  } catch (error) {
    console.error("Error in sendResponseEmail function:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing email notification request",
      error: error.message,
    });
  }
};

/**
 * @desc    Check ticket status without authentication
 * @route   POST /api/support/check-status
 * @access  Public
 */
const checkTicketStatus = async (req, res) => {
  try {
    const { email, referenceId } = req.body;

    // Validate required fields
    if (!email || !referenceId) {
      return res.status(400).json({
        success: false,
        message: "Email and reference ID are required",
      });
    }

    // Check if referenceId matches expected format for guest tickets
    if (
      referenceId.startsWith("GS-") &&
      !referenceId.match(/^GS-\d{8}-\d{1,3}$/)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid reference ID format. For guest tickets, the format should be GS-XXXXXXXX-XXX",
      });
    }

    // Find the ticket by reference ID or ticket ID
    let ticket;
    try {
      // First try to find by referenceId string (for guest tickets)
      ticket = await SupportTicket.findOne({ referenceId: referenceId });

      // If not found and it looks like a MongoDB ObjectId, try finding by _id
      if (!ticket && /^[0-9a-fA-F]{24}$/.test(referenceId)) {
        ticket = await SupportTicket.findById(referenceId);
      }
    } catch (err) {
      console.error("Error finding ticket:", err);
      return res.status(400).json({
        success: false,
        message: "Invalid reference ID format. Please check and try again.",
      });
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message:
          "No ticket found with this reference ID. Please check your reference ID and email.",
      });
    }

    // Verify that the email matches
    let ticketEmail;
    try {
      ticketEmail = ticket.guestEmail;

      // If there's a userId, try to get the email from the User model
      if (!ticketEmail && ticket.userId) {
        const user = await User.findById(ticket.userId).select("email").lean();
        ticketEmail = user?.email;
      }
    } catch (err) {
      console.error("Error fetching user email:", err);
      // Continue with just the ticket info if user info can't be fetched
    }

    if (!ticketEmail || ticketEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message:
          "Email does not match the ticket's associated email. Please use the same email you used when submitting your request.",
      });
    }

    // Get messages for this ticket
    let messages = [];
    try {
      messages = await SupportMessage.find({ ticket: ticket._id })
        .sort({ createdAt: 1 })
        .select("-__v")
        .lean();
    } catch (err) {
      console.error("Error fetching messages:", err);
      // Continue without messages if there's an error
    }

    return res.status(200).json({
      success: true,
      data: {
        status: ticket.status,
        category: ticket.category,
        subject: ticket.subject,
        createdAt: ticket.createdAt,
        messages: messages || [],
      },
    });
  } catch (error) {
    console.error("Error checking ticket status:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking ticket status. Please try again later.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get tickets by email (simplified approach)
 * @route   POST /api/support/tickets-by-email
 * @access  Public
 */
const getTicketsByEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate required field
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    // Find tickets for this email address
    let tickets = [];

    // First check for guest tickets with this email
    const guestTickets = await SupportTicket.find({
      guestEmail: email,
      isGuestRequest: true,
    })
      .sort({ updatedAt: -1 })
      .select("-__v");

    if (guestTickets.length > 0) {
      tickets = [...guestTickets];
    }

    // Also check for registered user tickets
    try {
      // Find user with this email
      const user = await User.findOne({ email }).select("_id");

      if (user) {
        const userTickets = await SupportTicket.find({
          userId: user._id,
          isGuestRequest: false,
        })
          .sort({ updatedAt: -1 })
          .select("-__v");

        if (userTickets.length > 0) {
          tickets = [...tickets, ...userTickets];
        }
      }
    } catch (err) {
      console.error("Error finding user by email:", err);
      // Continue with just guest tickets if user lookup fails
    }

    // If no tickets found at all
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No support tickets found for this email address",
      });
    }

    // Sort combined tickets by date (newest first)
    tickets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return res.status(200).json({
      success: true,
      message: "Tickets retrieved successfully",
      data: tickets,
    });
  } catch (error) {
    console.error("Error retrieving tickets by email:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving tickets. Please try again later.",
      error: error.message,
    });
  }
};

// Export controller methods
export {
  createSupportTicket,
  getUserTickets,
  getTicketDetails,
  replyToTicket,
  closeTicket,
  reopenTicket,
  getAllTickets,
  assignTicket,
  updateTicketPriority,
  getTicketStats,
  submitGuestSupportRequest,
  submitSupportRequest,
  getTicketById,
  addTicketReply,
  updateTicket,
  sendResponseEmail,
  checkTicketStatus,
  getTicketsByEmail,
};
