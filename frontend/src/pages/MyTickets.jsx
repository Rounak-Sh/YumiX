import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUserTickets, getTicketDetails } from "../services/supportService";
import { showToast } from "@/utils/toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const MyTickets = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(null);

  // Fetch tickets when component mounts or filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets(activeFilter);
    } else {
      navigate("/login");
    }
  }, [isAuthenticated, activeFilter]);

  // Fetch tickets from API
  const fetchTickets = async (status = "all", page = 1) => {
    setLoading(true);
    setError(null);
    setServerError(null);

    try {
      const response = await getUserTickets(status, page, 100); // Get all tickets since we don't need pagination
      if (response.success) {
        setTickets(response.data || []);
      } else {
        setError(response.message || "Failed to load tickets");
        showToast.error(response.message || "Failed to load tickets");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setServerError(
        "Cannot connect to server. Please check your internet connection."
      );
      showToast.error("Failed to load your support tickets");
    } finally {
      setLoading(false);
    }
  };

  // Retry loading if server error
  const handleRetryLoad = () => {
    fetchTickets(activeFilter);
  };

  // Fetch ticket details
  const fetchTicketDetails = async (ticketId) => {
    setLoadingDetails(true);
    try {
      const response = await getTicketDetails(ticketId);
      if (response.success) {
        setTicketDetails(response.data);
      } else {
        showToast.error(response.message || "Failed to load ticket details");
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      showToast.error(error.message || "Failed to load ticket details");
    } finally {
      setLoadingDetails(false);
    }
  };

  // View ticket details
  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    fetchTicketDetails(ticket._id);
  };

  // Close ticket detail modal
  const handleCloseDetails = () => {
    setSelectedTicket(null);
    setTicketDetails(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      case "awaiting-user-reply":
        return "bg-blue-100 text-blue-800";
      case "awaiting-support-reply":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br mt-8 from-[#FFCF50]/10 to-[#23486A]/10 relative">
      <div className="container mx-auto px-4 py-8">
        {/* Header with yellow underline */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            <span className="border-b-4 border-[#FFCF50] pb-1">
              My Support Tickets
            </span>
          </h1>
          <div className="relative">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="appearance-none bg-[#FFCF50] text-[#23486A] font-bold px-4 py-2 pr-8 rounded-lg cursor-pointer hover:bg-[#e9b64a] ">
              <option value="all">All Tickets</option>
              <option value="open">Open</option>
              <option value="awaiting-user-reply">Awaiting Your Reply</option>
              <option value="awaiting-support-reply">Awaiting Support</option>
              <option value="closed">Closed</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#23486A]">
              <i className="fa-solid fa-chevron-down"></i>
            </div>
          </div>
        </div>

        {serverError ? (
          <div className="bg-red-500/10 rounded-xl p-6 text-center">
            <p className="text-red-500 text-lg mb-4">
              Cannot connect to server. Please check your internet connection.
            </p>
            <button
              onClick={handleRetryLoad}
              className="mt-2 px-4 py-2 bg-[#FFCF50] text-[#23486A] rounded-lg flex items-center gap-2 mx-auto">
              <i className="fa-solid fa-arrow-rotate-right"></i>
              Try Again
            </button>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-6 bg-red-100 rounded-xl">
            <p className="text-lg">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>
              {error}
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFCF50]"></div>
          </div>
        ) : tickets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              <div
                key={ticket._id}
                className={`bg-white dark:bg-[#192339] border border-gray-200 dark:border-[#2A3B5C]/30 shadow-md hover:shadow-lg rounded-xl overflow-hidden transition-all duration-300 cursor-pointer`}
                onClick={() => handleViewTicket(ticket)}>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          ticket.status
                        )}`}>
                        {ticket.status.replace(/-/g, " ")}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 dark:text-gray-400">
                      #{ticket._id.substring(0, 8)}
                    </span>
                  </div>

                  <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-2">
                    {ticket.subject}
                  </h3>

                  <div className="text-sm mb-3 text-gray-600 dark:text-gray-300">
                    <div className="flex items-center mb-1">
                      <span className="capitalize">
                        <i className="fa-solid fa-tag mr-2 text-gray-400 dark:text-[#FFCF50]/50"></i>
                        {ticket.category}
                      </span>
                    </div>

                    <div className="line-clamp-2 text-gray-500 dark:text-gray-400 mt-2">
                      {ticket.message.substring(0, 100)}
                      {ticket.message.length > 100 ? "..." : ""}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewTicket(ticket);
                    }}
                    className="w-full mt-3 text-[#23486A] hover:text-white font-medium text-sm flex items-center justify-center py-2 border-2 border-[#23486A] rounded-lg hover:bg-[#23486A] transition-all dark:text-[#FFCF50] dark:border-[#FFCF50] dark:hover:bg-[#FFCF50] dark:hover:text-[#23486A]">
                    View Details
                    <i className="fa-solid fa-arrow-right ml-2"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-16 bg-white/10 dark:bg-[#192339]/50 rounded-xl border border-gray-200 dark:border-[#2A3B5C]/30">
            <div className="text-gray-400 text-8xl mb-6">
              <i className="fa-regular fa-envelope"></i>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
              No Support Tickets Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {activeFilter === "all"
                ? "You haven't submitted any support tickets yet."
                : `You don't have any ${activeFilter.replace(
                    /-/g,
                    " "
                  )} tickets.`}
            </p>
            <Link
              to="/support"
              className="px-6 py-3 bg-[#FFCF50] hover:bg-[#FFB81C] text-[#23486A] font-bold rounded-lg">
              Create Support Request
            </Link>
          </div>
        )}

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] overflow-hidden bg-black bg-opacity-70 flex items-start justify-center pt-24">
            <div
              className={`w-full max-w-3xl rounded-xl shadow-2xl ${
                isDarkMode
                  ? "bg-[#192339] border border-[#2A3B5C]/30"
                  : "bg-white border border-gray-200"
              } max-h-[80vh] flex flex-col`}>
              {/* Modal Header */}
              <div
                className={`sticky top-0 z-10 p-4 border-b ${
                  isDarkMode
                    ? "border-gray-700 bg-[#192339]"
                    : "border-gray-200 bg-white"
                } flex justify-between items-center rounded-t-xl`}>
                <h2
                  className={`text-xl font-semibold ${
                    isDarkMode ? "text-[#FFCF50]" : "text-[#23486A]"
                  }`}>
                  Ticket: #{selectedTicket._id.substring(0, 8)}
                </h2>
                <button
                  onClick={handleCloseDetails}
                  className={`rounded-full p-1.5 ${
                    isDarkMode
                      ? "text-[#FFCF50] hover:text-white hover:bg-[#FFCF50]/20"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  } transition-colors`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
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

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loadingDetails ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCF50]"></div>
                  </div>
                ) : ticketDetails ? (
                  <div className="space-y-6">
                    {/* Ticket Information */}
                    <div
                      className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg ${
                        isDarkMode ? "bg-[#1a3654]" : "bg-gray-50"
                      }`}>
                      <div>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-[#FFCF50]/80" : "text-gray-500"
                          }`}>
                          Ticket ID
                        </p>
                        <p
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}>
                          {selectedTicket._id}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-[#FFCF50]/80" : "text-gray-500"
                          }`}>
                          Status
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            selectedTicket.status
                          )}`}>
                          {selectedTicket.status.replace(/-/g, " ")}
                        </span>
                      </div>
                      <div>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-[#FFCF50]/80" : "text-gray-500"
                          }`}>
                          Category
                        </p>
                        <p
                          className={`font-medium capitalize ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}>
                          {selectedTicket.category}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-[#FFCF50]/80" : "text-gray-500"
                          }`}>
                          Created
                        </p>
                        <p
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}>
                          {formatDate(selectedTicket.createdAt)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-[#FFCF50]/80" : "text-gray-500"
                          }`}>
                          Subject
                        </p>
                        <p
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}>
                          {selectedTicket.subject}
                        </p>
                      </div>
                    </div>

                    {/* Original Message */}
                    <div>
                      <h3
                        className={`font-semibold mb-2 ${
                          isDarkMode ? "text-[#FFCF50]" : "text-[#23486A]"
                        }`}>
                        Original Message
                      </h3>
                      <div
                        className={`p-4 rounded-lg whitespace-pre-wrap ${
                          isDarkMode
                            ? "bg-[#1a3654] text-white"
                            : "bg-gray-50 text-gray-800"
                        }`}>
                        {selectedTicket.message}
                      </div>
                    </div>

                    {/* Message History */}
                    {ticketDetails.messages &&
                    ticketDetails.messages.length > 0 ? (
                      <div>
                        <h3
                          className={`font-semibold mb-2 ${
                            isDarkMode ? "text-[#FFCF50]" : "text-[#23486A]"
                          }`}>
                          Message History
                        </h3>
                        <div className="space-y-4">
                          {ticketDetails.messages.map((message, index) => (
                            <div
                              key={index}
                              className={`p-4 rounded-lg ${
                                message.senderType === "admin"
                                  ? isDarkMode
                                    ? "bg-[#FFCF50]/20 border border-[#FFCF50]/30"
                                    : "bg-blue-50 border-blue-100"
                                  : isDarkMode
                                  ? "bg-[#1a3654] border border-[#FFCF50]/10"
                                  : "bg-gray-50 border-gray-100"
                              }`}>
                              <div className="flex justify-between items-center mb-2">
                                <span
                                  className={`font-medium ${
                                    isDarkMode
                                      ? message.senderType === "admin"
                                        ? "text-[#FFCF50]"
                                        : "text-white"
                                      : ""
                                  }`}>
                                  {message.senderType === "admin"
                                    ? "Support Team"
                                    : "You"}
                                </span>
                                <span
                                  className={`text-sm ${
                                    isDarkMode
                                      ? "text-white/70"
                                      : "text-gray-500"
                                  }`}>
                                  {formatDate(message.createdAt)}
                                </span>
                              </div>
                              <p
                                className={`whitespace-pre-wrap ${
                                  isDarkMode ? "text-white" : ""
                                }`}>
                                {message.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p
                        className={`${
                          isDarkMode ? "text-white/70" : "text-gray-500"
                        }`}>
                        No additional messages for this ticket.
                      </p>
                    )}

                    {/* Need to respond section - Replaced reply form */}
                    {selectedTicket.status !== "closed" && (
                      <div className="mt-6">
                        <div
                          className={`p-4 rounded-lg border ${
                            isDarkMode
                              ? "bg-[#FFCF50]/10 border-[#FFCF50]/30 text-white"
                              : "bg-yellow-50 border-yellow-100 text-[#23486A]"
                          }`}>
                          <div className="flex items-start">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-5 w-5 mr-2 mt-0.5 ${
                                isDarkMode
                                  ? "text-[#FFCF50]"
                                  : "text-yellow-500"
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div>
                              <p className="font-medium mb-1">
                                Need to respond to this ticket?
                              </p>
                              <p className="text-sm opacity-90">
                                To respond to this ticket, please create a new
                                support request referencing this ticket ID: #
                                {selectedTicket._id.substring(0, 8)}
                              </p>
                              <Link
                                to="/support"
                                className={`mt-3 inline-block px-4 py-2 rounded-lg font-medium ${
                                  isDarkMode
                                    ? "bg-[#FFCF50] text-[#23486A] hover:bg-[#FFD76B]"
                                    : "bg-[#FFCF50] text-[#23486A] hover:bg-[#FFD76B]"
                                } transition-colors`}>
                                Create New Ticket
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Closed Ticket Message */}
                    {selectedTicket.status === "closed" && (
                      <div
                        className={`mt-6 p-4 rounded-lg ${
                          isDarkMode
                            ? "bg-white/5 border border-[#FFCF50]/30 text-white"
                            : "bg-red-50 border border-red-100 text-red-600"
                        }`}>
                        <p className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-5 w-5 mr-2 ${
                              isDarkMode ? "text-[#FFCF50]" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          This ticket is closed. If you need further assistance,
                          please create a new support ticket.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`text-center py-12 ${
                      isDarkMode ? "text-white/70" : "text-gray-500"
                    }`}>
                    Failed to load ticket details. Please try again.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
