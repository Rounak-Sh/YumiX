import React from "react";

/**
 * EmptyState component - displays a message when no data is available
 *
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {string} props.icon - Optional icon component
 * @param {Function} props.actionButton - Optional action button
 */
const EmptyState = ({
  message = "No items found",
  icon = null,
  actionButton = null,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 rounded-lg bg-white/10 text-center ${className}`}>
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <p className="text-white text-lg mb-4">{message}</p>
      {actionButton && <div className="mt-2">{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
