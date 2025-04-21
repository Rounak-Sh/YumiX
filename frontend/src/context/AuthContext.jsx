import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { showToast } from "@/utils/toast";
import axiosInstance from "../config/axios";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Cache validation duration - 5 minutes
const TOKEN_VALIDATION_CACHE_DURATION = 5 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const validationInProgress = useRef(false);

  // Function to check if we're on the subscription page - expand to include other public routes
  const isOnSubscriptionPage = useCallback(() => {
    const path = window.location.pathname;
    const onSubscriptionPage =
      path.startsWith("/subscription") ||
      localStorage.getItem("onSubscriptionPage") === "true";
    const isPublicPath =
      path === "/" ||
      path === "/dashboard" ||
      path.startsWith("/about") ||
      path.startsWith("/privacy-policy") ||
      path.startsWith("/terms") ||
      path === "/support" ||
      path === "/faq" ||
      path === "/contact";

    return onSubscriptionPage || isPublicPath;
  }, []);

  // Function to check if token is expired
  const isTokenExpired = (tokenToCheck) => {
    try {
      if (!tokenToCheck) return true;
      const payload = JSON.parse(atob(tokenToCheck.split(".")[1]));
      return Date.now() >= payload.exp * 1000;
    } catch (error) {
      return true; // Assume expired if there's an error
    }
  };

  // Initialize auth state from localStorage on page load
  useEffect(() => {
    const initAuth = () => {
      const storedToken = localStorage.getItem("token");
      const storedUserJson = localStorage.getItem("user");
      const currentPath = window.location.pathname;

      // Check if we're on public path - including home, dashboard etc
      const onPublicPath = isOnSubscriptionPage();

      // If no token exists, we're in a guest state - just mark as not loading
      if (!storedToken) {
        // If first time visit and on home page, set a flag
        if (currentPath === "/" || currentPath === "/dashboard") {
          localStorage.setItem("firstVisit", "true");
        }

        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Verify token format
        if (typeof storedToken !== "string" || storedToken.length < 10) {
          // If on public path, don't clear token yet
          if (onPublicPath) {
            setToken(null);
            setUser(null);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
            setLoading(false);
            return;
          }
        }

        // Check if token is expired
        if (isTokenExpired(storedToken)) {
          // If on public path, don't clear token yet
          if (onPublicPath) {
            setToken(null);
            setUser(null);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
            setLoading(false);
            return;
          }
        }

        // Token is valid format and not expired
        setToken(storedToken);

        // Safely parse user data with try-catch
        if (storedUserJson) {
          try {
            const userData = JSON.parse(storedUserJson);
            setUser(userData);

            // Validate token with backend on initialization - but only if we haven't validated recently
            const lastValidation = localStorage.getItem("lastTokenValidation");
            const now = Date.now();
            if (
              !lastValidation ||
              now - parseInt(lastValidation) > TOKEN_VALIDATION_CACHE_DURATION
            ) {
              validateToken(storedToken, userData);
            }
          } catch (parseError) {
            localStorage.removeItem("user");
            // Keep token if parsing user fails but token exists
          }
        } else {
          // Clear the token if user data is missing, unless on public path
          if (!onPublicPath) {
            localStorage.removeItem("token");
            setToken(null);
          }
        }
      } catch (error) {
        // Clear all invalid data, unless on public path
        if (!onPublicPath) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, [isOnSubscriptionPage]);

  // Add a function to validate token with backend
  const validateToken = async (tokenToValidate, userData) => {
    try {
      const response = await axiosInstance.get("/auth/verify", {
        headers: {
          Authorization: `Bearer ${tokenToValidate}`,
        },
      });

      if (response.data.success) {
        // Verify user status in case they've been blocked while logged in
        if (response.data?.data?.user?.status === "blocked") {
          logout();
          showToast.error(
            "Your account has been blocked by an administrator. Please contact support for assistance."
          );
          return false;
        }

        // Update user data if needed
        if (response.data.data?.user) {
          setUser(response.data.data.user);
          localStorage.setItem("user", JSON.stringify(response.data.data.user));
        }

        // Update validation timestamp
        localStorage.setItem("lastTokenValidation", Date.now().toString());

        return true;
      } else {
        return false;
      }
    } catch (error) {
      // Check if user is blocked
      if (
        error.response?.status === 403 &&
        error.response?.data?.message?.includes("blocked")
      ) {
        logout();
        showToast.error(
          "Your account has been blocked by an administrator. Please contact support for assistance."
        );
      }

      return false;
    }
  };

  // Re-check authentication on re-renders or storage events
  useEffect(() => {
    const syncWithLocalStorage = () => {
      const storedToken = localStorage.getItem("token");
      const storedUserJson = localStorage.getItem("user");
      const justLoggedIn = localStorage.getItem("justLoggedIn") === "true";

      // Get clean objects from user JSON for comparison
      let storedUser = null;
      try {
        if (storedUserJson) {
          storedUser = JSON.parse(storedUserJson);
        }
      } catch (err) {
        // Error parsing stored user JSON
      }

      // Priority handling for just logged in users
      if (justLoggedIn && storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        return; // Exit early after setting the auth state
      }

      // If token status changed, update state
      if (!!storedToken !== !!token) {
        if (storedToken) {
          setToken(storedToken);

          if (storedUser) {
            setUser(storedUser);
          }
        } else {
          setToken(null);
          setUser(null);
        }
      }
      // If token exists but user is missing, try to restore user
      else if (storedToken && !user && storedUser) {
        setUser(storedUser);
      }
      // If user data differs between state and localStorage, update from localStorage
      else if (
        storedToken &&
        user &&
        storedUser &&
        (user.id !== storedUser.id || user.email !== storedUser.email)
      ) {
        setUser(storedUser);
      }
    };

    // Add storage event listener to sync state across tabs/components
    const handleStorageChange = (event) => {
      if (event.key === "token" || event.key === "user" || event.key === null) {
        syncWithLocalStorage();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Only run this effect after initial loading is done
    if (!loading) {
      syncWithLocalStorage();
    }

    // Clean up event listener
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loading, token, user]);

  // Login function
  const login = async (credentials) => {
    try {
      const response = await axiosInstance.post("/auth/login", credentials);

      if (response.data.success) {
        // Extract data from the nested structure
        const { token: newToken, user: newUser } = response.data.data || {};

        // Check if we have token and user data before proceeding
        if (!newToken || !newUser) {
          return {
            success: false,
            message: "Invalid response data from server",
          };
        }

        // Check if user account is blocked
        if (newUser.status === "blocked") {
          return {
            success: false,
            message:
              "Your account has been blocked by an administrator. Please contact support for assistance.",
            blocked: true,
          };
        }

        // Store token and user data in specific order
        localStorage.setItem("user", JSON.stringify(newUser));
        localStorage.setItem("token", newToken);
        localStorage.setItem("lastActivity", Date.now().toString());
        localStorage.setItem("lastTokenValidation", Date.now().toString());

        // Set flag for just logged in
        localStorage.setItem("justLoggedIn", "true");

        // Update state
        setUser(newUser);
        setToken(newToken);

        // Force update via storage event
        window.dispatchEvent(new Event("storage"));

        showToast.success("Login successful!");
        return { success: true };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      // Check if user is blocked
      if (
        error.response?.status === 403 &&
        error.response?.data?.message?.includes("blocked")
      ) {
        return {
          success: false,
          message:
            "Your account has been blocked by an administrator. Please contact support for assistance.",
          blocked: true,
        };
      }

      return {
        success: false,
        message:
          error.response?.data?.message || "Login failed. Please try again.",
      };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await axiosInstance.post("/auth/register", userData);

      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      };
    }
  };

  // Logout function
  const logout = () => {
    // Get current location before logout
    const currentPath = window.location.pathname;
    const isOnPublicPage = isOnSubscriptionPage();

    // Set a logout flag to prevent immediate redirects
    localStorage.setItem("justLoggedOut", "true");

    // Clear auth-related storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastTokenValidation");

    // Update state
    setUser(null);
    setToken(null);

    // Show toast and attempt server logout
    showToast.success("Logged out successfully");

    // Only redirect if not on a public page
    if (!isOnPublicPage) {
      navigate("/");
    }

    // Make the server logout request without waiting for it
    axiosInstance.post("/auth/logout").catch(() => {
      // Error handling for server logout failure
    });

    // Set a timeout to clear the logout flag after 2 seconds
    setTimeout(() => {
      localStorage.removeItem("justLoggedOut");
    }, 2000);
  };

  // Verify OTP function
  const verifyOTP = async (data) => {
    try {
      const response = await axiosInstance.post("/auth/verify", data);

      if (response.data.success) {
        const { token, user } = response.data.data;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        setToken(token);
        return { success: true };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Verification failed. Please try again.",
      };
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const response = await axiosInstance.put(
        "/api/users/profile",
        profileData
      );

      if (response.data.success) {
        const updatedUser = response.data.data;
        // Update the user in localStorage by merging the new data with existing data
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const mergedUser = { ...currentUser, ...updatedUser };

        localStorage.setItem("user", JSON.stringify(mergedUser));
        setUser(mergedUser);
        return { success: true, data: mergedUser };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Profile update failed. Please try again.",
      };
    }
  };

  // Get profile data function
  const getProfile = async () => {
    try {
      const response = await axiosInstance.get("/auth/profile");

      if (response.data.success) {
        const userData = response.data.data;

        // Ensure both profileImage and profilePicture fields exist for frontend compatibility
        if (userData.profilePicture && !userData.profileImage) {
          userData.profileImage = userData.profilePicture;
        }

        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        return { success: true, data: userData };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch profile data.",
      };
    }
  };

  // Password reset request function
  const requestPasswordReset = async (email) => {
    try {
      const response = await axiosInstance.post("/auth/forgot-password", {
        email,
      });
      return { success: response.data.success, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to request password reset.",
      };
    }
  };

  // Reset password function
  const resetPassword = async (resetData) => {
    try {
      const response = await axiosInstance.post(
        "/auth/reset-password",
        resetData
      );
      return { success: response.data.success, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to reset password.",
      };
    }
  };

  // Define isAuthenticated
  const isAuthenticated = !!(token && user);

  // Context value with all the auth properties and functions
  const contextValue = {
    user,
    token,
    isAuthenticated,
    loading,
    isOnSubscriptionPage,
    login,
    logout,
    register,
    requestPasswordReset,
    resetPassword,
    verifyOTP,
    updateProfile,
    getProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthContext;
