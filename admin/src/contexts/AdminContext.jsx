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
      const token = localStorage.getItem("adminToken");

      console.log("AdminContext - Checking authentication");
      console.log("Current path:", window.location.pathname);
      console.log("Token exists:", !!token);

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
        return;
      }

      try {
        // Only fetch admin data if not on login/verification page
        if (!isAuthRoute) {
          console.log("Fetching admin data for authenticated route");
          await updateAdminData();
        } else {
          console.log("On auth route, not fetching admin data");
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);

        if (error.code !== "ERR_NETWORK") {
          setError(error.message || "Authentication check failed");

          if (error.response && error.response.status === 401) {
            console.log("401 error - clearing token and redirecting to login");
            localStorage.removeItem("adminToken");

            if (!isAuthRoute) {
              navigate("/login");
            }
          }
        }
        setLoading(false);
      }
    };

    checkAuth();
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
