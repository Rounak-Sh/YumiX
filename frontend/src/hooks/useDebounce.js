import { useState, useEffect } from "react";

/**
 * A hook that delays the processing of the input value.
 * @param {any} value - The value to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {any} - The debounced value.
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if the value changes or the component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
