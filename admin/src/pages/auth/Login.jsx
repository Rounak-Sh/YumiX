import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import adminApi from "@/services/api";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { yumixLogo } from "@/assets/assets";
import { validateLoginForm } from "@/utils/validation";
import { showToast } from "@/utils/toast";

export default function Login() {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const [apiUrl, setApiUrl] = useState(window.__API_URL__ || "Unknown");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

      const response = await adminApi.login(formData);

      if (response?.data?.success) {
        if (response.data.requireOTP) {
          // Redirect to OTP verification
          navigate("/verify-otp", {
            state: {
              email: formData.email,
              isLogin: true,
            },
            replace: true,
          });
        } else {
          // Handle successful login with token
          const { token } = response.data;
          localStorage.setItem("adminToken", token);

          // Show success message and redirect
          showToast.success("Login successful");
          navigate("/");
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

  // Add a new handler for demo login
  const handleDemoLogin = async () => {
    if (!isOnline) {
      showToast.error(
        "You are offline. Please check your internet connection."
      );
      return;
    }

    setDemoLoading(true);
    setError("");

    try {
      // Use the demo credentials
      const response = await adminApi.demoLogin({
        email: "demo@yumix.com",
        password: "demo123",
      });

      if (response?.data?.success) {
        // Store the token
        localStorage.setItem("adminToken", response.data.token);

        // Also store a flag indicating this is a demo session
        localStorage.setItem("demoMode", "true");

        // Show success message and redirect
        showToast.success("Demo mode activated");
        navigate("/dashboard", { replace: true });
      } else {
        setError(response?.data?.message || "Demo login failed");
      }
    } catch (error) {
      setError("Demo login failed. Please try again later.");
      console.error("Demo login error:", error);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1E1E1E] px-4 relative">
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
                onChange={handleChange}
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
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#E0E0E0]">
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Add Demo Login Hint */}
              <div className="p-3 bg-[#2A2A2A] rounded-md mt-2 text-sm border border-[#333333]">
                <p className="text-[#E0E0E0]">
                  <span className="font-bold">Demo Access:</span> Use these
                  credentials to explore the admin dashboard
                </p>
                <div className="flex flex-col mt-1 text-[#999999]">
                  <code>Email: demo@yumix.com</code>
                  <code>Password: demo123</code>
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

              <div className="flex flex-col space-y-3 mt-6">
                <button
                  type="submit"
                  disabled={loading || forgotPasswordLoading || !isOnline}
                  className="w-full bg-[#252525] text-[#E0E0E0] font-bold uppercase
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

                {/* Add Demo Mode Button */}
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={demoLoading || !isOnline}
                  className="w-full bg-[#2A2A2A] text-[#E0E0E0] font-bold 
                           border border-[#333333] rounded-md
                           flex items-center justify-center px-4 py-3 transition-colors
                           hover:bg-[#333333] 
                           disabled:opacity-50 disabled:cursor-not-allowed">
                  {demoLoading ? (
                    <div className="flex justify-center items-center gap-1">
                      <div className="w-2 h-2 bg-[#bdb4b4] rounded-full animate-[bounce_0.7s_infinite]"></div>
                      <div className="w-2 h-2 bg-[#bdb4b4] rounded-full animate-[bounce_0.7s_0.1s_infinite]"></div>
                      <div className="w-2 h-2 bg-[#bdb4b4] rounded-full animate-[bounce_0.7s_0.2s_infinite]"></div>
                    </div>
                  ) : (
                    <>Try Demo Mode</>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-4 text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <div className="text-center text-xs text-[#666666] mt-4">
              Demo mode provides limited access with read-only permissions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
