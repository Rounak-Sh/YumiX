import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUserTickets, getTicketDetails } from "../services/supportService";
import ticketStatusService from "../services/ticketStatusService";
import { showToast } from "../utils/toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// Custom scrollbar styles for modal
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #FFCF50;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #ddb344;
  }
`;

const CheckTicketStatus = () => {
  // Authentication and theme hooks
  const { isAuthenticated, user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // State for guest email form
  const [email, setEmail] = useState(queryParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [error, setError] = useState(null);

  // State for auth user tickets (similar to MyTickets component)
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  // Check for email in URL params on load for guest users
  useEffect(() => {
    console.log(
      "CheckTicketStatus component mounted - pathname:",
      location.pathname
    );

    if (!isAuthenticated) {
      const autoEmail = queryParams.get("email");
      if (autoEmail) {
        setEmail(autoEmail);
        handleCheckTicket(autoEmail);
      }
    }
  }, []);

  // For authenticated users, fetch their tickets automatically
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserTickets();
    }
  }, [isAuthenticated, activeFilter]);

  // For guest users - check tickets by email
  const handleCheckTicket = async (emailToCheck) => {
    setLoading(true);
    setError(null);
    setTicketData(null);

    try {
      const response = await ticketStatusService.checkTicketByEmail(
        emailToCheck || email
      );
      if (response.success) {
        setTicketData(response.data);
      } else {
        setError(response.message || "No support tickets found");
        showToast.error(response.message || "No support tickets found");
      }
    } catch (error) {
      console.error("Error checking ticket:", error);
      setError(error.message || "Failed to check ticket status");
      showToast.error(error.message || "Failed to check ticket status");
    } finally {
      setLoading(false);
    }
  };

  // For authenticated users - fetch their tickets
  const fetchUserTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await getUserTickets(activeFilter);
      if (response.success) {
        setTickets(response.data || []);
      } else {
        showToast.error(response.message || "Failed to load tickets");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      showToast.error(error.message || "Failed to load your support tickets");
    } finally {
      setLoadingTickets(false);
    }
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

  // Handle form submission for guest email check
  const handleSubmit = (e) => {
    e.preventDefault();
    handleCheckTicket();
  };

  // Helper function to format date
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

  // Helper function to get status badge color
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
    <div
      className={`min-h-screen ${
        isDarkMode ? "bg-[#23486A]/75" : "bg-[#f0f0f0]/60"
      } py-10 mt-8 rounded-xl`}>
      <style>{customScrollbarStyles}</style>
      <div className="max-w-[90%] mx-auto">
        <h1
          className={`text-4xl font-bold ${
            isDarkMode ? "text-white" : "text-[#23486A]"
          } mb-2`}>
          My Support Tickets
        </h1>
        <div className="h-1 w-32 bg-[#FFCF50] mb-6"></div>

        {isAuthenticated ? (
          // Authenticated User View
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <p className={`${isDarkMode ? "text-white" : "text-[#23486A]"}`}>
                View and manage your support tickets
              </p>
              <Link
                to="/support"
                className="mt-3 md:mt-0 inline-block px-4 py-2 bg-[#FFCF50] hover:bg-[#FFD76B] text-[#23486A] font-medium rounded-lg transition-colors">
                Create New Support Request
              </Link>
            </div>

            {/* Filters */}
            <div
              className={`flex mb-6 overflow-x-auto border-b ${
                isDarkMode ? "border-gray-600" : "border-gray-200"
              }`}>
              <button
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeFilter === "all"
                    ? "border-[#FFCF50] text-[#FFCF50]"
                    : `border-transparent ${
                        isDarkMode
                          ? "text-gray-300 hover:text-[#FFCF50]"
                          : "text-gray-700 hover:text-[#23486A]"
                      }`
                }`}
                onClick={() => setActiveFilter("all")}>
                All Tickets
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeFilter === "open"
                    ? "border-[#FFCF50] text-[#FFCF50]"
                    : `border-transparent ${
                        isDarkMode
                          ? "text-gray-300 hover:text-[#FFCF50]"
                          : "text-gray-700 hover:text-[#23486A]"
                      }`
                }`}
                onClick={() => setActiveFilter("open")}>
                Open
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeFilter === "awaiting-user-reply"
                    ? "border-[#FFCF50] text-[#FFCF50]"
                    : `border-transparent ${
                        isDarkMode
                          ? "text-gray-300 hover:text-[#FFCF50]"
                          : "text-gray-700 hover:text-[#23486A]"
                      }`
                }`}
                onClick={() => setActiveFilter("awaiting-user-reply")}>
                Awaiting Your Reply
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeFilter === "closed"
                    ? "border-[#FFCF50] text-[#FFCF50]"
                    : `border-transparent ${
                        isDarkMode
                          ? "text-gray-300 hover:text-[#FFCF50]"
                          : "text-gray-700 hover:text-[#23486A]"
                      }`
                }`}
                onClick={() => setActiveFilter("closed")}>
                Closed
              </button>
            </div>

            {/* Tickets List */}
            {loadingTickets ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCF50]"></div>
              </div>
            ) : tickets.length > 0 ? (
              <div className="rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead
                    className={`${isDarkMode ? "bg-[#1A3A5F]" : "bg-gray-50"}`}>
                    <tr>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-500"
                        } uppercase tracking-wider`}>
                        Ticket ID
                      </th>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-500"
                        } uppercase tracking-wider`}>
                        Subject
                      </th>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-500"
                        } uppercase tracking-wider`}>
                        Status
                      </th>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-500"
                        } uppercase tracking-wider`}>
                        Created
                      </th>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium ${
                          isDarkMode ? "text-gray-200" : "text-gray-600"
                        } uppercase tracking-wider`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      isDarkMode ? "divide-gray-700" : "divide-gray-200"
                    }`}>
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket._id}
                        className={isDarkMode ? "bg-[#23486A]" : "bg-white"}>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-900"
                          }`}>
                          {ticket._id}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-900"
                          }`}>
                          {ticket.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              ticket.status
                            )}`}>
                            {ticket.status.replace(/-/g, " ")}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}>
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewTicket(ticket)}
                            className="text-[#FFCF50] hover:text-[#FFCF50]/80 font-medium hover:underline transition-all">
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className={`p-12 text-center rounded-lg ${
                  isDarkMode ? "bg-[#1A3A5F]" : "bg-white"
                } shadow-md`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto mb-4 text-gray-400"
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
                <h2
                  className={`text-xl font-semibold mb-2 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}>
                  No support tickets found
                </h2>
                <p
                  className={`mb-6 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                  You haven't submitted any support tickets yet.
                </p>
                <Link
                  to="/support"
                  className="inline-block px-6 py-2.5 bg-[#FFCF50] hover:bg-[#FFD76B] text-[#23486A] font-medium rounded-lg transition-colors">
                  Create Support Request
                </Link>
              </div>
            )}
          </>
        ) : (
          // Guest User View
          <>
            <p
              className={`${isDarkMode ? "text-white" : "text-gray-700"} mb-6`}>
              Enter your email address to view all your support tickets and
              their status.
            </p>

            <div
              className={`bg-[#1A3A5F] p-6 rounded-lg shadow-md mb-8 ${
                isDarkMode ? "border border-[#FFCF50]/30" : ""
              }`}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-white mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-[#23486A] text-white border border-[#FFCF50]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCF50]"
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded-lg text-[#23486A] font-medium ${
                    loading ? "bg-gray-400" : "bg-[#FFCF50] hover:bg-[#FFD76B]"
                  }`}>
                  {loading ? "Checking..." : "View My Tickets"}
                </button>
              </form>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                <p className="font-medium">{error}</p>
                <p className="mt-2 text-sm">
                  If you're having trouble finding your tickets:
                  <ul className="list-disc ml-5 mt-1">
                    <li>
                      Make sure you're using the email address you provided when
                      submitting your request
                    </li>
                    <li>
                      If you've never submitted a support request, you won't
                      have any tickets to view
                    </li>
                  </ul>
                </p>
              </div>
            )}

            {ticketData && ticketData.length > 0 ? (
              <div className="space-y-6">
                <h2
                  className={`text-xl font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}>
                  Your Support Tickets
                </h2>

                {ticketData.map((ticket, index) => (
                  <div
                    key={index}
                    className={`${
                      isDarkMode
                        ? "bg-[#1A3A5F] border border-[#FFCF50]/30"
                        : "bg-white"
                    } rounded-lg shadow-md p-6`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}>
                          Ticket ID
                        </p>
                        <p
                          className={`font-medium ${
                            isDarkMode ? "text-white" : ""
                          }`}>
                          {ticket._id}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}>
                          Status
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            ticket.status
                          )}`}>
                          {ticket.status.replace(/-/g, " ")}
                        </span>
                      </div>
                      <div>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}>
                          Category
                        </p>
                        <p
                          className={`font-medium capitalize ${
                            isDarkMode ? "text-white" : ""
                          }`}>
                          {ticket.category}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}>
                          Created
                        </p>
                        <p
                          className={`font-medium ${
                            isDarkMode ? "text-white" : ""
                          }`}>
                          {formatDate(ticket.createdAt)}
                        </p>
                      </div>
                      {ticket.subject && (
                        <div className="col-span-2">
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}>
                            Subject
                          </p>
                          <p
                            className={`font-medium ${
                              isDarkMode ? "text-white" : ""
                            }`}>
                            {ticket.subject}
                          </p>
                        </div>
                      )}
                    </div>

                    <h3
                      className={`font-semibold text-lg mb-3 ${
                        isDarkMode ? "text-white" : ""
                      }`}>
                      Message History
                    </h3>

                    {ticket.responses && ticket.responses.length > 0 ? (
                      <div className="space-y-4">
                        {/* Initial message */}
                        <div
                          className={`p-4 rounded-lg ${
                            isDarkMode
                              ? "bg-[#23486A] border border-[#FFCF50]/10"
                              : "bg-gray-50 border-gray-100"
                          }`}>
                          <div className="flex justify-between items-center mb-2">
                            <span
                              className={`font-medium ${
                                isDarkMode ? "text-white" : ""
                              }`}>
                              You
                            </span>
                            <span
                              className={`text-sm ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}>
                              {formatDate(ticket.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`whitespace-pre-wrap ${
                              isDarkMode ? "text-white" : ""
                            }`}>
                            {ticket.message}
                          </p>
                        </div>

                        {/* Responses */}
                        {ticket.responses.map((response, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-lg ${
                              isDarkMode
                                ? "bg-blue-900 border-blue-800"
                                : "bg-blue-50 border-blue-100"
                            }`}>
                            <div className="flex justify-between items-center mb-2">
                              <span
                                className={`font-medium ${
                                  isDarkMode ? "text-white" : ""
                                }`}>
                                Support Team
                              </span>
                              <span
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-300" : "text-gray-500"
                                }`}>
                                {formatDate(response.createdAt)}
                              </span>
                            </div>
                            <p
                              className={`whitespace-pre-wrap ${
                                isDarkMode ? "text-white" : ""
                              }`}>
                              {response.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`p-4 rounded-lg ${
                          isDarkMode ? "bg-[#23486A]" : "bg-gray-50"
                        }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span
                            className={`font-medium ${
                              isDarkMode ? "text-white" : ""
                            }`}>
                            You
                          </span>
                          <span
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}>
                            {formatDate(ticket.createdAt)}
                          </span>
                        </div>
                        <p
                          className={`whitespace-pre-wrap ${
                            isDarkMode ? "text-white" : ""
                          }`}>
                          {ticket.message}
                        </p>

                        <div
                          className={`mt-4 p-4 rounded-lg text-sm ${
                            isDarkMode
                              ? "bg-yellow-900 text-yellow-100"
                              : "bg-yellow-50 text-yellow-700"
                          }`}>
                          <p>
                            Our team will respond to your request soon. You'll
                            receive an email notification when we reply.
                          </p>
                        </div>
                      </div>
                    )}

                    {ticket.status === "awaiting-user-reply" && (
                      <div
                        className={`mt-4 p-4 rounded-lg ${
                          isDarkMode
                            ? "bg-blue-900 text-blue-100"
                            : "bg-blue-50 text-blue-800"
                        }`}>
                        <p className="mb-2">
                          This ticket is waiting for your reply. You can respond
                          by email or create a new ticket referencing this
                          ticket ID.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : ticketData && ticketData.length === 0 ? (
              <div
                className={`${
                  isDarkMode
                    ? "bg-[#1A3A5F] border border-[#FFCF50]/30"
                    : "bg-white"
                } rounded-lg shadow-md p-6 text-center`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto text-gray-400 mb-4"
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
                <h3
                  className={`text-xl font-medium mb-2 ${
                    isDarkMode ? "text-white" : ""
                  }`}>
                  No tickets found
                </h3>
                <p
                  className={`mb-4 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}>
                  We couldn't find any support tickets associated with this
                  email address.
                </p>
                <Link
                  to="/support"
                  className="inline-block px-4 py-2 bg-[#FFCF50] hover:bg-[#FFD76B] text-[#23486A] rounded-lg">
                  Create a New Support Request
                </Link>
              </div>
            ) : null}

            <div className="mt-8 text-center">
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Need additional help?{" "}
                <Link to="/support" className="text-[#FFCF50] hover:underline">
                  Create a new support request
                </Link>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 px-4 z-[1000] mt-10">
          <div
            className={`relative w-full max-w-4xl max-h-[75vh] overflow-y-auto rounded-lg shadow-xl custom-scrollbar ${
              isDarkMode ? "bg-[#1A3A5F]" : "bg-white"
            }`}>
            {/* Modal header */}
            <div
              className={`sticky top-0 z-10 flex justify-between items-center p-4 border-b ${
                isDarkMode
                  ? "border-gray-700 bg-[#1A3A5F]"
                  : "border-gray-200 bg-white"
              }`}>
              <h3
                className={`text-xl font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}>
                Ticket: {selectedTicket._id.substring(0, 8)}
              </h3>
              <button
                onClick={handleCloseDetails}
                className={`rounded-full p-1 hover:bg-opacity-80 transition-colors ${
                  isDarkMode
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {loadingDetails ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCF50]"></div>
                </div>
              ) : ticketDetails ? (
                <div className="space-y-6">
                  {/* Ticket Information */}
                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg ${
                      isDarkMode ? "bg-[#23486A]" : "bg-gray-50"
                    }`}>
                    <div>
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
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
                          isDarkMode ? "text-gray-400" : "text-gray-500"
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
                          isDarkMode ? "text-gray-400" : "text-gray-500"
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
                          isDarkMode ? "text-gray-400" : "text-gray-500"
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
                          isDarkMode ? "text-gray-400" : "text-gray-500"
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
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}>
                      Original Message
                    </h3>
                    <div
                      className={`p-4 rounded-lg whitespace-pre-wrap ${
                        isDarkMode
                          ? "bg-[#23486A] text-white"
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
                          isDarkMode ? "text-white" : "text-gray-900"
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
                                  ? "bg-blue-900 border-blue-800"
                                  : "bg-blue-50 border-blue-100"
                                : isDarkMode
                                ? "bg-[#23486A] border-[#1a3654]"
                                : "bg-gray-50 border-gray-100"
                            }`}>
                            <div className="flex justify-between items-center mb-2">
                              <span
                                className={`font-medium ${
                                  isDarkMode ? "text-white" : ""
                                }`}>
                                {message.senderType === "admin"
                                  ? "Support Team"
                                  : "You"}
                              </span>
                              <span
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-300" : "text-gray-500"
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
                    <div
                      className={`mt-4 p-4 rounded-lg ${
                        isDarkMode
                          ? "bg-yellow-900 text-yellow-100"
                          : "bg-yellow-50 text-yellow-700"
                      }`}>
                      <p>
                        No additional messages yet. Our team will respond to
                        your request soon.
                      </p>
                    </div>
                  )}

                  {selectedTicket.status === "awaiting-user-reply" && (
                    <div
                      className={`mt-4 p-4 rounded-lg ${
                        isDarkMode
                          ? "bg-blue-900 text-blue-100"
                          : "bg-blue-50 text-blue-800"
                      }`}>
                      <p className="mb-2">
                        This ticket is waiting for your reply. You can respond
                        by email or create a new ticket referencing this ticket
                        ID.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`p-6 text-center ${
                    isDarkMode ? "text-white" : "text-gray-700"
                  }`}>
                  Failed to load ticket details. Please try again.
                </div>
              )}
            </div>
            {/* Add bottom spacing */}
            <div className="h-4"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckTicketStatus;
