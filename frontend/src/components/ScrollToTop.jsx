import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component
 *
 * Scrolls the window back to the top whenever the route changes
 * This helps improve user experience by ensuring the user starts
 * at the top of the page after navigation
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [pathname]);

  return null; // This component doesn't render anything
};

export default ScrollToTop;
