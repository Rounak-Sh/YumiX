import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { AdminProvider } from "@/contexts/AdminContext";
import { ToastifyContainer } from "@/utils/toast.jsx";
import NetworkStatus from "@/components/NetworkStatus";
import AdminLayout from "@/layouts/AdminLayout";
import Login from "@/pages/auth/Login";
import OtpVerification from "@/pages/auth/OtpVerification";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import AllUsers from "@/pages/users/AllUsers";
import BlockedUsers from "@/pages/users/BlockedUsers";
import UserDetails from "@/pages/users/UserDetails";
import Recipes from "@/pages/Recipes";
import FeaturedRecipes from "@/pages/FeaturedRecipes";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Subscriptions from "@/pages/Subscriptions";
import Subscribers from "@/pages/Subscribers";
import Payments from "@/pages/Payments";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Support from "@/pages/Support";
import { showToast } from "@/utils/toast";
import adminApi from "@/services/api";

export default function App() {
  // Add a backend connection check on startup
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        // Try to connect to the backend health endpoint
        await adminApi.checkHealth();
        console.log("✅ Connected to backend successfully");
      } catch (error) {
        console.error("❌ Failed to connect to backend:", error);

        // Show a toast notification
        showToast.error(
          "Could not connect to the server. Please check your internet connection or try again later."
        );

        // Log detailed information for debugging
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          response: error.response,
          config: error.config,
        });
      }
    };

    checkBackendConnection();
  }, []);

  return (
    <AdminProvider>
      <NetworkStatus />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<OtpVerification />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users/all" element={<AllUsers />} />
            <Route path="/users/blocked" element={<BlockedUsers />} />
            <Route path="/users/details/:userId" element={<UserDetails />} />
            <Route path="/recipes/search" element={<Recipes />} />
            <Route path="/recipes/featured" element={<FeaturedRecipes />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/subscribers" element={<Subscribers />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/support" element={<Support />} />
          </Route>
        </Route>
      </Routes>
      <ToastifyContainer />
    </AdminProvider>
  );
}
