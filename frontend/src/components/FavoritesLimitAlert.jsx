import React from "react";
import { useFavorites } from "../context/FavoritesContext";
import { Link } from "react-router-dom";
import { HeartIcon } from "@heroicons/react/24/solid";

const FavoritesLimitAlert = ({ className = "" }) => {
  const { favoritesLimits } = useFavorites();

  // If no limit data or more than 50% slots remaining, don't show the alert
  if (
    !favoritesLimits ||
    favoritesLimits.remaining > favoritesLimits.max * 0.5
  ) {
    return null;
  }

  // Determine color based on remaining slots
  const getColorClass = () => {
    if (favoritesLimits.remaining === 0) {
      return "bg-red-50 border-red-200 text-red-700";
    }
    if (favoritesLimits.remaining < favoritesLimits.max * 0.2) {
      return "bg-orange-50 border-orange-200 text-orange-700";
    }
    return "bg-blue-50 border-blue-200 text-blue-700";
  };

  return (
    <div
      className={`border rounded-lg p-3 mb-4 ${getColorClass()} ${className}`}>
      <div className="flex items-center">
        <HeartIcon className="w-5 h-5 mr-2 flex-shrink-0" />
        <div className="flex-grow">
          <p className="font-medium">
            {favoritesLimits.remaining === 0
              ? "Favorites limit reached"
              : `${favoritesLimits.remaining} favorite slot${
                  favoritesLimits.remaining !== 1 ? "s" : ""
                } remaining`}
          </p>
          <p className="text-sm">
            {favoritesLimits.remaining === 0 ? (
              <>
                You've reached your {favoritesLimits.max} favorites limit on
                your {favoritesLimits.plan} plan.{" "}
                <Link to="/subscription" className="underline font-medium">
                  Upgrade your plan
                </Link>{" "}
                to save more recipes or remove some favorites.
              </>
            ) : (
              <>
                You've saved {favoritesLimits.current} of {favoritesLimits.max}{" "}
                recipes on your {favoritesLimits.plan} plan.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FavoritesLimitAlert;
