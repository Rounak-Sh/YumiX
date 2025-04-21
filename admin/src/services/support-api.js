import axios from "axios";

// Create axios instance with the same configuration as in api.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
  retry: 2,
  retryDelay: 1000,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Redirect to login page if not already there
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("adminToken");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export const supportApi = {
  getSupportTickets: () => api.get("/support/admin/tickets"),
  getSupportTicketDetails: (ticketId) =>
    api.get(`/support/admin/tickets/${ticketId}`),
  respondToSupportTicket: (ticketId, data) =>
    api.post(`/support/admin/tickets/${ticketId}/reply`, data),
  updateSupportTicket: (ticketId, data) =>
    api.put(`/support/admin/tickets/${ticketId}`, data),
  sendTicketResponseEmail: (data) =>
    api.post("/support/admin/send-response-email", data),
};

export default supportApi;
