import { useState, useEffect } from "react";
import { showToast } from "@/utils/toast";
import { useOutletContext } from "react-router-dom";
import adminApi from "@/services/api";
import supportApi from "@/services/support-api";
import Loader from "@/components/Loader";

export default function Support() {
  const { theme } = useOutletContext();
  const [activeFilter, setActiveFilter] = useState("open");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // State to manage tickets
  const [tickets, setTickets] = useState([]);
  const [userIdForUnblock, setUserIdForUnblock] = useState("");
  const [userIdInput, setUserIdInput] = useState("");
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    open: 0,
    unblock: 0,
    awaiting: 0,
    addressed: 0,
    closed: 0,
  });

  // Predefined responses for quick replies
  const predefinedResponses = {
    unblockSuccess:
      "Your account has been successfully unblocked. You can now log in to your account. If you encounter any further issues, please don't hesitate to contact us.",
    unblockDenied:
      "We've reviewed your unblock request, but we cannot unblock your account at this time due to violation of our terms of service. For more information, please reply to this message.",
    generalThankYou:
      "Thank you for reaching out to us. We've received your inquiry and will respond as soon as possible. Your ticket number is {ticketId}.",
    accountHelp:
      "Thank you for contacting our support team. To help you with your account issue, could you please provide more details such as when the problem started and any error messages you've received?",
  };

  // Function to apply a predefined response
  const applyPredefinedResponse = (responseKey, ticketId) => {
    let response = predefinedResponses[responseKey];

    // Replace any placeholder values
    if (ticketId) {
      response = response.replace("{ticketId}", ticketId.substring(0, 8));
    }

    setResponseText(response);
  };

  // Fetch tickets from the API
  const fetchSupportTickets = async () => {
    setLoading(true);
    try {
      // Fetch tickets
      const response = await supportApi.getSupportTickets();

      if (response.data.success) {
        // Check the actual data structure
        const allTickets = response.data.data || [];

        // Calculate stats
        const stats = {
          total: allTickets.length,
          open: allTickets.filter((t) => t.status === "open").length,
          unblock: allTickets.filter((t) => t.category === "unblock").length,
          awaiting: allTickets.filter((t) => t.status === "awaiting-user-reply")
            .length,
          addressed: allTickets.filter(
            (t) => t.responses && t.responses.length > 0
          ).length,
          closed: allTickets.filter((t) => t.status === "closed").length,
        };

        setTicketStats(stats);

        // Filter tickets based on active filter
        let filteredTickets = allTickets;

        if (activeFilter === "open") {
          filteredTickets = allTickets.filter((t) => t.status === "open");
        } else if (activeFilter === "unblock") {
          filteredTickets = allTickets.filter((t) => t.category === "unblock");
        } else if (activeFilter === "awaiting") {
          filteredTickets = allTickets.filter(
            (t) => t.status === "awaiting-user-reply"
          );
        } else if (activeFilter === "addressed") {
          filteredTickets = allTickets.filter(
            (t) => t.responses && t.responses.length > 0
          );
        } else if (activeFilter === "closed") {
          filteredTickets = allTickets.filter((t) => t.status === "closed");
        }

        setTickets(filteredTickets);
      } else {
        showToast.error(response.data.message || "Failed to load tickets");
      }
    } catch (error) {
      showToast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  // Update useEffect to refetch when filter changes
  useEffect(() => {
    fetchSupportTickets();
  }, [activeFilter]);

  // Add this function to search for users by email
  const searchUsersByEmail = async (email) => {
    if (!email) {
      showToast.error("Please provide an email to search");
      return;
    }

    try {
      setIsSearchingUsers(true);
      // Get email from the ticket if not provided
      if (!email && selectedTicket?.guestEmail) {
        email = selectedTicket.guestEmail;
      }

      // Extract email from the message if still not found
      if (!email && selectedTicket?.message) {
        // Simple regex to extract email from message
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const match = selectedTicket.message.match(emailRegex);
        if (match) {
          email = match[0];
          setGuestEmail(email);
        }
      }

      if (!email) {
        showToast.error("No email found to search with");
        setIsSearchingUsers(false);
        return;
      }

      // Call the API to search for users by email
      const response = await adminApi.searchUsers({ email });

      if (response.data && response.data.success) {
        const users = response.data.data || [];
        setMatchedUsers(users);

        if (users.length === 0) {
          showToast.info("No users found with this email");
        } else if (users.length === 1) {
          // Auto-select the user if only one is found
          setUserIdForUnblock(users[0]._id);
          showToast.success("User found and selected for unblocking");
        }
      } else {
        showToast.error(response.data?.message || "Failed to search users");
      }
    } catch (error) {
      showToast.error("Failed to search users. Please try again.");
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setShowFilterDropdown(false);
  };

  // Modify the handleViewTicket function to automatically search for user when opening an unblock request
  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);

    // Clear previous user search results
    setMatchedUsers([]);
    setUserIdForUnblock("");
    setUserIdInput("");

    // If this is a guest unblock request, automatically try to find the user
    if (ticket.category === "unblock" && ticket.isGuestRequest) {
      // Extract email from ticket
      const email = ticket.guestEmail || ticket.email;
      if (email) {
        setGuestEmail(email);
        // Auto-search for user with this email
        setTimeout(() => searchUsersByEmail(email), 500);
      }
    }
  };

  // Mock email notification for development
  const sendEmailNotification = async (to, subject, message, ticketId) => {
    try {
      if (import.meta.env.DEV) {
        // Development mode mock emails
        // Silent mock in production
      } else {
        // In production, this would call a real email service
        await supportApi.sendNotification(to, subject, message, ticketId);
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  // Handle respond to ticket
  const handleRespondToTicket = async (ticketId, response) => {
    if (!response || !response.trim()) {
      showToast.warning("Please enter a response");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find ticket in state
      const ticketIndex = tickets.findIndex((t) => t._id === ticketId);
      if (ticketIndex === -1) {
        showToast.error("Ticket not found");
        setIsSubmitting(false);
        return;
      }

      const ticketToUpdate = tickets[ticketIndex];

      // Call API to respond to ticket
      const result = await supportApi.respondToSupportTicket(ticketId, {
        message: response,
        status: "awaiting-user-reply",
      });

      if (result && result.data && result.data.success) {
        showToast.success("Response sent successfully");

        // Update local state with response
        if (result.data.ticket) {
          const updatedTickets = [...tickets];
          updatedTickets[ticketIndex] = result.data.ticket;
          setTickets(updatedTickets);
          setSelectedTicket(result.data.ticket);
        } else {
          // If no ticket in response, refresh all tickets
          fetchSupportTickets();
        }

        // Clear response text
        setResponseText("");

        // Mock sending email notification
        const userEmail = ticketToUpdate.email || "user@example.com";
        await sendEmailNotification(
          userEmail,
          `Response to your support ticket #${ticketId.substring(0, 8)}`,
          `Our support team has responded to your ticket.\n\n${response}\n\nPlease log in to your account to view the full response.`,
          ticketId
        );
      } else {
        showToast.error(result?.data?.message || "Failed to send response");
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        showToast.error(
          "Permission denied. You cannot respond to this ticket."
        );
      } else if (error.response && error.response.status === 401) {
        showToast.error("Your session has expired. Please log in again.");
        logout();
      } else {
        showToast.error("Error sending response. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle unblocking a user
  const handleUnblockUser = async (userId) => {
    try {
      setIsSubmitting(true);

      // If no userId is provided, check if we have one in state
      if (!userId && userIdForUnblock) {
        userId = userIdForUnblock;
      }

      // If still no userId, show an error
      if (!userId) {
        showToast.error("No user ID provided for unblocking");
        setIsSubmitting(false);
        return;
      }

      // Call the API to unblock the user
      const unblockResponse = await adminApi.unblockUser(userId);

      if (unblockResponse.data && unblockResponse.data.success) {
        // Mark the ticket as closed with API
        const ticketResponse = await supportApi.updateSupportTicket(
          selectedTicket._id,
          {
            status: "closed",
            response: responseText || "Your account has been unblocked.",
          }
        );

        if (ticketResponse.data && ticketResponse.data.success) {
          // Send email notification to the user
          let emailSent = false;
          try {
            // Get email from the ticket
            const email =
              selectedTicket.guestEmail ||
              (selectedTicket.userId && selectedTicket.userId.email);

            if (email) {
              // Send email notification about the unblock
              const emailResponse = await supportApi.sendTicketResponseEmail({
                to: email,
                subject: "Your Account Has Been Unblocked",
                message:
                  responseText ||
                  "Your account has been unblocked. You can now log in to your account.",
                ticketId: selectedTicket._id,
                ticketType: "unblock",
                status: "approved",
              });

              // Check if email was actually sent or simulated in dev mode
              emailSent =
                emailResponse.data &&
                emailResponse.data.success &&
                (emailResponse.data.emailSent || emailResponse.data.mock);

              if (emailResponse.data && emailResponse.data.mock) {
                showToast.info("Email notification simulated (dev mode)");
              }
            }
          } catch (emailError) {
            // Continue with the workflow even if email fails
            emailSent = false;
          }

          // Update the tickets in local state
          fetchSupportTickets(); // Refresh all tickets from the API

          if (emailSent) {
            showToast.success("User has been unblocked and notification sent");
          } else {
            showToast.success(
              "User has been unblocked, but notification email could not be sent"
            );
          }

          // Clear user ID state and close the modal
          setUserIdForUnblock("");
          setUserIdInput("");
          setShowTicketModal(false);
        } else {
          showToast.warning("User unblocked but ticket could not be updated");
        }
      } else {
        showToast.error(
          unblockResponse.data?.message || "Failed to unblock user"
        );
      }
    } catch (error) {
      showToast.error("Failed to unblock user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deny unblock request
  const handleDenyUnblockRequest = async () => {
    if (!selectedTicket) {
      showToast.error("No ticket selected");
      return;
    }

    const userId = selectedTicket.userId || userIdForUnblock;
    if (!userId) {
      showToast.error("No user ID associated with this ticket");
      return;
    }

    try {
      // Update ticket to closed status
      const result = await supportApi.updateSupportTicket(selectedTicket._id, {
        status: "closed",
        adminResponse: `Unblock request denied.`,
      });

      if (result && result.data && result.data.success) {
        showToast.success("Unblock request denied and ticket closed");

        // Update local state
        const updatedTickets = tickets.map((ticket) =>
          ticket._id === selectedTicket._id
            ? { ...ticket, status: "closed" }
            : ticket
        );
        setTickets(updatedTickets);

        // Notify user
        if (selectedTicket.email) {
          await sendEmailNotification(
            selectedTicket.email,
            "Your account unblock request has been denied",
            "We have reviewed your request to unblock your account, but we were unable to grant your request at this time. For more information, please reply to this ticket.",
            selectedTicket._id
          );
        }

        // Refresh tickets
        fetchSupportTickets();
      } else {
        showToast.error("Failed to process denial");
      }
    } catch (error) {
      showToast.error("Error processing denial. Please try again.");
    }
  };

  // Helper function to render the appropriate action button based on ticket status
  const renderActionButton = (ticket) => {
    // If user is blocked, show unblock button
    if (ticket.user && ticket.user.status === "blocked") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUnblockUser(ticket.user._id);
          }}
          className="rounded px-3 py-1 text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 min-w-[100px]">
          Unblock User
        </button>
      );
    }

    // Always show view details button
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleViewTicket(ticket);
        }}
        className="rounded px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 min-w-[100px]">
        View Details
      </button>
    );
  };

  // Show loading state
  if (loading) {
    return <Loader type="table" />;
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600">
            Manage support requests and user inquiries
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
            <span>
              {activeFilter === "all"
                ? "All Tickets"
                : activeFilter === "open"
                ? "Open Tickets"
                : activeFilter === "unblock"
                ? "Unblock Requests"
                : activeFilter === "awaiting"
                ? "Awaiting Reply"
                : activeFilter === "addressed"
                ? "Addressed by Admin"
                : "Closed Tickets"}
            </span>
            <svg
              className="ml-2 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {showFilterDropdown && (
            <div className="origin-top-right absolute right-0 mt-2 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 divide-y divide-gray-100">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <button
                  onClick={() => handleFilterChange("all")}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    activeFilter === "all"
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}>
                  All Tickets ({ticketStats.total})
                </button>
                <button
                  onClick={() => handleFilterChange("open")}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    activeFilter === "open"
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}>
                  Open Tickets ({ticketStats.open})
                </button>
                <button
                  onClick={() => handleFilterChange("unblock")}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    activeFilter === "unblock"
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}>
                  Unblock Requests ({ticketStats.unblock})
                </button>
                <button
                  onClick={() => handleFilterChange("awaiting")}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    activeFilter === "awaiting"
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}>
                  Awaiting Reply ({ticketStats.awaiting})
                </button>
                <button
                  onClick={() => handleFilterChange("addressed")}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    activeFilter === "addressed"
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}>
                  Addressed by Admin ({ticketStats.addressed})
                </button>
                <button
                  onClick={() => handleFilterChange("closed")}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    activeFilter === "closed"
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}>
                  Closed Tickets ({ticketStats.closed})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {tickets.length > 0 ? (
        <div
          className={`rounded-xl ${theme?.card || "bg-white"} border ${
            theme?.border || "border-gray-200"
          } overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewTicket(ticket)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono">
                        {ticket._id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.isGuestRequest ? (
                            <span className="flex items-center">
                              <span className="bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full text-xs mr-2">
                                Guest
                              </span>
                              {ticket.email || ticket.guestEmail}
                            </span>
                          ) : (
                            ticket.email ||
                            (ticket.userId && ticket.userId.email)
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.category === "unblock"
                            ? "bg-orange-100 text-orange-800"
                            : ticket.category === "technical"
                            ? "bg-blue-100 text-blue-800"
                            : ticket.category === "reactivate"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.status === "open"
                            ? "bg-yellow-100 text-yellow-800"
                            : ticket.status === "closed"
                            ? "bg-red-100 text-red-800"
                            : ticket.status === "awaiting-user-reply"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                        {ticket.status.replace(/-/g, " ")}
                      </span>
                      {ticket.responses && ticket.responses.length > 0 && (
                        <span className="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Addressed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTicket(ticket);
                        }}
                        className="rounded px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-xl ${theme?.card || "bg-white"} border ${
            theme?.border || "border-gray-200"
          } p-6 text-center`}>
          <div className="flex flex-col items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              No support tickets found
            </h3>
            <p className="text-gray-600">
              {activeFilter === "all"
                ? "There are no support tickets in the system yet."
                : activeFilter === "addressed"
                ? "No tickets have been addressed by admins yet."
                : `No ${activeFilter.replace(/-/g, " ")} tickets found.`}
            </p>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="bg-black rounded-t-xl p-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">
                {selectedTicket.category === "unblock"
                  ? "Account Unblock Request"
                  : selectedTicket.isGuestRequest
                  ? "Guest Support Request"
                  : "Support Ticket"}
              </h3>
              <button
                onClick={() => {
                  setShowTicketModal(false);
                  setSelectedTicket(null);
                  setResponseText("");
                }}
                className="text-white hover:text-gray-300">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-grow">
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-600">From:</span>
                      <span className="font-medium">
                        {selectedTicket.isGuestRequest
                          ? "Blocked User (Guest Mode)"
                          : selectedTicket.email ||
                            (selectedTicket.userId &&
                              selectedTicket.userId.email) ||
                            "User"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium capitalize">
                        {selectedTicket.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`mt-2 sm:mt-0 px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      selectedTicket.status === "open"
                        ? "bg-yellow-100 text-yellow-800"
                        : selectedTicket.status === "closed"
                        ? "bg-red-100 text-red-800"
                        : selectedTicket.status === "awaiting-user-reply"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                    {selectedTicket.status.replace(/-/g, " ")}
                  </span>
                </div>
              </div>

              {/* Automated Process Info - for account reactivation */}
              {selectedTicket.category === "reactivate" && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-500 mt-0.5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <h5 className="font-medium text-blue-700 mb-1">
                        Automated Process
                      </h5>
                      <p className="text-sm text-blue-700">
                        Account reactivation is handled automatically through
                        OTP verification. No admin action is required. Users can
                        reactivate their accounts by selecting "Reactivate
                        Account" on the login page and following the OTP
                        verification process.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* User information for blocked user */}
              {selectedTicket.user &&
                selectedTicket.user.status === "blocked" && (
                  <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
                    <h5 className="font-medium mb-2 text-red-700">
                      Blocked User Account:
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-600">User ID:</span>
                        <span className="ml-2 font-mono text-sm">
                          {selectedTicket.user._id}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 text-red-600 font-medium">
                          Blocked
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() =>
                          handleUnblockUser(selectedTicket.user._id)
                        }
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50">
                        {isSubmitting
                          ? "Processing..."
                          : "Unblock User & Send Notification"}
                      </button>
                      <p className="mt-2 text-xs text-gray-600">
                        This will unblock the user's account and send them an
                        email notification.
                      </p>
                    </div>
                  </div>
                )}

              {/* For guest unblock requests, improve the workflow with user search */}
              {selectedTicket.category === "unblock" &&
                selectedTicket.isGuestRequest && (
                  <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h5 className="font-medium text-orange-700 mb-2">
                      Blocked User Unblock Request
                    </h5>

                    {/* Show email from request */}
                    {guestEmail ? (
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">
                            Email from request:
                          </span>{" "}
                          {guestEmail}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => searchUsersByEmail(guestEmail)}
                            disabled={isSearchingUsers}
                            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center">
                            {isSearchingUsers ? "Searching..." : "Search User"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mb-3">
                        <input
                          type="email"
                          placeholder="Enter email to search user"
                          className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-black"
                          value={userIdInput}
                          onChange={(e) => setUserIdInput(e.target.value)}
                        />
                        <button
                          onClick={() => {
                            searchUsersByEmail(userIdInput);
                          }}
                          disabled={isSearchingUsers || !userIdInput.trim()}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                          {isSearchingUsers ? "Searching..." : "Search"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              {/* Original message */}
              <div className="mb-4">
                <h5 className="font-medium mb-2">Support Request:</h5>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 whitespace-pre-wrap text-sm">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Previous responses */}
              {selectedTicket.responses &&
                selectedTicket.responses.length > 0 && (
                  <div className="mb-6">
                    <h5 className="font-medium mb-2">Previous Responses:</h5>
                    <div className="space-y-4">
                      {selectedTicket.responses.map((response, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border ${
                            response.responder === "admin" ||
                            response.responseBy === "admin"
                              ? "bg-green-50 border-green-100 ml-6"
                              : "bg-gray-50 border-gray-200 mr-6"
                          }`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">
                              {response.responder === "admin" ||
                              response.responseBy === "admin"
                                ? "Support Team"
                                : "User"}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(response.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap">
                            {response.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Response form if ticket needs admin response */}
              {(selectedTicket.status === "open" ||
                selectedTicket.status === "awaiting-support-reply") &&
                selectedTicket.category !== "reactivate" && (
                  <div className="mt-6">
                    <h5 className="font-medium mb-2">
                      {selectedTicket.category === "unblock"
                        ? "Respond to Unblocking Request:"
                        : "Respond to Ticket:"}
                    </h5>

                    {/* Show the note about already unblocked users only if this is an unblock request from a registered user who is not blocked */}
                    {selectedTicket.category === "unblock" &&
                      selectedTicket.userId &&
                      selectedTicket.userId.status &&
                      selectedTicket.userId.status !== "blocked" && (
                        <div className="mb-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-700">
                            <strong>Note:</strong> This user has requested
                            account unblocking but their account appears to be
                            already active or was unblocked by another admin.
                            You can still send them a response.
                          </p>
                        </div>
                      )}

                    {/* If this is a guest unblock request, show appropriate guidance */}
                    {selectedTicket.category === "unblock" &&
                      selectedTicket.isGuestRequest && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-700">
                            <strong>Note:</strong> This is an unblock request
                            submitted by a guest. You'll need to locate the user
                            account manually to process the unblock.
                          </p>
                        </div>
                      )}

                    {selectedTicket.category === "unblock" ? (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Instructions:</strong> For unblocking
                          requests, please provide a clear explanation:
                        </p>
                        <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
                          <li>
                            If denying the request, clearly explain why the
                            account will remain blocked
                          </li>
                          <li>
                            If granting the request conditionally, explain any
                            requirements or warnings
                          </li>
                          <li>Use a professional and helpful tone</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">
                          <strong>Note:</strong> A standard response template
                          will be included with your message.
                        </p>
                      </div>
                    )}

                    {/* Quick reply buttons */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">
                        Quick replies:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTicket.category === "unblock" ? (
                          <>
                            <button
                              onClick={() =>
                                applyPredefinedResponse(
                                  "unblockSuccess",
                                  selectedTicket._id
                                )
                              }
                              className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                              ✓ Approved Response
                            </button>
                            <button
                              onClick={() =>
                                applyPredefinedResponse(
                                  "unblockDenied",
                                  selectedTicket._id
                                )
                              }
                              className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                              ✗ Denied Response
                            </button>
                            <button
                              onClick={() => setResponseText("")}
                              className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                              Clear
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                applyPredefinedResponse(
                                  "generalThankYou",
                                  selectedTicket._id
                                )
                              }
                              className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                              Thank You Response
                            </button>
                            <button
                              onClick={() =>
                                applyPredefinedResponse(
                                  "accountHelp",
                                  selectedTicket._id
                                )
                              }
                              className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
                              Account Help Response
                            </button>
                            <button
                              onClick={() => setResponseText("")}
                              className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                              Clear
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                      rows={5}
                      placeholder={
                        selectedTicket.category === "unblock"
                          ? "Explain why the account is being unblocked or why the request is denied..."
                          : "Type your response to this support request..."
                      }></textarea>
                  </div>
                )}

              {/* Message for tickets that don't need a response */}
              {selectedTicket.status === "closed" && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-center text-gray-600">
                    This ticket has been closed. No further action is required.
                  </p>
                </div>
              )}

              {/* Display matched users in a simplified format */}
              {matchedUsers.length > 0 && (
                <div className="mt-3">
                  <h6 className="text-sm font-medium text-gray-700 mb-2">
                    Matched Users:
                  </h6>
                  <div className="border border-gray-200 rounded-lg">
                    {matchedUsers.map((user) => (
                      <div
                        key={user._id}
                        className="p-3 border-b border-gray-200 last:border-b-0 flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {user.name || user.username}
                          </p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            setUserIdForUnblock(user._id);
                            showToast.success("User selected for unblocking");
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show selected user info in simplified format */}
              {userIdForUnblock && matchedUsers.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700">
                    Ready to unblock user:{" "}
                    <strong>
                      {
                        matchedUsers.find((u) => u._id === userIdForUnblock)
                          ?.email
                      }
                    </strong>
                  </p>
                </div>
              )}
            </div>

            {/* Fixed footer for actions if needed */}
            {(selectedTicket.status === "open" ||
              selectedTicket.status === "awaiting-support-reply") && (
              <div className="p-4 border-t border-gray-200">
                {selectedTicket.category === "unblock" ? (
                  <div className="flex flex-col space-y-3">
                    {/* Add separate buttons for approval and denial */}
                    {responseText.includes(
                      predefinedResponses.unblockDenied.substring(0, 30)
                    ) ? (
                      <button
                        onClick={handleDenyUnblockRequest}
                        disabled={isSubmitting || !responseText.trim()}
                        className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50">
                        {isSubmitting
                          ? "Processing..."
                          : "Send Denial & Close Ticket"}
                      </button>
                    ) : userIdForUnblock ? (
                      <button
                        onClick={() => handleUnblockUser(userIdForUnblock)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50">
                        {isSubmitting
                          ? "Processing..."
                          : "Unblock User & Close Ticket"}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (responseText.trim()) {
                            handleRespondToTicket(
                              selectedTicket._id,
                              responseText
                            );
                          } else {
                            showToast.error(
                              "Please enter a response or select a user to unblock"
                            );
                          }
                        }}
                        disabled={isSubmitting || !responseText.trim()}
                        className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50">
                        {isSubmitting
                          ? "Processing..."
                          : "Send Response & Close Ticket"}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (responseText.trim()) {
                        handleRespondToTicket(selectedTicket._id, responseText);
                      }
                    }}
                    disabled={isSubmitting || !responseText.trim()}
                    className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50">
                    {isSubmitting
                      ? "Processing..."
                      : "Send Response & Close Ticket"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
