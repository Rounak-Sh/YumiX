import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../config/axios";
import { useAuth } from "../context/AuthContext";
import { loadGoogleScript, initializeGoogleAuth } from "../utils/googleAuth";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const setupGoogleAuth = async () => {
      try {
        await loadGoogleScript();
        await initializeGoogleAuth(navigate);
      } catch (error) {
        console.error("Failed to initialize Google auth:", error);
      }
    };

    setupGoogleAuth();
  }, [navigate]);

  const handleLogin = async (values) => {
    try {
      setLoading(true);
      const response = await axiosInstance.post("/auth/login", values);

      if (response.data.success) {
        // Store token in localStorage
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        // Update auth context
        login(response.data.user, response.data.token);

        // Redirect to home page
        navigate("/");
      }
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Other login form elements */}

      {/* Google Sign-In Button */}
      <div id="google-signin-button"></div>
    </div>
  );
};

export default Login;
