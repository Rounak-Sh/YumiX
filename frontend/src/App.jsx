import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  BrowserRouter as Router,
} from "react-router-dom";

// Initialize YouTube API helper
// This helps with YouTube embed permissions
window.onYouTubeIframeAPIReady = function () {
  console.log("YouTube iframe API is ready");
  window.__youtubeApiReady = true;
};

import Register from "./pages/auth/Register";
import Verification from "./pages/auth/Verification";
import ResetPassword from "./pages/auth/ResetPassword";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import FeaturedRecipes from "./pages/FeaturedRecipes";
import RecipeSearch from "./pages/RecipeSearch";
import Subscription from "./pages/Subscription";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import RecipeHistory from "./pages/RecipeHistory";
import Trending from "./pages/Trending";
import AuthCheck from "./components/AuthCheck";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import GoogleCallback from "./components/GoogleCallback";
import { ToastifyContainer } from "@/utils/toast.jsx";
import InactivityWarning from "@/components/InactivityWarning";
import NetworkStatus from "@/components/NetworkStatus";
import useAutoLogout from "@/hooks/useAutoLogout";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import axiosInstance from "./config/axios";
import { checkApiHealth } from "./utils/apiUtils";
import { FavoritesProvider } from "./context/FavoritesContext";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import AccountHelp from "./pages/AccountHelp";
import TestAuth from "./pages/TestAuth";
import PaymentStatusRedirect from "./components/PaymentStatusRedirect";
import SubscriptionSynchronizerFix from "./components/SubscriptionSynchronizerFix";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import ScrollToTop from "./components/ScrollToTop";
import RecipeViewer from "./pages/RecipeViewer";
import RecipeGenerator from "./components/ai/RecipeGenerator";
import CheckTicketStatus from "./pages/CheckTicketStatus";
import MyTickets from "./pages/MyTickets";

// Lazy load routes for better performance
// const Home = lazy(() => import("./pages/Home"));

// Create an app wrapper component that has access to context
function AppContent() {
  const { isAuthenticated } = useAuth();
  const [apiHealthStatus, setApiHealthStatus] = useState({
    success: true, // Default to true to prevent initial flash of error
    message: "Checking API connection...",
    status: "pending",
    hidden: false,
  });
  const navigate = useNavigate();

  const { resetTimer } = useAutoLogout(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem("lastActivity", Date.now().toString());
    }
  }, [isAuthenticated]);

  // Check API health on component mount
  useEffect(() => {
    const verifyApiConnection = async () => {
      try {
        const health = await checkApiHealth(axiosInstance);
        setApiHealthStatus(health);

        // Store the dismiss state in localStorage so it persists between refreshes
        const isDismissed = localStorage.getItem("apiWarningDismissed");
        if (isDismissed) {
          setApiHealthStatus((prev) => ({ ...prev, hidden: true }));
        }
      } catch (error) {
        setApiHealthStatus({
          success: false,
          message: error.message || "Failed to connect to API",
          status: "error",
          hidden: false,
        });
      }
    };

    verifyApiConnection();

    // Check API health periodically
    const healthCheckInterval = setInterval(verifyApiConnection, 30000); // Every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, []);

  const dismissApiWarning = () => {
    setApiHealthStatus((prev) => ({ ...prev, hidden: true }));
    // Store the dismissal in localStorage
    localStorage.setItem("apiWarningDismissed", "true");
  };

  // Only show warning for non-404 errors (like network issues) and if not dismissed
  // const showApiWarning =
  //   !apiHealthStatus.success &&
  //   apiHealthStatus.status !== 404 &&
  //   !apiHealthStatus.hidden;

  return (
    <>
      <NetworkStatus />

      {/* Only show API warning for serious connection issues
      {showApiWarning && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-2 text-center z-50 flex items-center justify-center">
          <span>API Connection Issue: {apiHealthStatus.message}</span>
          <button
            onClick={dismissApiWarning}
            className="ml-4 px-2 py-1 bg-red-600 rounded hover:bg-red-700">
            Dismiss
          </button>
        </div>
      )} */}

      {/* Wrap Routes in an ErrorBoundary for better error handling */}
      <ErrorBoundary>
        <Routes>
          {/* Public Routes with AuthLayout */}
          <Route
            path="/register"
            element={
              <AuthLayout>
                <Register />
              </AuthLayout>
            }
          />
          <Route
            path="/login"
            element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            }
          />
          <Route
            path="/verify"
            element={
              <AuthLayout>
                <Verification />
              </AuthLayout>
            }
          />
          <Route
            path="/auth/verification"
            element={
              <AuthLayout>
                <Verification />
              </AuthLayout>
            }
          />
          <Route
            path="/reset-password"
            element={
              <AuthLayout>
                <ResetPassword />
              </AuthLayout>
            }
          />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          {/* Public Dashboard Route */}
          <Route
            path="/"
            element={
              <AuthCheck
                requireAuth={false}
                redirectToLogin={false}
                featureName="Dashboard">
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </AuthCheck>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AuthCheck
                requireAuth={false}
                redirectToLogin={false}
                featureName="Dashboard">
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* Recipe Search Route - Require authentication */}
          <Route
            path="/recipes"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="Recipe Search">
                <MainLayout>
                  <RecipeSearch />
                </MainLayout>
              </AuthCheck>
            }
          />

          <Route
            path="/search-recipe"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="Recipe Search">
                <MainLayout>
                  <RecipeSearch />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* Search Routes */}
          <Route
            path="/search"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="Recipe Search">
                <MainLayout>
                  <RecipeSearch />
                </MainLayout>
              </AuthCheck>
            }
          />

          <Route
            path="/featured-recipes"
            element={
              <MainLayout>
                <FeaturedRecipes />
              </MainLayout>
            }
          />

          <Route
            path="/recipe/:recipeId"
            element={
              <MainLayout>
                <RecipeViewer />
              </MainLayout>
            }
          />

          <Route
            path="/subscription"
            element={
              <AuthCheck
                requireAuth={false}
                redirectToLogin={false}
                featureName="Subscription Management">
                <MainLayout>
                  <Subscription />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* Payment Status Route - Redirect to subscription with parameters preserved */}
          <Route path="/payment-status" element={<PaymentStatusRedirect />} />

          <Route
            path="/profile"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="User Profile">
                <MainLayout>
                  <Profile />
                </MainLayout>
              </AuthCheck>
            }
          />
          <Route
            path="/favorites"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="Favorites">
                <MainLayout>
                  <Favorites />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* New sidebar feature pages */}
          <Route
            path="/recipe-history"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="Recipe History">
                <MainLayout>
                  <RecipeHistory />
                </MainLayout>
              </AuthCheck>
            }
          />
          <Route
            path="/trending"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="Trending Recipes">
                <MainLayout>
                  <Trending />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* Support/FAQ Routes - accessible to all users */}
          <Route
            path="/support"
            element={
              <AuthCheck requireAuth={false}>
                <MainLayout>
                  <Support />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* FAQ route alias that points to the same Support component */}
          <Route
            path="/faq"
            element={
              <AuthCheck requireAuth={false}>
                <MainLayout>
                  <Support />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* Guest Mode Pages */}
          <Route
            path="/about"
            element={
              <AuthCheck requireAuth={false}>
                <MainLayout>
                  <About />
                </MainLayout>
              </AuthCheck>
            }
          />

          <Route
            path="/privacy-policy"
            element={
              <AuthCheck requireAuth={false}>
                <MainLayout>
                  <PrivacyPolicy />
                </MainLayout>
              </AuthCheck>
            }
          />

          <Route
            path="/terms"
            element={
              <AuthCheck requireAuth={false}>
                <MainLayout>
                  <Terms />
                </MainLayout>
              </AuthCheck>
            }
          />

          <Route
            path="/account-help"
            element={
              <AuthCheck requireAuth={false}>
                <MainLayout>
                  <AccountHelp />
                </MainLayout>
              </AuthCheck>
            }
          />

          <Route
            path="/recipe-generator"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="AI Recipe Generator">
                <MainLayout>
                  <RecipeGenerator />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* Test route */}
          <Route
            path="/test-auth"
            element={
              <AuthCheck requireAuth={false}>
                <TestAuth />
              </AuthCheck>
            }
          />

          {/* Unified ticket status route - handles both authenticated and guest users */}
          <Route
            path="/check-ticket-status"
            element={
              <AuthCheck requireAuth={false}>
                <MainLayout>
                  <CheckTicketStatus />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* My Support Tickets Route - for authenticated users */}
          <Route
            path="/my-tickets"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="Support Tickets">
                <MainLayout>
                  <MyTickets />
                </MainLayout>
              </AuthCheck>
            }
          />

          {/* Support Tickets alias */}
          <Route
            path="/support-tickets"
            element={
              <AuthCheck
                requireAuth={true}
                redirectToLogin={true}
                featureName="Support Tickets">
                <MainLayout>
                  <MyTickets />
                </MainLayout>
              </AuthCheck>
            }
          />
        </Routes>
      </ErrorBoundary>

      <ToastifyContainer />
      <InactivityWarning />
    </>
  );
}

function App() {
  useEffect(() => {
    // Load YouTube iframe API script
    if (!document.getElementById("youtube-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-api";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <FavoritesProvider>
            <ErrorBoundary>
              <ScrollToTop />
              <div className="flex flex-col min-h-screen bg-gray-100">
                <main className="flex-grow">
                  <Suspense
                    fallback={
                      <div className="flex justify-center items-center h-96">
                        <LoadingSpinner />
                      </div>
                    }>
                    <AppContent />
                  </Suspense>
                </main>
              </div>
              <SubscriptionSynchronizerFix refreshInterval={3 * 60 * 1000} />
            </ErrorBoundary>
          </FavoritesProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
