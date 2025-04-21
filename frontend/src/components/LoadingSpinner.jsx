import React from "react";

/**
 * A reusable loading spinner component with configurable size
 * @param {Object} props Component props
 * @param {string} props.size - Size of the spinner: "sm", "md", "lg"
 * @param {string} props.color - Color of the spinner border (tailwind color)
 */
const LoadingSpinner = ({ size = "md", color = "border-[#FFCF50]" }) => {
  // Define size classes based on prop
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
    xl: "h-16 w-16 border-4",
  };

  // Get the size class or default to medium
  const spinnerSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`animate-spin rounded-full ${spinnerSize} ${color} border-t-transparent`}
      role="status"
      aria-label="Loading">
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;
