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

      // Check if response or data exists
      if (!response || !response.data) {
        console.log("No data received from dashboard stats");
        return;
      }

      const adminData = response.data.admin;

      if (!adminData) {
        console.log("No admin data found in response");
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
          permissions: adminData.preferences || {
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
      console.log("Error updating admin data:", error.message);
      // Don't clear token or redirect, just log the error
    } finally {
      // Always set loading to false when done
      setLoading(false);
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        console.log("AdminContext - Token check:", !!token);

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

        // Only fetch admin data if not on login/verification page
        if (!isAuthRoute) {
          console.log("Fetching admin data for authenticated route");
          try {
            await updateAdminData();
          } catch (apiError) {
            console.error("Error fetching admin data:", apiError);
            setLoading(false);
          }
        } else {
          console.log("On auth route, not fetching admin data");
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setLoading(false);
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
