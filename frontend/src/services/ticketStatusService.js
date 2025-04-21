import axios from "axios";

const API_URL = "/api/support";

// Check ticket status with reference ID (legacy method)
export const checkTicketStatus = async (email, referenceId) => {
  try {
    const response = await axios.post(`${API_URL}/check-status`, {
      email,
      referenceId,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get all tickets by email (new simplified method)
export const checkTicketByEmail = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/tickets-by-email`, {
      email,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

const ticketStatusService = {
  checkTicketStatus,
  checkTicketByEmail,
};

export default ticketStatusService;
