import axios from "axios";

// Configure axios with the correct base URL
axios.defaults.baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:5000"; // Use environment variable with fallback

export default axios;
