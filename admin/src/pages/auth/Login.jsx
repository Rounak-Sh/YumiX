import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import adminApi from "@/services/api";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { yumixLogo } from "@/assets/assets";
import { validateLoginForm } from "@/utils/validation";
import { showToast } from "@/utils/toast";
import axios from "axios";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function Login() {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const [apiUrl, setApiUrl] = useState(window.__API_URL__ || "Unknown");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    skipOtp: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [error, setError] = useState("");

  // Add server status state
  const [serverStatus, setServerStatus] = useState("checking");

  // Check backend connectivity on load
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        await adminApi.checkHealth();
        setServerStatus("online");
      } catch (error) {
        setServerStatus("offline");
        console.error("Backend connection failed:", error);
      }
    };

    checkBackendStatus();
  }, []);

  useEffect(() => {
    // Always clear potentially corrupted tokens on login page load
    // This helps fix cross-browser issues where one browser may have an invalid token
    const storedToken = localStorage.getItem("adminToken");

    console.log("Login page - checking token");
    console.log("Token exists:", !!storedToken);

    // Clear localStorage on first visit to ensure clean state
    if (window.performance && window.performance.navigation.type === 0) {
      console.log(
        "This is a fresh page load, clearing potentially stale token"
      );
      localStorage.removeItem("adminToken");
      return;
    }

    // Only redirect if token appears valid
    if (storedToken && storedToken.length > 50 && storedToken.includes(".")) {
      console.log("Token looks valid, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    } else if (storedToken) {
      console.log("Invalid token found, clearing it");
      localStorage.removeItem("adminToken");
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Log API URL on login attempt
    console.log(
      "Attempting login with API URL:",
      window.__API_URL__ || adminApi?.defaults?.baseURL || "Unknown"
    );

    // Validation
    if (!formData.email || !formData.password) {
      showToast.warning("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!isOnline) {
        setError("You are offline. Please check your internet connection.");
        setLoading(false);
        return;
      }

      const response = await axios.post(
        window.__API_URL__ + "/admin/login",
        {
          email: formData.email,
          password: formData.password,
          skipOtp: formData.skipOtp,
        },
        { withCredentials: true }
      );

      console.log("Login response:", {
        success: response?.data?.success,
        requireOTP: response?.data?.requireOTP,
        message: response?.data?.message,
        hasToken: !!response?.data?.token,
      });

      if (response?.data?.success) {
        if (response.data.requireOTP) {
          console.log("OTP verification required, redirecting to verify-otp");

          // Redirect to OTP verification
          navigate("/verify-otp", {
            state: {
              email: formData.email,
              isLogin: true,
            },
            replace: true,
          });
        } else {
          console.log(
            "No OTP required (bypass mode), proceeding with direct login"
          );

          // Handle successful login with token
          if (response.data.token) {
            console.log("Token received, storing and redirecting to dashboard");
            localStorage.setItem("adminToken", response.data.token);

            // Show success message and redirect
            showToast.success(response.data.message || "Login successful");
            navigate("/dashboard", { replace: true });
          } else {
            console.error("No token received in bypass mode");
            setError("Authentication error: No token received");
          }
        }
      } else {
        setError(response?.data?.message || "Login failed");
      }
    } catch (error) {
      setLoading(false);

      if (error.response && error.response.status === 401) {
        setError("Invalid email or password");
      } else if (error.response && error.response.status === 429) {
        setError("Too many login attempts. Please try again later.");
      } else if (error.code === "ERR_NETWORK") {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.email.trim()) {
      showToast.error("Please enter your email address first");
      return;
    }

    if (!isOnline) {
      showToast.error(
        "You are offline. Please check your internet connection."
      );
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const response = await adminApi.forgotPassword(formData.email);

      if (response.data.success) {
        showToast.success("OTP sent successfully!");
        navigate("/verify-otp", {
          state: {
            email: formData.email,
            isForgotPassword: true,
          },
          replace: true,
        });
      }
    } catch (error) {
      showToast.error(
        error.response?.data?.message || "Failed to process request"
      );
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleCheckboxChange = (e) => {
    setFormData({ ...formData, skipOtp: e.target.checked });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1E1E1E] px-4 relative">
      {/* Show server status indicator */}
      <div className="absolute top-4 right-4 flex items-center">
        <span className="text-sm text-gray-400 mr-2">Server Status:</span>
        <span
          className={`w-3 h-3 rounded-full ${
            serverStatus === "online"
              ? "bg-green-500"
              : serverStatus === "offline"
              ? "bg-red-500"
              : "bg-yellow-500"
          }`}></span>
        <span className="text-sm ml-2 text-gray-400">
          {serverStatus === "online"
            ? "Connected"
            : serverStatus === "offline"
            ? "Offline"
            : "Checking..."}
        </span>
      </div>

      {/* Info message when server is offline */}
      {serverStatus === "offline" && (
        <div className="absolute top-12 right-4 text-yellow-300 text-xs max-w-xs text-right">
          The backend server may be in sleep mode. It will wake up after the
          first request, please try again in a moment.
        </div>
      )}

      <div className="flex w-full max-w-4xl h-[380px] rounded-lg border border-[#333333] shadow-lg overflow-hidden">
        {/* Logo Section */}
        <div className="hidden md:flex w-1/2 bg-[#252525] border-r border-[#333333] items-center justify-center">
          <div className="text-center">
            <img
              src={yumixLogo}
              alt="YumiX Admin"
              className="w-80 h-80 object-contain opacity-90 mb-[-35px]"
            />
            <h1 className="text-[#E0E0E0] text-2xl font-medium mb-10">
              Administrator Portal
            </h1>
          </div>
        </div>

        {/* Form Section */}
        <div
          className="w-full md:w-1/2 bg-[#252525] p-10
            overflow-auto 
            custom-scrollbar">
          <div className="space-y-6">
            <div>
              <h2 className="text-[#E0E0E0] text-xl font-medium">
                Welcome Back
              </h2>
              <p className="text-[#666666] mt-1">
                Sign in to your admin account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <input
                type="text"
                name="email"
                placeholder="Email Address"
                className="w-full bg-[#2A2A2A] text-[#E0E0E0] px-4 h-11 rounded-md border border-[#333333]
                         focus:outline-none focus:border-[#4A4A4A] transition-colors
                         placeholder-[#666666]"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                autoComplete="email"
                spellCheck="false"
                required
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  className="w-full bg-[#2A2A2A] text-[#E0E0E0] px-4 h-11 rounded-md border border-[#333333]
                           focus:outline-none focus:border-[#4A4A4A] transition-colors
                           placeholder-[#666666]"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </div>
              </div>

              <div className="flex justify-end relative">
                {!forgotPasswordLoading && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm font-medium text-[#2d8cf0] hover:underline">
                    Forgot password?
                  </button>
                )}
                {forgotPasswordLoading && (
                  <div className="flex justify-center items-center gap-1">
                    <div className="w-2 h-2 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_infinite]"></div>
                    <div className="w-2 h-2 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_0.1s_infinite]"></div>
                    <div className="w-2 h-2 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_0.2s_infinite]"></div>
                  </div>
                )}
              </div>

              {/* Skip OTP Checkbox */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="skipOtp"
                  checked={formData.skipOtp}
                  onChange={handleCheckboxChange}
                  className="w-4 h-4"
                />
                <label htmlFor="skipOtp" className="text-sm text-gray-700">
                  Skip OTP verification (for development)
                </label>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  disabled={loading || forgotPasswordLoading || !isOnline}
                  className="w-44 bg-[#252525] text-[#E0E0E0] font-bold uppercase
                           border border-[#333333] rounded-md
                           flex items-center justify-center px-4 py-4 transition-all duration-420
                           before:content-[''] before:bg-white before:h-[1px] 
                           before:w-0 before:mr-2 before:transition-all before:duration-420
                           hover:before:w-12 hover:text-white 
                           disabled:opacity-50 disabled:cursor-not-allowed 
                           disabled:hover:border-[#333333]
                           disabled:hover:text-[#E0E0E0] disabled:hover:before:w-0">
                  {loading ? (
                    <div className="flex justify-center items-center gap-1">
                      <div className="w-2 h-2 bg-[#bdb4b4] rounded-full animate-[bounce_0.7s_infinite]"></div>
                      <div className="w-2 h-2 bg-[#bdb4b4] rounded-full animate-[bounce_0.7s_0.1s_infinite]"></div>
                      <div className="w-2 h-2 bg-[#bdb4b4] rounded-full animate-[bounce_0.7s_0.2s_infinite]"></div>
                    </div>
                  ) : (
                    <>Sign in</>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-4 text-red-500 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Credentials Display */}
      <div className="absolute bottom-4 text-center w-full">
        <button
          onClick={() =>
            document.getElementById("admin-creds").classList.toggle("hidden")
          }
          className="text-[#666666] hover:text-[#E0E0E0] text-sm flex items-center justify-center mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          Admin Access
        </button>
        <div
          id="admin-creds"
          className="hidden mt-2 mx-auto max-w-xs bg-[#252525] border border-[#333333] rounded-lg p-3">
          <p className="text-[#666666] text-xs">Admin Credentials:</p>
          <p className="text-[#E0E0E0] text-sm">Email: admin@yumix.com</p>
          <p className="text-[#E0E0E0] text-sm">Password: admin123</p>
        </div>
      </div>
    </div>
  );
}
