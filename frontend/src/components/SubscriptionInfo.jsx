import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSubscription } from "../context/SubscriptionContext";
import { useAuth } from "../context/AuthContext";
import { FaCrown, FaChartLine } from "react-icons/fa";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import AuthModal from "../components/AuthModal";

const SubscriptionInfo = () => {
  const {
    isSubscribed,
    plan,
    expiryDate,
    remainingSearches,
    maxSearches,
    loading,
  } = useSubscription();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate days remaining
  const getDaysRemaining = (expiryDateString) => {
    if (!expiryDateString) return 0;

    const expiryDate = new Date(expiryDateString);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  // Calculate usage percentage
  const getUsagePercentage = () => {
    if (maxSearches === 0) return 0;
    const used = maxSearches - remainingSearches;
    return Math.round((used / maxSearches) * 100);
  };

  // Handle upgrade button click
  const handleUpgradeClick = () => {
    if (isAuthenticated) {
      navigate("/subscription");
    } else {
      setShowAuthModal(true);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
        <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-[#23486A] p-4 text-white">
        <h3 className="text-lg font-semibold flex items-center">
          <FaCrown className="mr-2 text-[#FFCF50]" />
          Subscription Details
        </h3>
      </div>

      <div className="p-6">
        {isSubscribed ? (
          <>
            <div className="mb-4">
              <span className="text-gray-500 text-sm">Current Plan</span>
              <h4 className="text-xl font-bold text-[#23486A]">{plan?.name}</h4>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#23486A]/5 p-3 rounded-lg">
                <span className="text-gray-500 text-sm">Expires On</span>
                <p className="font-medium text-[#23486A]">
                  {formatDate(expiryDate)}
                </p>
                <p className="text-sm text-green-600 font-medium">
                  {getDaysRemaining(expiryDate)} days remaining
                </p>
              </div>

              <div className="bg-[#23486A]/5 p-3 rounded-lg">
                <span className="text-gray-500 text-sm">Recipe Searches</span>
                <p className="font-medium text-[#23486A]">
                  {remainingSearches} of {maxSearches} remaining
                </p>
                <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#23486A]"
                    style={{ width: `${getUsagePercentage()}%` }}></div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Link
                to="/subscription"
                className="text-[#23486A] hover:text-[#1A3A5F] font-medium text-sm flex items-center">
                View Plan Details
                <ChevronRightIcon className="ml-1 w-4 h-4" />
              </Link>

              <Link
                to="/subscription"
                className="px-4 py-2 bg-[#FFCF50] text-[#23486A] font-bold rounded-md border-2 border-[#23486A] shadow-[4px_4px_0px_0px_rgba(35,72,106,0.5)]
                         hover:bg-[#f0c040] transition-colors active:shadow-none active:translate-x-1 active:translate-y-1">
                Manage Subscription
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="text-gray-500 text-sm">Current Plan</span>
                <h4 className="text-xl font-bold text-[#23486A]">Free Plan</h4>
              </div>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                Limited Access
              </span>
            </div>

            <div className="mb-6">
              <div className="bg-[#23486A]/5 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">Recipe Searches</span>
                  <span className="text-sm font-medium text-[#23486A]">
                    {remainingSearches} of {maxSearches} remaining
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#23486A]"
                    style={{ width: `${getUsagePercentage()}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h5 className="font-medium text-[#23486A] flex items-center mb-2">
                <FaChartLine className="mr-2 text-yellow-600" />
                Upgrade to Premium
              </h5>
              <p className="text-sm text-[#23486A]/80 mb-3">
                Upgrade for unlimited access to all YuMix features and recipes.
              </p>
              <ul className="text-sm text-[#23486A]/80 space-y-1 mb-4">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited recipe searches
                </li>

                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Save and organize favorite recipes
                </li>
              </ul>
            </div>

            <button
              onClick={handleUpgradeClick}
              className="w-full px-4 py-3 bg-[#FFCF50] text-[#23486A] font-bold rounded-md border-2 border-[#23486A] shadow-[4px_4px_0px_0px_rgba(35,72,106,0.5)]
                       hover:bg-[#f0c040] transition-colors active:shadow-none active:translate-x-1 active:translate-y-1 block text-center">
              Upgrade Now
            </button>
          </>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        featureName="Premium Subscription Features"
      />
    </div>
  );
};

export default SubscriptionInfo;
