import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { showToast } from "@/utils/toast";
import axiosInstance from "../config/axios";
import { submitSupportRequest } from "../services/supportService";

// Simplified FAQ data
const FAQ_DATA = [
  {
    question: "What is YuMix?",
    answer:
      "YuMix is a web application that helps users find recipes based on ingredients they have available. It also features an AI recipe generator that can create unique recipes based on your preferences.",
  },
  {
    question: "How do I search for recipes?",
    answer:
      "Click on 'Recipe Search' in the sidebar menu and enter ingredients or recipe names in the search box. You can also filter recipes by dietary requirements, cooking time, and more.",
  },
  {
    question: "How do I save recipes?",
    answer:
      "When viewing a recipe, click the heart icon to save it to your favorites. You must be logged in to use this feature. You can view all your saved recipes in the 'My Favorites' section.",
  },
  {
    question: "Is YuMix free to use?",
    answer:
      "YuMix has both free and premium subscription options. Free users have limited searches per day, while premium subscribers get unlimited searches, access to the AI recipe generator, and other exclusive features.",
  },
  {
    question: "How does the AI recipe generator work?",
    answer:
      "The AI recipe generator uses natural language processing to create unique recipes based on your input. You can specify ingredients, cuisine type, dietary requirements, and the AI will generate a complete recipe. This feature is available to premium users.",
  },
  {
    question: "Can I use YuMix on my mobile device?",
    answer:
      "Yes, YuMix is fully responsive and works on smartphones and tablets through your mobile browser. We're also planning to develop dedicated mobile apps in the future.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel your subscription at any time from your Profile page under the Subscription section. Your benefits will continue until the current billing period ends.",
  },
];

const Support = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    email: "",
    category: "technical", // Default category
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle FAQ expansion
  const toggleFaq = (index) => {
    if (expandedFaq === index) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(index);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Form submission with actual API call
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Debug authentication status
      console.log("Support form - Authentication status:", {
        isAuthenticated,
        hasUser: !!user,
        userData: user
          ? {
              id: user.id || user._id,
              email: user.email,
            }
          : "No user data",
        token: localStorage.getItem("token") ? "Present" : "Missing",
      });

      // Prepare the support message data
      const supportData = {
        subject: formData.subject,
        message: formData.message,
        category: formData.category,
      };

      console.log("Support form - Submitting data:", supportData);

      // Make API call to save support message - use the submit-request endpoint
      const response = await submitSupportRequest(supportData);

      // Show success message
      showToast.success(
        "Your message has been sent. We'll get back to you soon!"
      );

      // Reset form
      setFormData({
        subject: "",
        message: "",
        email: "",
        category: "technical",
      });

      console.log("Support request submitted successfully:", response);
    } catch (error) {
      console.error("Error submitting support request:", error);

      // Show error message
      showToast.error(
        error.response?.data?.message ||
          "Unable to send your message. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guest user message component
  const GuestUserMessage = () => (
    <div className="bg-[#23486A] p-6 rounded-lg text-center">
      <h3 className="text-xl font-semibold text-white mb-3">
        Sign In to Contact Support
      </h3>
      <p className="text-white mb-4">
        Please sign in or create an account to submit support requests. Having
        an account allows you to track your support tickets and get faster
        assistance.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          to="/login"
          className="px-6 py-2 bg-[#FFCF50] hover:bg-[#FFD76B] text-[#23486A] font-semibold rounded-lg transition-colors">
          Sign In
        </Link>
        <Link
          to="/register"
          className="px-6 py-2 border border-[#FFCF50] text-[#FFCF50] hover:bg-[#FFCF50]/10 font-semibold rounded-lg transition-colors">
          Create Account
        </Link>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? "bg-[#23486A]/75" : "bg-[#f0f0f0]/60"
      } py-10 mt-8 rounded-xl`}>
      <div className="max-w-[90%] mx-auto">
        {/* Header */}
        <h1
          className={`text-4xl font-bold ${
            isDarkMode ? "text-white" : "text-[#23486A]"
          } mb-2`}>
          Help Center
        </h1>
        <div className="h-1 w-32 bg-[#FFCF50] mb-2"></div>
        <p className="text-white font-semibold mb-6">
          Find answers to common questions or get in touch with us
        </p>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column - FAQs */}
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {FAQ_DATA.map((faq, index) => (
                <div
                  key={index}
                  className={`bg-[#1A3A5F] rounded-lg overflow-hidden transition-all duration-300 ${
                    expandedFaq === index ? "shadow-lg" : ""
                  }`}>
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-4 py-3 text-left flex justify-between items-center">
                    <span className="font-medium text-white">
                      {faq.question}
                    </span>
                    <span className="text-[#FFCF50]">
                      {expandedFaq === index ? "−" : "+"}
                    </span>
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 py-3 text-white/90 bg-[#23486A] border-t border-[#FFCF50]/30">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right column - Contact form / Sign in message */}
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Contact Support
            </h2>
            {isAuthenticated ? (
              <>
                <p className="text-white/90 mb-4">
                  Please fill out the form below with details about your
                  inquiry. Our support team will respond to you via email as
                  soon as possible.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="category"
                      className="block text-sm font-medium text-white mb-1">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#23486A] text-white border border-[#FFCF50]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCF50]/50"
                      required>
                      <option value="technical">Technical Issue</option>
                      <option value="account">Account Related</option>
                      <option value="billing">Billing Question</option>
                      <option value="feature">Feature Request</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-white mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#23486A] text-white border border-[#FFCF50]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCF50]/50"
                      placeholder="How can we help you?"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-white mb-1">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows="5"
                      className="w-full p-3 bg-[#23486A] text-white border border-[#FFCF50]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCF50]/50"
                      placeholder="Please describe your issue or question in detail..."
                      required></textarea>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-6 py-2.5 ${
                        isSubmitting
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-[#FFCF50] hover:bg-[#FFD76B]"
                      } text-[#23486A] font-semibold rounded-lg transition-colors`}>
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <GuestUserMessage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
