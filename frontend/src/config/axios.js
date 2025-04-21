import axios from "axios";
import { showToast } from "@/utils/toast";

// Create custom error that includes a flag for connection issues
class ConnectionError extends Error {
  constructor(message) {
    super(message);
    this.isConnectionError = true;
    this.name = "ConnectionError";
  }
}

// Hardcode the backend URL to avoid environment variable issues
const baseURL = "https://yumix-backend.onrender.com/api";
console.log("Using API URL:", baseURL);

// Add to window for debugging
if (typeof window !== "undefined") {
  window.__API_URL__ = baseURL;
}

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000, // Increased timeout to 15 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to track if we've already shown a connection error
let connectionErrorShown = false;
// Track failed requests for retry
const pendingRetryRequests = [];

// Response interceptor with enhanced error handling
axiosInstance.interceptors.response.use(
  (response) => {
    // Reset connection error flag on successful response
    connectionErrorShown = false;
    return response;
  },
  async (error) => {
    // Check for network errors (ECONNREFUSED, Network Error, etc)
    const isNetworkError =
      !error.response &&
      error.message &&
      (error.message.includes("Network Error") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("connection") ||
        error.code === "ECONNABORTED");

    // Handle network/connection errors
    if (isNetworkError) {
      console.error("Backend connection issue:", error.message);

      // Add to pending retry requests if not already in there
      const requestConfig = error.config;
      const requestUrl = requestConfig.url;

      if (!pendingRetryRequests.find((req) => req.url === requestUrl)) {
        pendingRetryRequests.push(requestConfig);
      }

      // Only show the error message once to prevent spamming the user
      if (!connectionErrorShown) {
        connectionErrorShown = true;

        // Show more specific error based on scenario
        if (error.code === "ECONNABORTED") {
          showToast.error("Request timed out. The server might be overloaded.");
        } else {
          showToast.error(
            "Backend service unreachable. Please check your internet connection and try refreshing the page."
          );
        }

        // Schedule retry for all pending requests
        setTimeout(() => {
          console.log(
            `Attempting to retry ${pendingRetryRequests.length} failed requests`
          );

          // Try to reconnect with all pending requests
          pendingRetryRequests.forEach(async (config) => {
            try {
              await axiosInstance(config);
              // If successful, show reconnected message
              if (connectionErrorShown) {
                showToast.success("Connection to server restored!");
                connectionErrorShown = false;
              }
            } catch (err) {
              // Silent catch - we don't want to spam errors on retry
              console.error("Retry failed:", err.message);
            }
          });

          // Clear the pending requests regardless of success
          pendingRetryRequests.length = 0;
        }, 5000); // Try again after 5 seconds
      }

      // Return a ConnectionError to let components handle it appropriately
      return Promise.reject(new ConnectionError("Backend service unreachable"));
    }

    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response?.status === 401) {
      // Only logout for expired/invalid tokens on protected routes
      const isPublicRoute = [
        "/auth/login",
        "/auth/register",
        "/auth/google-auth",
        "/recipes/featured",
        "/recipes/search",
      ].some((route) => error.config.url.includes(route));

      const isTokenError = error.response.data?.message
        ?.toLowerCase()
        .includes("token");

      if (!isPublicRoute && isTokenError) {
        console.log("Token expired or invalid. Logging out...");
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Only redirect if not already on login page
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
          showToast.error("Session expired. Please login again.");
        }
      }
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      // Check if this is a subscription limit (contains "limit" in message) or
      // a general rate limit (too many requests in short period)
      const isSearchLimitError =
        error.response.data?.message?.includes("limit") ||
        error.response.data?.message?.includes("upgrade");

      if (isSearchLimitError) {
        // This is a subscription search limit error - just pass it through to be handled by the component
        console.log(
          "Search limit exceeded - passing through to component:",
          error.response.data
        );
      } else {
        // This is a general rate limit error - show a toast and retry automatically
        showToast.error(
          "Too many requests. Please wait a moment and try again."
        );
        console.log("General rate limit exceeded - auto-retrying in 5 seconds");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return axiosInstance(error.config);
      }
    }

    // Handle 500 server errors
    if (error.response?.status >= 500) {
      showToast.error(
        "Server error. Our team has been notified and is working on it."
      );
    }

    return Promise.reject(error);
  }
);

// Export both the instance and the ConnectionError for use in components
export { ConnectionError };
export default axiosInstance;
