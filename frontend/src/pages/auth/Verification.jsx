import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { yumixLogo } from "../../assets/assets.jsx";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import axios from "@/config/axios";
import { showToast } from "@/utils/toast";

export default function Verification() {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const location = useLocation();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showSuccess, setShowSuccess] = useState(false);
  const [visible, setVisible] = useState(false);
  const [canResend, setCanResend] = useState(true);

  // Get user info from navigation state
  const userId = location.state?.userId;
  const contact = location.state?.contact;
  const isForgotPassword = location.state?.isForgotPassword;
  const isProfileUpdate = location.state?.isProfileUpdate;
  const verificationType = location.state?.verificationType;

  useEffect(() => {
    if (!location.state?.userId) {
      // Try to recover from verificationDetails in localStorage
      const verificationDetails = localStorage.getItem("verificationDetails");
      if (verificationDetails) {
        const details = JSON.parse(verificationDetails);
        console.log(
          "Recovered verification details from localStorage:",
          details
        );

        // Recreate the state
        navigate("/verify", {
          state: details,
          replace: true,
        });
        return;
      }

      // If no recovery possible, go to login
      console.log(
        "No userId in state and no recovery data found. Redirecting to login."
      );
      navigate("/login");
      return;
    }

    // Check if this is a profile update but missing necessary state
    if (location.state?.isProfileUpdate) {
      // Check if we have the necessary data
      if (!location.state.contact || !location.state.verificationType) {
        // Try to recover from localStorage
        const storedData = localStorage.getItem("profileUpdateData");
        if (storedData) {
          const formData = JSON.parse(storedData);

          // Get the current user info to determine what needs verification
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          const emailChanged = formData.email !== currentUser.email;
          const phoneChanged = formData.phone !== currentUser.phone;

          if (emailChanged || phoneChanged) {
            // Determine which field to verify first (prioritize email)
            const typeToVerify = emailChanged ? "email" : "phone";
            const contactToVerify = emailChanged
              ? formData.email
              : formData.phone;

            // Update the navigation state
            navigate("/verify", {
              state: {
                userId: currentUser.id || location.state.userId,
                contact: contactToVerify,
                verificationType: typeToVerify,
                isProfileUpdate: true,
              },
              replace: true,
            });
          } else {
            // No sensitive info changed, go back to profile
            showToast.info("No verification needed. Returning to profile.");
            navigate("/profile");
          }
        } else {
          // No data found, go back to profile
          showToast.error("Missing profile data. Please try again.");
          navigate("/profile");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple digits

    // Only allow digits
    const digit = value.replace(/\D/g, "");

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Move to next input if a digit was entered
    if (digit && index < 5) {
      const nextInput = document.querySelector(
        `input[name='otp-${index + 1}']`
      );
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // If current input is empty, move to previous input
        const prevInput = document.querySelector(
          `input[name='otp-${index - 1}']`
        );
        if (prevInput) {
          prevInput.focus();
        }
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }

    // Handle left arrow
    if (e.key === "ArrowLeft" && index > 0) {
      const prevInput = document.querySelector(
        `input[name='otp-${index - 1}']`
      );
      if (prevInput) {
        prevInput.focus();
      }
    }

    // Handle right arrow
    if (e.key === "ArrowRight" && index < 5) {
      const nextInput = document.querySelector(
        `input[name='otp-${index + 1}']`
      );
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const otpString = otp.join("");
      if (otpString.length !== 6) {
        showToast.error("Please enter all digits");
        return;
      }

      setLoading(true);
      let response;

      if (isProfileUpdate) {
        // For profile update verification
        console.log("Verifying profile update OTP with parameters:", {
          type: verificationType,
          otp: otpString,
        });

        // Get stored form data
        const storedData = localStorage.getItem("profileUpdateData");
        if (!storedData) {
          showToast.error("Missing profile data. Please try again.");
          navigate("/profile");
          return;
        }

        const formData = JSON.parse(storedData);

        // Call the appropriate endpoint to verify and update profile
        const dataToUpdate =
          verificationType === "email"
            ? { email: formData.email, otp: otpString, type: "email" }
            : { phone: formData.phone, otp: otpString, type: "phone" };

        response = await axios.put(
          "/api/users/profile/update-with-otp",
          dataToUpdate
        );

        console.log("Profile update verification response:", response.data);

        if (response.data.success) {
          showToast.success(
            `Your ${verificationType} has been updated successfully`
          );

          // Check if there's another verification needed
          const emailChanged =
            formData.email !==
            JSON.parse(localStorage.getItem("user") || "{}").email;
          const phoneChanged =
            formData.phone !==
            JSON.parse(localStorage.getItem("user") || "{}").phone;

          // If we just verified email and phone also needs verification
          if (verificationType === "email" && phoneChanged) {
            // Request a new OTP for phone and update the page state
            console.log(
              "Email verified, now requesting OTP for phone:",
              formData.phone
            );

            const phoneRequestPayload = {
              type: "phone",
              newValue: formData.phone,
              sendToNew: true,
            };

            console.log(
              "Phone OTP request payload:",
              JSON.stringify(phoneRequestPayload)
            );

            const otpResponse = await axios.post(
              "/api/users/profile/update-otp",
              phoneRequestPayload
            );

            console.log("Phone OTP response:", otpResponse.data);

            if (otpResponse.data.success) {
              showToast.success(`Verification code sent to ${formData.phone}`);

              // Update the page state to continue with phone verification
              setOtp(["", "", "", "", "", ""]);
              navigate("/verify", {
                state: {
                  userId,
                  contact: formData.phone,
                  verificationType: "phone",
                  isProfileUpdate: true,
                },
                replace: true,
              });
            } else {
              showToast.error(
                otpResponse.data.message || "Failed to send verification code"
              );
              navigate("/profile");
            }
            return;
          }

          // If the verification was for password change
          if (verificationType === "password") {
            console.log("Password change verification successful");

            // Update password from stored data
            if (
              formData.changePassword &&
              formData.newPassword &&
              formData.currentPassword
            ) {
              const passwordResponse = await axios.put(
                "/api/users/profile/update-with-otp",
                {
                  type: "password",
                  otp: otpString,
                  currentPassword: formData.currentPassword,
                  newPassword: formData.newPassword,
                  confirmPassword: formData.confirmPassword,
                }
              );

              if (passwordResponse.data.success) {
                showToast.success("Password updated successfully");
              } else {
                showToast.error(
                  passwordResponse.data.message || "Failed to update password"
                );
              }
            }
          }

          // If we've completed all verifications, update non-sensitive info
          const updateResponse = await axios.put("/api/users/profile", {
            name: formData.name,
          });

          // Update password if needed
          if (formData.changePassword) {
            await axios.put("/api/users/profile/password", {
              currentPassword: formData.currentPassword,
              newPassword: formData.newPassword,
              confirmPassword: formData.confirmPassword,
            });
          }

          // Clean up stored data
          localStorage.removeItem("profileUpdateData");
          localStorage.removeItem("verificationDetails");

          // Refresh user data and navigate back to profile
          const userResponse = await axios.get("/api/users/profile");
          if (userResponse.data.success) {
            const userData = userResponse.data.data;
            const currentUser = JSON.parse(
              localStorage.getItem("user") || "{}"
            );
            const mergedUser = { ...currentUser, ...userData };
            localStorage.setItem("user", JSON.stringify(mergedUser));
          }

          navigate("/profile", { replace: true });
        }
      } else if (isForgotPassword) {
        // Log request parameters for debugging
        console.log("Verifying reset OTP with parameters:", {
          contact: contact,
          otp: otpString,
        });

        // Backend expects 'contact' for verify-reset-otp
        response = await axios.post("/api/auth/verify-reset-otp", {
          contact: contact,
          otp: otpString,
        });

        console.log("Verify reset OTP response:", response.data);

        if (response.data.success) {
          showToast.success("OTP verified successfully");
          navigate("/reset-password", {
            state: {
              userId: response.data.userId,
              isVerified: true,
            },
            replace: true,
          });
        }
      } else {
        response = await axios.post("/api/auth/verify-otp", {
          tempUserId: location.state?.userId,
          otp: otpString,
          isGoogleSignup: location.state?.isGoogleSignup,
        });

        if (response.data.success) {
          if (response.data.token) {
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("user", JSON.stringify(response.data.user));

            if (location.state?.isGoogleSignup) {
              showToast.success("Account verified successfully");
              navigate("/dashboard", { replace: true });
              return;
            }
          }

          showToast.success("Account verified successfully");
          setShowSuccess(true);
          setVisible(true);

          setTimeout(() => {
            setVisible(false);
            navigate("/login", { replace: true });
          }, 2000);
        }
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      console.error("Error response data:", err.response?.data);

      // Provide more specific error messages based on the error
      const errorResponse = err.response?.data;

      if (errorResponse?.message?.includes("expired")) {
        showToast.error(
          "Verification code has expired. Please use the Resend Code button."
        );
      } else if (errorResponse?.message?.includes("invalid")) {
        showToast.error(
          "Invalid verification code. Please check and try again."
        );
      } else if (errorResponse?.message?.includes("attempts")) {
        showToast.error("Too many failed attempts. Please request a new code.");
      } else {
        showToast.error(
          errorResponse?.message || "Verification failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setResendLoading(true);

      // Debug location.state contents to verify what we're receiving
      console.log("Full location.state contents:", location.state);
      console.log("isForgotPassword:", isForgotPassword);
      console.log("isProfileUpdate:", isProfileUpdate);
      console.log("userId from state:", location.state?.userId);
      console.log("contact from state:", location.state?.contact);

      let response;

      if (isProfileUpdate) {
        // For profile update OTP resend
        console.log("Resending profile update OTP");
        console.log("Verification type:", verificationType);
        console.log("Contact:", contact);

        if (!contact || !verificationType) {
          console.error(
            "Missing contact info or verification type for OTP resend"
          );
          showToast.error(
            "Missing information. Please try again or return to profile."
          );
          setResendLoading(false);
          return;
        }

        // Use the requestUpdateOTP endpoint with explicit logging
        const requestPayload = {
          type: verificationType,
          newValue: contact,
          sendToNew: verificationType !== "password", // Don't send to new for password changes
        };

        console.log(
          "Resend OTP request payload:",
          JSON.stringify(requestPayload)
        );

        response = await axios.post(
          "/api/users/profile/update-otp",
          requestPayload
        );

        console.log("Profile update OTP resend response:", response.data);
      } else if (isForgotPassword) {
        // For forgot password - we need to use the forgot-password endpoint
        // The resend-otp endpoint only works for registration
        console.log(
          "Resending password reset OTP by using forgot-password endpoint"
        );

        if (!contact) {
          console.error("Missing contact info for password reset OTP resend");
          showToast.error(
            "Missing contact information. Please try again or return to login."
          );
          setResendLoading(false);
          return;
        }

        // Use the same endpoint that was used in Login.jsx
        response = await axios.post("/api/auth/forgot-password", {
          emailOrPhone: contact, // Backend expects emailOrPhone for forgot-password
        });

        console.log("Forgot password response for resend:", response.data);
      } else {
        // For registration - needs tempUserId
        const tempUserId = location.state?.userId;
        if (!tempUserId) {
          console.error("Missing tempUserId for registration OTP resend");
          showToast.error(
            "Missing user ID. Please try again or return to registration."
          );
          setResendLoading(false);
          return;
        }

        // Use regular resend-otp endpoint for registration
        console.log("Sending resend OTP request to:", "/api/auth/resend-otp");
        response = await axios.post("/api/auth/resend-otp", {
          tempUserId: tempUserId,
        });
        console.log("Resend OTP response:", response.data);
      }

      if (response.data.success) {
        showToast.success("New verification code sent successfully");

        // If we're in dev mode and get an OTP in the response, show it
        if (response.data.devOtp) {
          showToast.success(`Development OTP: ${response.data.devOtp}`);
        }

        // Reset timer
        setTimer(60);
        setCanResend(false);
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.response?.data?.message);
      showToast.error(
        error.response?.data?.message || "Failed to resend verification code"
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Success Banner */}
      <div
        className={`fixed top-0 left-0 right-0 flex justify-center transition-all duration-500 ease-out 
                    ${
                      showSuccess
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0"
                    } 
                    ${visible ? "" : "pointer-events-none"}`}>
        <div
          className="flex items-center gap-3 bg-[#4ade80] text-white px-8 py-6 rounded-b-lg 
                     shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] border-2 border-t-0 border-[#323232]">
          <CheckCircleIcon className="w-7 h-7 text-white" />
          <div className="flex flex-col">
            <span className="text-xl font-bold">
              {isProfileUpdate
                ? `${
                    verificationType === "email" ? "Email" : "Phone"
                  } Updated Successfully!`
                : isForgotPassword
                ? "OTP Verified Successfully!"
                : "Account Created Successfully!"}
            </span>
            <span className="text-base">
              {isProfileUpdate
                ? "Returning to your profile..."
                : isForgotPassword
                ? "Please reset your password..."
                : "Redirecting to login page..."}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-4xl rounded-lg border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] overflow-hidden">
        {/* Logo Section */}
        <div className="hidden md:flex w-1/2 items-center justify-center p-4 bg-[#23486A]">
          <img
            src={yumixLogo}
            alt="YumiX Logo"
            className="max-w-full h-auto max-h-[400px] object-contain transform scale-105"
          />
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 bg-gray-200">
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div className="mb-6">
              <h2 className="text-[#323232] text-2xl font-black">
                {isProfileUpdate
                  ? `Verify Your ${
                      verificationType === "email"
                        ? "Email"
                        : verificationType === "phone"
                        ? "Phone"
                        : "Password"
                    } Change`
                  : isForgotPassword
                  ? "Verify Password Reset"
                  : "Verify your account"}
              </h2>
              <span className="text-[#666] text-lg font-semibold block mb-2">
                Enter the verification code
              </span>
              <span className="text-sm text-[#666]">
                {isProfileUpdate ? (
                  <>
                    We've sent a 6-digit code to your{" "}
                    {verificationType === "email"
                      ? "NEW email address"
                      : verificationType === "phone"
                      ? "NEW phone number"
                      : "current email address"}{" "}
                    {verificationType !== "password" && (
                      <span className="font-bold">{contact}</span>
                    )}
                  </>
                ) : isForgotPassword ? (
                  "Use the 6-digit code from your email or phone number to reset your password"
                ) : (
                  "Use the 6-digit code from your email or phone number to verify your account"
                )}
              </span>

              {isProfileUpdate && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Important:</strong>{" "}
                    {verificationType === "password"
                      ? "For security reasons, we sent the verification code to your current email address. This ensures only you can change your password."
                      : `The verification code has been sent to your ${
                          verificationType === "email"
                            ? "NEW email address"
                            : "NEW phone number"
                        }, not your current one.`}
                  </p>
                </div>
              )}
            </div>

            {/* OTP Input Fields */}
            <div className="flex gap-2 justify-center mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  name={`otp-${index}`}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold rounded-md border-2 border-[#323232] 
                           shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] bg-white text-[#323232]
                           focus:border-[#2d8cf0] outline-none"
                  maxLength={1}
                  inputMode="numeric"
                  pattern="\d*"
                  autoComplete="off"
                  required
                />
              ))}
            </div>

            {/* Resend Timer */}
            <div className="text-center text-sm text-[#666]">
              {timer > 0 ? (
                <span>Resend code in {timer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendLoading}
                  className="text-[#2d8cf0] hover:underline font-semibold">
                  {resendLoading ? (
                    <div className="flex justify-center items-center gap-1">
                      <div className="w-2 h-2 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_infinite]" />
                      <div className="w-2 h-2 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_0.1s_infinite]" />
                      <div className="w-2 h-2 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_0.2s_infinite]" />
                    </div>
                  ) : (
                    "Resend code"
                  )}
                </button>
              )}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-32 h-10 mt-4 mx-auto rounded-md border-2 border-[#323232] bg-white shadow-[4px_4px_0px_0px_rgba(50,50,50,1)]
                       text-[#323232] font-semibold text-lg
                       active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                       disabled:opacity-50 disabled:cursor-not-allowed">
              Verify →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
