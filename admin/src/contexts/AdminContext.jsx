import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "@/services/api";

// Create context with a meaningful default value
const AdminContext = createContext({
  admin: null,
  loading: true,
  error: null,
  stats: null,
  logout: () => {},
  updateAdminData: () => {},
});

// Named function for better debugging
function AdminProvider({ children }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const updateAdminData = async () => {
    try {
      const response = await adminApi.getDashboardStats();
      const adminData = response.data.admin;

      if (!adminData) {
        return;
      }

      const hasChanged = JSON.stringify(adminData) !== JSON.stringify(admin);
      if (hasChanged) {
        setAdmin({
          name: adminData.name,
          email: adminData.email,
          role: adminData.role || "admin",
          status: adminData.status || "active",
          image: adminData.image,
          preferences: adminData.preferences || {
            emailNotifications: true,
            loginAlerts: true,
            reportGeneration: true,
            userSignups: false,
            newSubscriptions: true,
            paymentAlerts: true,
          },
        });

        setStats(response.data.stats);
      }
    } catch (error) {
      if (error.code !== "ERR_NETWORK") {
        setError(error.message || "Failed to update admin data");
      }
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      // Set a timeout to prevent infinite loading, but give more time for backend connections
      const loadingTimeout = setTimeout(() => {
        console.log(
          "Loading timeout triggered, forcing loading state to false"
        );
        setLoading(false);
        console.log("NOT clearing token - this is likely causing login issues");
        // Don't clear the token here as it's causing login issues
        // localStorage.removeItem("adminToken"); // Clear potentially corrupted token
      }, 30000); // Increased to 30 seconds to give more time for server to wake up

      try {
        const token = localStorage.getItem("adminToken");

        console.log("AdminContext - Checking authentication");
        console.log("Current path:", window.location.pathname);
        console.log("Token exists:", !!token);
        if (token) {
          console.log(
            "Token format check:",
            `${token.substring(0, 5)}...${token.substring(token.length - 5)}`
          );
        }

        // Auth routes where we don't need to redirect to login
        const isAuthRoute =
          window.location.pathname.includes("/login") ||
          window.location.pathname.includes("/verify-otp") ||
          window.location.pathname.includes("/reset-password");

        if (!token) {
          console.log(
            "No token found, redirecting to login if not on auth route"
          );
          setLoading(false);

          if (!isAuthRoute) {
            console.log("Redirecting to login page");
            navigate("/login");
          }
          clearTimeout(loadingTimeout); // Clear timeout as we've finished loading
          return;
        }

        // Check if token appears to be valid (simple format check)
        // Modified to be less strict since some valid tokens might be shorter
        if (!token.includes(".")) {
          console.log("Token appears invalid, clearing and redirecting");
          localStorage.removeItem("adminToken");
          setLoading(false);

          if (!isAuthRoute) {
            navigate("/login");
          }
          clearTimeout(loadingTimeout); // Clear timeout
          return;
        }

        // Only fetch admin data if not on login/verification page
        if (!isAuthRoute) {
          console.log("Fetching admin data for authenticated route");
          try {
            await updateAdminData();
            clearTimeout(loadingTimeout); // Clear timeout on success
          } catch (apiError) {
            console.error("Error fetching admin data:", apiError);

            // Handle authentication errors
            if (apiError.response?.status === 401) {
              console.log("Authentication failed, clearing token");
              localStorage.removeItem("adminToken");
              if (!isAuthRoute) navigate("/login");
            }

            setLoading(false);
            clearTimeout(loadingTimeout); // Clear timeout on error
          }
        } else {
          console.log("On auth route, not fetching admin data");
          setLoading(false);
          clearTimeout(loadingTimeout); // Clear timeout
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setLoading(false);

        // On any error, better to clear token and show login
        if (!window.location.pathname.includes("/login")) {
          localStorage.removeItem("adminToken");
          navigate("/login");
        }

        clearTimeout(loadingTimeout); // Clear timeout on error
      }
    };

    checkAuth();

    // Cleanup function to prevent memory leaks
    return () => {
      console.log("AdminContext cleanup");
      setLoading(false); // Reset loading state when component unmounts
    };
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("adminToken");
    setAdmin(null);
    setStats(null);
    navigate("/login");
  };

  const value = {
    admin,
    loading,
    error,
    stats,
    logout,
    updateAdminData,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

// Named function for the hook
function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}

// Named exports
export { AdminProvider, useAdmin };
