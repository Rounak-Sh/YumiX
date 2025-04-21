/**
 * Format a date string or timestamp into a readable format
 * @param {string|number|Date} date - The date to format
 * @param {string} format - Optional format string (defaults to readable format)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = "readable") => {
  try {
    // Handle different date input types
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn("Invalid date provided to formatDate:", date);
      return "Invalid date";
    }

    // Format based on requested format
    if (format === "readable") {
      // Format like: "April 20, 2025"
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (format === "short") {
      // Format like: "04/20/5"
      return dateObj.toLocaleDateString("en-US");
    } else if (format === "datetime") {
      // Format like: "April 20, 2025, 3:30 PM"
      return dateObj.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }

    // Default fallback
    return dateObj.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date error";
  }
};
