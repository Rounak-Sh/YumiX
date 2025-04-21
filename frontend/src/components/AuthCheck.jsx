import React, { useState, useRef, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";

/**
 * Improved AuthCheck component with better handling of public routes
 * to prevent unwanted redirects
 */
const AuthCheck = ({
  children,
  requireAuth = true,
  redirectToLogin = false,
  featureName,
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const hasShownModal = useRef(false);
  const didInitialCheck = useRef(false);

  // Create comprehensive public route detection
  const isSubscriptionPage = location.pathname.startsWith("/subscription");
  const isRootOrDashboard =
    location.pathname === "/" || location.pathname === "/dashboard";
  const isAuthPage =
    location.pathname.includes("/login") ||
    location.pathname.includes("/register") ||
    location.pathname.includes("/reset-password") ||
    location.pathname.includes("/verify");
  const isPublicContentPage =
    location.pathname === "/support" ||
    location.pathname === "/faq" ||
    location.pathname === "/contact" ||
    location.pathname.includes("/about") ||
    location.pathname.includes("/privacy-policy") ||
    location.pathname.includes("/terms") ||
    location.pathname.includes("/account-help") ||
    location.pathname.includes("/check-ticket-status");

  // Combine all public path checks
  const isPublicPage =
    isSubscriptionPage ||
    isRootOrDashboard ||
    isPublicContentPage ||
    isAuthPage;

  // Enhanced debug logging
  useEffect(() => {
    if (!didInitialCheck.current) {
      console.log("AuthCheck initial evaluation:", {
        path: location.pathname,
        isPublicPage,
        isSubscriptionPage,
        isRootOrDashboard,
        isAuthPage,
        requireAuth,
        redirectToLogin,
        isAuthenticated,
        loading,
      });
      didInitialCheck.current = true;
    }
  }, [
    location.pathname,
    isPublicPage,
    isSubscriptionPage,
    isRootOrDashboard,
    isAuthPage,
    requireAuth,
    redirectToLogin,
    isAuthenticated,
    loading,
  ]);

  // Set a flag in localStorage for the subscription page
  useEffect(() => {
    if (isSubscriptionPage) {
      localStorage.setItem("onSubscriptionPage", "true");
      console.log("Setting onSubscriptionPage flag in localStorage");
      return () => {
        console.log("Removing onSubscriptionPage flag from localStorage");
        localStorage.removeItem("onSubscriptionPage");
      };
    }
  }, [isSubscriptionPage]);

  // Handle auth modal display with improved logic
  useEffect(() => {
    // Only update when loading is finished
    if (loading) return;

    // For subscription page, NEVER show modal automatically
    if (isSubscriptionPage) {
      // Only show modal if explicitly triggered elsewhere
      if (showAuthModal) {
        console.log("AuthCheck: On subscription page, hiding any open modal");
        setShowAuthModal(false);
      }
      return;
    }

    // For other pages, show modal if needed
    if (
      requireAuth &&
      !isAuthenticated &&
      !redirectToLogin &&
      !hasShownModal.current
    ) {
      console.log(`AuthCheck: Opening auth modal for ${location.pathname}`);
      setShowAuthModal(true);
      hasShownModal.current = true;
    } else if (isAuthenticated) {
      // Reset if user becomes authenticated
      if (showAuthModal) {
        console.log("AuthCheck: User authenticated, closing modal");
        setShowAuthModal(false);
      }
      hasShownModal.current = false;
    }
  }, [
    requireAuth,
    redirectToLogin,
    isAuthenticated,
    loading,
    isSubscriptionPage,
    showAuthModal,
    location.pathname,
  ]);

  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#23486A]"></div>
      </div>
    );
  }

  // SPECIAL CASE: For subscription page, NEVER redirect to login
  if (isSubscriptionPage) {
    console.log(
      `AuthCheck: On subscription page (${location.pathname}), rendering without redirect`
    );
    return children;
  }

  // For other public pages, also don't redirect
  if (isPublicPage) {
    console.log(
      `AuthCheck: On public page (${location.pathname}), rendering without redirect`
    );
    return children;
  }

  // Protected page handling: If auth required but user not authenticated
  if (requireAuth && !isAuthenticated) {
    // Redirect to login if redirectToLogin is true
    if (redirectToLogin) {
      console.log(
        `AuthCheck: Redirecting unauthenticated user from ${location.pathname} to login`
      );
      return (
        <Navigate
          to="/login"
          state={{ from: location.pathname, returnUrl: location.pathname }}
          replace
        />
      );
    }

    // Otherwise show the modal but still render the children
    console.log(
      `AuthCheck: Showing auth modal for ${location.pathname} but rendering children`
    );
    return (
      <>
        {children}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          featureName={featureName}
        />
      </>
    );
  }

  // If authentication is not required but user is authenticated, redirect to dashboard
  // But only for pages that aren't specified as accessible to both guests and authenticated users
  if (!requireAuth && isAuthenticated && !isPublicPage) {
    console.log(
      `AuthCheck: Redirecting authenticated user from ${location.pathname} to dashboard`
    );
    return <Navigate to="/dashboard" replace />;
  }

  // Default: Render children if all checks pass
  console.log(`AuthCheck: All checks passed, rendering ${location.pathname}`);
  return children;
};

export default React.memo(AuthCheck);
