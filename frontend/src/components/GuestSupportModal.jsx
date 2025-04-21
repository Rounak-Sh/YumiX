import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  FaQuestionCircle,
  FaLock,
  FaUserSlash,
  FaInfoCircle,
} from "react-icons/fa";
import { showToast } from "@/utils/toast";
import axios from "@/config/axios";
import { Link } from "react-router-dom";

const GuestSupportModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    message: "",
    subject: "Support Request",
    phoneNumber: "",
  });

  // Get email verification code for account reactivation
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  // Add this to your state variables at the top
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitGeneralSupport = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.name || !formData.message) {
      showToast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post("/support/guest", {
        email: formData.email,
        name: formData.name,
        message: formData.message,
        subject: "General Support Request",
        requestType: "general",
      });

      if (response.data.success) {
        showToast.success(
          "Your support request has been sent. We'll get back to you soon!"
        );
        onClose();
      }
    } catch (error) {
      console.error("Error submitting support request:", error);
      showToast.error(
        error.response?.data?.message ||
          "Failed to send support request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitUnblockRequest = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.message) {
      showToast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post("/support/guest", {
        email: formData.email,
        name: formData.name,
        message: formData.message,
        subject: "Account Unblock Request",
        requestType: "unblock",
      });

      if (response.data.success) {
        showToast.success(
          "Your account unblock request has been sent. We'll review your case and get back to you soon."
        );
        // Update success message without reference ID
        setSuccessMessage({
          title: "Request Submitted Successfully",
          message:
            "Your unblock request has been received. We'll process your request and notify you via email.",
        });
        // Don't close modal yet to show the success message
      }
    } catch (error) {
      console.error("Error submitting unblock request:", error);
      showToast.error(
        error.response?.data?.message ||
          "Failed to send unblock request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReactivationCode = async (e) => {
    e.preventDefault();

    if (!formData.email) {
      showToast.error("Please enter your email address");
      return;
    }

    setIsRequestingCode(true);

    try {
      const response = await axios.post("/auth/request-reactivation-otp", {
        email: formData.email,
      });

      if (response.data.success) {
        showToast.success("Verification code has been sent to your email");
        setShowVerificationInput(true);
      }
    } catch (error) {
      console.error("Error requesting verification code:", error);
      showToast.error(
        error.response?.data?.message ||
          "Failed to send verification code. Please try again."
      );
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleSubmitReactivation = async (e) => {
    e.preventDefault();

    if (!formData.email || !verificationCode) {
      showToast.error("Please enter both email and verification code");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post("/auth/reactivate-account", {
        email: formData.email,
        otp: verificationCode,
      });

      if (response.data.success) {
        showToast.success(
          "Your account has been reactivated! You can now log in."
        );
        onClose();
      }
    } catch (error) {
      console.error("Error reactivating account:", error);
      showToast.error(
        error.response?.data?.message ||
          "Failed to reactivate account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-lg w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-[#23486A]">YuMix Support</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex items-center px-4 py-3 ${
              activeTab === "general"
                ? "border-b-2 border-[#FFCF50] text-[#23486A] font-medium"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("general")}>
            <FaQuestionCircle className="mr-2" /> General Support
          </button>
          <button
            className={`flex items-center px-4 py-3 ${
              activeTab === "unblock"
                ? "border-b-2 border-[#FFCF50] text-[#23486A] font-medium"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("unblock")}>
            <FaLock className="mr-2" /> Unblock Account
          </button>
          <button
            className={`flex items-center px-4 py-3 ${
              activeTab === "reactivate"
                ? "border-b-2 border-[#FFCF50] text-[#23486A] font-medium"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("reactivate")}>
            <FaUserSlash className="mr-2" /> Reactivate Account
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "general" && (
            <>
              <div className="mb-4 bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700 flex items-start">
                  <FaInfoCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    Need help with YuMix? Send us a message and we'll get back
                    to you as soon as possible.
                  </span>
                </p>
              </div>
              <form onSubmit={handleSubmitGeneralSupport} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2 rounded-md ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#FFCF50] hover:bg-[#FFD76B]"
                  } text-[#23486A] font-semibold transition-colors`}>
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </>
          )}

          {activeTab === "unblock" && (
            <>
              <div className="mb-4 bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-700 flex items-start">
                  <FaInfoCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    If your account has been blocked, please provide your email
                    address and explain why you believe your account should be
                    unblocked.
                  </span>
                </p>
              </div>
              <form onSubmit={handleSubmitUnblockRequest} className="space-y-4">
                <div>
                  <label
                    htmlFor="unblock-email"
                    className="block text-sm font-medium text-gray-700 mb-1">
                    Account Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="unblock-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="unblock-message"
                    className="block text-sm font-medium text-gray-700 mb-1">
                    Why should your account be unblocked?{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="unblock-message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                    placeholder="Please explain why your account should be unblocked..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2 rounded-md ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#FFCF50] hover:bg-[#FFD76B]"
                  } text-[#23486A] font-semibold transition-colors`}>
                  {isSubmitting ? "Submitting..." : "Submit Unblock Request"}
                </button>
              </form>
            </>
          )}

          {activeTab === "reactivate" && (
            <>
              <div className="mb-4 bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-700 flex items-start">
                  <FaInfoCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    If your account has been deactivated, you can reactivate it
                    by verifying your email address.
                  </span>
                </p>
              </div>
              <form
                onSubmit={
                  showVerificationInput
                    ? handleSubmitReactivation
                    : handleRequestReactivationCode
                }
                className="space-y-4">
                <div>
                  <label
                    htmlFor="reactivate-email"
                    className="block text-sm font-medium text-gray-700 mb-1">
                    Account Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="reactivate-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                    required
                  />
                </div>

                {showVerificationInput && (
                  <div>
                    <label
                      htmlFor="verification-code"
                      className="block text-sm font-medium text-gray-700 mb-1">
                      Verification Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="verification-code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                      placeholder="Enter the 6-digit code sent to your email"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || isRequestingCode}
                  className={`w-full py-2 rounded-md ${
                    isSubmitting || isRequestingCode
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#FFCF50] hover:bg-[#FFD76B]"
                  } text-[#23486A] font-semibold transition-colors`}>
                  {isSubmitting
                    ? "Processing..."
                    : isRequestingCode
                    ? "Sending Code..."
                    : showVerificationInput
                    ? "Reactivate Account"
                    : "Request Verification Code"}
                </button>

                {showVerificationInput && (
                  <button
                    type="button"
                    onClick={() => handleRequestReactivationCode}
                    className="w-full py-2 mt-2 text-sm text-[#23486A] underline">
                    Resend verification code
                  </button>
                )}
              </form>
            </>
          )}

          {/* Add this success message component after form submission */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <h4 className="font-medium text-green-800 mb-2">
                {successMessage.title}
              </h4>
              <p className="text-green-700 mb-3">{successMessage.message}</p>
              <p className="text-sm text-green-700 mb-3">
                You will receive an email notification when we respond to your
                request.
              </p>
              <div className="flex justify-between items-center">
                <Link
                  to={`/check-ticket-status?email=${formData.email}`}
                  className="text-blue-600 hover:underline text-sm"
                  onClick={onClose}>
                  Check Status Later
                </Link>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 text-center text-sm text-gray-500 rounded-b-lg">
          If you need immediate assistance, please email{" "}
          <a
            href="mailto:support@yumix.com"
            className="font-medium text-[#23486A] hover:underline">
            support@yumix.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default GuestSupportModal;
