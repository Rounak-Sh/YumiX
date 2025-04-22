import axios from "axios";

// Base URL for the API
const BASE_URL = "https://yumix-backend.onrender.com";
const API_URL = BASE_URL + "/api";

console.log("API Base URL:", API_URL);

// Make API URL available for debugging
if (typeof window !== "undefined") {
  window.__API_URL__ = API_URL;
}

// Simple axios instance without interceptors to avoid token issues
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 15000, // Increased timeout for slow connections
});

// Simplified API service with direct URLs
const adminApi = {
  // Health check
  checkHealth: async () => {
    const healthEndpoints = [
      `${BASE_URL}/health`,
      `${API_URL}/admin/health`,
      BASE_URL,
    ];

    for (const endpoint of healthEndpoints) {
      try {
        console.log(`Trying health endpoint: ${endpoint}`);
        const response = await axios.get(endpoint);
        console.log(`Health check succeeded with endpoint: ${endpoint}`);
        return response;
      } catch (error) {
        console.error(`Health check failed for ${endpoint}:`, error.message);
      }
    }

    // If all attempts failed
    console.error("All health check attempts failed");
    throw new Error("Failed to connect to backend");
  },

  // Auth
  login: (credentials) => {
    console.log("Logging in with credentials:", {
      email: credentials.email,
      passwordProvided: !!credentials.password,
      skipOtp: credentials.skipOtp,
    });

    // Always use absolute URL and force skipOtp
    const loginUrl = `${API_URL}/admin/auth/login`;

    // Ensure skipOtp is set to true
    const loginData = {
      ...credentials,
      skipOtp: true,
    };

    console.log("ABSOLUTE API URL for login:", loginUrl);

    return axios.post(loginUrl, loginData, {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
  },

  verifyOtp: (data) => {
    console.log("Verifying OTP for:", data.email);
    // Use absolute URL to avoid prepending with frontend URL
    const verifyUrl = `${API_URL}/admin/auth/verify-otp`;
    console.log("ABSOLUTE URL for OTP verification:", verifyUrl);

    return axios.post(verifyUrl, data, {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
  },

  // Dashboard
  getDashboardStats: () => {
    const token = localStorage.getItem("adminToken");
    console.log("Getting dashboard stats, token exists:", !!token);

    return axios.get(`${API_URL}/admin/dashboard/stats`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });
  },

  // Basic authenticated request wrapper
  authRequest: (method, endpoint, data = null) => {
    const token = localStorage.getItem("adminToken");
    const config = {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
      withCredentials: true,
    };

    const url = `${API_URL}${endpoint}`;

    if (method.toLowerCase() === "get") {
      return axios.get(url, config);
    } else if (method.toLowerCase() === "post") {
      return axios.post(url, data, config);
    } else if (method.toLowerCase() === "put") {
      return axios.put(url, data, config);
    } else if (method.toLowerCase() === "delete") {
      return axios.delete(url, config);
    }
  },

  // Other endpoints can use the authRequest wrapper
  resetPassword: (data) =>
    adminApi.authRequest("post", "/admin/auth/reset-password", data),
  forgotPassword: (email) =>
    adminApi.authRequest("post", "/admin/auth/forgot-password", { email }),
  logout: () => adminApi.authRequest("post", "/admin/auth/logout"),

  // Users
  getAllUsers: () => api.get("/admin/users"),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  blockUser: (userId) => api.put(`/admin/users/${userId}/block`),
  unblockUser: (userId) => api.put(`/admin/users/${userId}/unblock`),
  searchUsers: (params) => api.get("/admin/users/search", { params }),

  // Support
  getSupportTickets: () => api.get("/support/admin/tickets"),
  getSupportTicketDetails: (ticketId) =>
    api.get(`/support/admin/tickets/${ticketId}`),
  respondToSupportTicket: (ticketId, data) =>
    api.post(`/support/admin/tickets/${ticketId}/reply`, data),
  updateSupportTicket: (ticketId, data) =>
    api.put(`/support/admin/tickets/${ticketId}`, data),

  getUserGrowthData: async () => {
    try {
      return await api.get("/admin/dashboard/user-growth");
    } catch (error) {
      return {
        data: {
          success: false,
          message: "Failed to load user growth data",
          data: [],
        },
      };
    }
  },

  getRecipePopularityData: async () => {
    try {
      return await api.get("/admin/dashboard/recipe-popularity");
    } catch (error) {
      return {
        data: {
          success: false,
          message: "Failed to load recipe view data",
          data: [],
        },
      };
    }
  },

  getSubscriptionData: async () => {
    try {
      return await api.get("/admin/dashboard/subscriptions");
    } catch (error) {
      return {
        data: {
          success: false,
          message: "Failed to load subscription data",
          data: {},
        },
      };
    }
  },

  getActivityMetricsData: async () => {
    try {
      return await api.get("/admin/dashboard/activity-metrics");
    } catch (error) {
      return {
        data: {
          success: false,
          message: "Failed to load activity metrics data",
          data: [],
        },
      };
    }
  },

  // OTP
  resendOtp: async (data) => {
    try {
      const response = await api.post("/admin/auth/resend-otp", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  verifyResetOtp: async (data) => {
    try {
      const response = await api.post("/admin/auth/verify-reset-otp", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Recipes
  searchRecipesByIngredients: (ingredients) =>
    api.post("/admin/recipes/search", { ingredients: ingredients.trim() }),
  getRecipeVideo: async (recipeName) => {
    try {
      const response = await api.get(
        `/admin/recipes/video?query=${encodeURIComponent(recipeName)}`
      );
      return response;
    } catch (error) {
      return { data: { success: false, videoId: null } };
    }
  },
  markRecipeAsFeatured: (recipeId, recipeData) =>
    api.put(`/admin/recipes/${recipeId}/feature`, recipeData),
  removeFeaturedRecipe: (recipeId) =>
    api.delete(`/admin/recipes/${recipeId}/unfeature`),
  getFeaturedRecipes: () => api.get("/admin/recipes/featured"),

  // Subscriptions
  getSubscribedUsers: () => api.get("/admin/subscriptions/users"),

  // Payments
  getPaymentHistory: () => api.get("/admin/payments"),
  getPaymentDetails: (paymentId) => api.get(`/admin/payments/${paymentId}`),

  // Reports
  generateReport: (type, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `/admin/reports/${type}?${queryString}`
      : `/admin/reports/${type}`;
    return api.get(url, { responseType: "blob" });
  },

  // Subscription Plans
  getAllPlans: () => api.get("/admin/plans"),
  createPlan: (data) => api.post("/admin/plans", data),
  updatePlan: (planId, data) => api.put(`/admin/plans/${planId}`, data),
  deletePlan: (planId) => api.delete(`/admin/plans/${planId}`),
  initializeDefaultPlans: () => api.post("/admin/plans/initialize"),

  // Profile
  updateProfile: async (data) => {
    try {
      const response = await api.put("/admin/profile", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateProfilePicture: async (formData) => {
    try {
      const response = await api.put("/admin/profile/picture", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // OTP for Profile Updates
  requestProfileUpdateOTP: async (type, newEmail = null) => {
    try {
      const payload = { type };
      if (newEmail && type === "email") {
        payload.newEmail = newEmail;
      }
      const response = await api.post("/admin/profile/update-otp", payload);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateProfileWithOTP: async (data) => {
    try {
      const response = await api.put("/admin/profile/update-with-otp", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updatePreferences: (data) => api.put("/admin/preferences", data),

  // Notifications
  getNotifications: () => api.get("/admin/notifications"),
  markNotificationAsRead: (id) => api.put(`/admin/notifications/${id}/read`),
  markAllNotificationsAsRead: () =>
    api.put("/admin/notifications/mark-all-read"),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),

  clearOldNotifications: (all = true) => {
    return api.delete(`/admin/notifications/clear?all=${all}`);
  },
};

export default adminApi;
