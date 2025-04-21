import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { showToast } from "@/utils/toast";
import { useSubscription } from "../context/SubscriptionContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import useAuthModal from "../hooks/useAuthModal";
import AuthModal from "../components/AuthModal";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { bg_1 } from "../assets/assets.jsx";
import { UnifiedRecipeModal } from "../components";

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { isDarkMode } = useTheme();

  // Add this for debugging
  useEffect(() => {
    console.log("MainLayout rendered with path:", location.pathname);
  }, [location.pathname]);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userImage, setUserImage] = useState(
    "https://randomuser.me/api/portraits/men/32.jpg"
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const {
    isSubscribed,
    plan,
    remainingSearches,
    maxSearches,
    loading: subscriptionLoading,
  } = useSubscription();

  // Auth modal hook
  const {
    showAuthModal,
    featureName,
    handleAuthAction,
    closeAuthModal,
    setShowAuthModal,
    setFeatureName,
  } = useAuthModal();

  // Set up global recipe modal function
  useEffect(() => {
    window.showRecipeModal = (recipe) => {
      setSelectedRecipe(recipe);
      setShowRecipeModal(true);
    };

    return () => {
      // Clean up
      delete window.showRecipeModal;
    };
  }, []);

  // Update user profile information whenever the user object changes
  useEffect(() => {
    if (user) {
      setUserName(user.name || "there");
      setUserEmail(user.email || "user@example.com");
      if (user.profileImage) {
        setUserImage(user.profileImage);
      }
    } else {
      setUserName("there");
      setUserEmail("user@example.com");
    }
  }, [user]);

  const handleLogout = () => {
    logout(); // Use the logout function from AuthContext
    showToast.success("Logged out successfully");
  };

  // Add a specific handler for auth page navigation
  const handleAuthNavigation = (route) => {
    // Use React Router's navigate function
    navigate(route);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle recipe search click
  const handleRecipeSearchClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setFeatureName("Recipe Search");
      setShowAuthModal(true);
    }
  };

  // Simplified background style
  const backgroundStyle = {
    backgroundImage: `url(${bg_1})`,
    backgroundRepeat: "repeat",
    backgroundSize: "800px auto",
    backgroundColor: "#C48229",
    backgroundBlendMode: "multiply",
  };

  return (
    <div className="flex min-h-screen bg-[#C48229]/90 text-[#1A2942] relative overflow-x-hidden">
      {/* Background - integrated directly */}
      <div
        className="absolute inset-0 z-0 opacity-60 pointer-events-none overflow-hidden"
        style={backgroundStyle}></div>

      {/* Dark mode overlay */}
      {isDarkMode && (
        <div className="absolute inset-0 z-0 bg-black/50 pointer-events-none"></div>
      )}

      {/* Navbar */}
      <Navbar
        isAuthenticated={isAuthenticated}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        handleLogout={handleLogout}
        toggleSidebar={toggleSidebar}
      />

      {/* Sidebar - Now fixed, no collapsible state passed */}
      <Sidebar
        isAuthenticated={isAuthenticated}
        isSidebarOpen={isSidebarOpen}
        handleLogout={handleLogout}
        handleRecipeSearchClick={handleRecipeSearchClick}
        toggleSidebar={toggleSidebar}
        handleAuthNavigation={handleAuthNavigation}
      />

      {/* Main Content - with reduced left margin and fixed width calculation */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "md:ml-[18%]" : "md:ml-0"
        } relative z-10 ${
          isAuthenticated ? "mt-16" : "mt-16"
        } custom-scrollbar overflow-y-auto flex flex-col min-h-screen`}
        style={{ width: isSidebarOpen ? "calc(100% - 18%)" : "100%" }}>
        {/* Content with reduced padding */}
        <div className="p-3 md:p-4 flex-grow">
          {/* Page Content */}
          {children}
        </div>

        {/* Footer - Don't show on auth pages */}
        {!location.pathname.includes("/login") &&
          !location.pathname.includes("/register") &&
          !location.pathname.includes("/verification") &&
          !location.pathname.includes("/reset-password") &&
          !location.pathname.includes("/forgot-password") && (
            <div className="mt-auto px-4 pb-4">
              <Footer />
            </div>
          )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        featureName={featureName}
      />

      {/* Recipe Modal */}
      <UnifiedRecipeModal
        recipe={selectedRecipe}
        isOpen={showRecipeModal && !!selectedRecipe}
        onClose={() => setShowRecipeModal(false)}
      />
    </div>
  );
};

export default MainLayout;
