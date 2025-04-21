/**
 * Collection of helper functions used throughout the application
 */

/**
 * Generates a random alphanumeric code of specified length
 * @param {number} length - Length of the code to generate
 * @returns {string} - Random alphanumeric code
 */
export const generateRandomCode = (length = 6) => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking characters I, O, 0, 1
  let result = "";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
};

/**
 * Formats a date to a readable string
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return "";

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return new Date(date).toLocaleDateString("en-US", options);
};

/**
 * Truncates a string to a specified length and adds ellipsis
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @returns {string} - Truncated string
 */
export const truncateString = (str, length = 100) => {
  if (!str) return "";
  if (str.length <= length) return str;

  return str.substring(0, length) + "...";
};
