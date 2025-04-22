import axios from "axios";

// Simple direct approach - use the Render URL directly
const apiUrl = "https://yumix-backend.onrender.com/api/v1";

console.log("Using API URL:", apiUrl);

// Make API URL available for debugging
if (typeof window !== "undefined") {
  window.__API_URL__ = apiUrl;
}

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");

    // Basic token validation before adding to request
    const isValidToken = token && token.length > 50 && token.includes(".");

    if (isValidToken) {
      // Log token format for debugging (safely trimmed)
      console.log(
        "Auth token format check:",
        `${token.substring(0, 5)}...${token.substring(token.length - 5)}`
      );

      config.headers.Authorization = `Bearer ${token}`;
    } else if (token) {
      // If token exists but isn't valid, clear it to prevent future issues
      console.log("Invalid token detected in request interceptor, clearing it");
      localStorage.removeItem("adminToken");
    } else {
      console.log("No admin token found in localStorage");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Retry logic for network errors
api.interceptors.response.use(null, async (error) => {
  const { config } = error;

  if (!config || !config.retry) {
    return Promise.reject(error);
  }

  if (
    error.code === "ERR_NETWORK" ||
    (error.response && error.response.status >= 500)
  ) {
    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount < config.retry) {
      config.__retryCount += 1;

      const backoff = new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, config.retryDelay || 1000);
      });

      await backoff;
      return api(config);
    }
  }

  // Handle 401 errors
  if (error.response?.status === 401) {
    if (!window.location.pathname.includes("/login")) {
      localStorage.removeItem("adminToken");
      window.location.href = "/login";
    }
  }

  return Promise.reject(error);
});

const adminApi = {
  // Health check
  checkHealth: async () => {
    try {
      // Try the direct health endpoint first
      const response = await axios.get(
        "https://yumix-backend.onrender.com/health"
      );
      return response;
    } catch (error) {
      console.error("Health check failed:", error.message);

      // Try with the admin prefix as a fallback
      try {
        const adminResponse = await axios.get(
          "https://yumix-backend.onrender.com/api/v1/admin/health"
        );
        console.log("Health check succeeded with admin URL");
        return adminResponse;
      } catch (adminError) {
        console.error("Admin health check failed:", adminError.message);

        // Try a basic ping to the root URL to see if the server is up at all
        try {
          const pingResponse = await axios.get(
            "https://yumix-backend.onrender.com/"
          );
          console.log("Basic server ping succeeded");
          return { data: { success: true, message: "Server is reachable" } };
        } catch (pingError) {
          console.error("All health check attempts failed");
          throw error; // Throw the original error
        }
      }
    }
  },

  // Auth
  login: (credentials) => {
    console.log("Logging in with credentials:", {
      email: credentials.email,
      passwordProvided: !!credentials.password,
    });

    // The correct endpoint according to adminRoutes.js
    console.log("API URL for login:", apiUrl + "/admin/auth/login");

    return axios
      .post(apiUrl + "/admin/auth/login", credentials, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      })
      .then((response) => {
        console.log("Login API response status:", response.status);
        console.log("Login API response:", {
          success: response.data?.success,
          requireOTP: response.data?.requireOTP !== undefined,
          hasToken: !!response.data?.token,
          message: response.data?.message,
        });

        // If login is successful but no OTP required and token is present
        if (
          response.data?.success &&
          !response.data?.requireOTP &&
          response.data?.token
        ) {
          console.log("Direct login with token, storing token");
          localStorage.setItem("adminToken", response.data.token);
        }

        return response;
      })
      .catch((error) => {
        console.error("Login API error:", error.message);
        console.error(
          "Login API error details:",
          error.response?.data || "No response data"
        );
        throw error;
      });
  },

  verifyOtp: (data) => {
    console.log("Verifying OTP for:", data.email);
    return api
      .post("/admin/auth/verify-otp", data)
      .then((response) => {
        console.log("OTP verification response:", {
          success: response.data?.success,
          hasToken: !!response.data?.token,
          hasAdmin: !!response.data?.admin,
        });

        // Store token if present in response
        if (response.data?.success && response.data?.token) {
          console.log("Storing token from OTP verification");
          localStorage.setItem("adminToken", response.data.token);
        }

        return response;
      })
      .catch((error) => {
        console.error("OTP verification failed:", error);
        throw error;
      });
  },

  resetPassword: (data) => api.post("/admin/auth/reset-password", data),
  logout: () => api.post("/admin/auth/logout"),

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

  // Dashboard
  getDashboardStats: async () => {
    try {
      return await api.get("/admin/dashboard/stats");
    } catch (error) {
      return {
        data: {
          success: false,
          message: "Failed to load dashboard stats",
          stats: {
            totalUsers: 0,
            activeRecipes: 0,
            activeSubscriptions: 0,
            recipeSearches: 0,
            usersChange: 0,
            recipesChange: 0,
            subscriptionsChange: 0,
            searchesChange: 0,
          },
        },
      };
    }
  },

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

  // Forgot Password
  forgotPassword: async (email) => {
    try {
      const response = await api.post("/admin/auth/forgot-password", { email });
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
