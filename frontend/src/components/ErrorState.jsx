import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/**
 * ErrorState component - displays an error message with retry option
 *
 * @param {Object} props
 * @param {string} props.message - The error message to display
 * @param {Function} props.onRetry - Function to call when retry button is clicked
 */
const ErrorState = ({
  message = "Something went wrong",
  onRetry = null,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 rounded-lg bg-red-500/10 text-center ${className}`}>
      <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-4" />
      <p className="text-red-500 text-lg mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[#FFCF50] text-[#23486A] rounded-lg flex items-center gap-2 mt-4 hover:bg-[#f0c040] transition-colors">
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
