import axiosInstance from "../config/axios";

const API_URL = "/api/support";

// Check ticket status without authentication
export const checkTicketStatus = async (email, referenceId) => {
  try {
    const response = await axiosInstance.post(`${API_URL}/check-status`, {
      email,
      referenceId,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Submit guest support request
export const submitGuestRequest = async (requestData) => {
  try {
    // For guest requests, we can use regular axios since no auth is needed
    const response = await axiosInstance.post(`${API_URL}/guest`, requestData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Alias for backward compatibility
export const submitGuestSupportRequest = submitGuestRequest;

// Submit support request for authenticated users
export const submitSupportRequest = async (requestData) => {
  try {
    // Debug: Check if token exists when calling this function
    const token = localStorage.getItem("token");
    console.log("Support API - Auth token exists:", !!token);
    if (token) {
      console.log(
        "Support API - Token starts with:",
        token.substring(0, 15) + "..."
      );
    }

    console.log("Support API - Request data:", JSON.stringify(requestData));

    // Make the request with the axiosInstance which should include auth headers
    // Use the submit-request endpoint instead of /tickets
    const response = await axiosInstance.post(
      `${API_URL}/submit-request`,
      requestData
    );
    console.log("Support API - Request successful:", response.status);
    console.log("Support API - Response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Support request error:", error);
    console.error("Support request error details:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      error: error.response?.data?.error || "No detailed error available",
      config: error.config
        ? {
            url: error.config.url,
            method: error.config.method,
            data: JSON.parse(error.config.data || "{}"),
            hasAuthHeader: !!error.config.headers?.Authorization,
          }
        : "No config available",
    });
    throw error.response?.data || error;
  }
};

// Get all support tickets for the authenticated user
export const getUserTickets = async (status = "all", page = 1, limit = 10) => {
  try {
    console.log("Fetching user tickets with params:", { status, page, limit });
    const response = await axiosInstance.get(
      `${API_URL}/tickets?status=${status}&page=${page}&limit=${limit}`
    );
    console.log("User tickets API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    console.error("Error details:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      hasAuthHeader: !!error.config?.headers?.Authorization,
    });
    throw error.response?.data || error;
  }
};

// Get details for a specific ticket
export const getTicketDetails = async (ticketId) => {
  try {
    console.log(`Fetching details for ticket: ${ticketId}`);
    const response = await axiosInstance.get(`${API_URL}/tickets/${ticketId}`);
    console.log("Ticket details API response:", response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ticket details for ${ticketId}:`, error);
    console.error("Error details:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      hasAuthHeader: !!error.config?.headers?.Authorization,
    });
    throw error.response?.data || error;
  }
};

const supportService = {
  checkTicketStatus,
  submitGuestRequest,
  submitGuestSupportRequest,
  submitSupportRequest,
  getUserTickets,
  getTicketDetails,
};

export default supportService;
