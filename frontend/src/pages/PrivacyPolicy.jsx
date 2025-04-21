import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";

const PrivacyPolicy = () => {
  const [activeSection, setActiveSection] = useState(null);
  // Add theme context
  const { isDarkMode } = useTheme();

  // Toggle section expansion
  const toggleSection = (section) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };

  const privacySections = [
    {
      id: "introduction",
      title: "Introduction",
      content: (
        <>
          <p className="mb-3">
            This Privacy Policy applies to YuMix's website and related services.
            By accessing or using our services, you agree to this Privacy
            Policy.
          </p>
          <p>
            If you do not agree with our policies and practices, please do not
            use our services. By using YuMix, you consent to the collection,
            use, and sharing of your information as described in this Privacy
            Policy.
          </p>
        </>
      ),
    },
    {
      id: "information",
      title: "Information We Collect",
      content: (
        <>
          <p className="mb-3">We collect the following types of information:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <span className="font-semibold">Account Information:</span> When
              you register, we collect your name, email address, and password.
            </li>
            <li>
              <span className="font-semibold">Profile Information:</span> Your
              profile preferences, dietary restrictions, and cooking interests.
            </li>
            <li>
              <span className="font-semibold">Usage Information:</span> How you
              interact with our services, including recipes viewed, searches
              made, and features used.
            </li>
            <li>
              <span className="font-semibold">Device Information:</span> Data
              about your device, IP address, browser type, and operating system.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "usage",
      title: "How We Use Your Information",
      content: (
        <>
          <p className="mb-3">We use your information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>
              Personalize your experience with relevant recipes and content
            </li>
            <li>Process subscriptions and payments</li>
            <li>Communicate with you about service updates and offers</li>
            <li>Monitor and analyze usage patterns to enhance our platform</li>
            <li>
              Protect against, identify, and prevent fraud and unauthorized
              activity
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies & Technologies",
      content: (
        <>
          <p className="mb-3">
            We use cookies and similar tracking technologies to track activity
            on our services and store certain information. Cookies are files
            with a small amount of data which may include an anonymous unique
            identifier.
          </p>
          <p className="mb-3">These technologies help us:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Remember your preferences and settings</li>
            <li>Understand how you use our services</li>
            <li>Improve your browsing experience</li>
            <li>Deliver relevant advertising</li>
          </ul>
          <p className="mt-3">
            You can set your browser to refuse all cookies or to indicate when a
            cookie is being sent. However, if you do not accept cookies, you may
            not be able to use some portions of our service.
          </p>
        </>
      ),
    },
    {
      id: "sharing",
      title: "Information Sharing",
      content: (
        <>
          <p className="mb-3">We may share your information with:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <span className="font-semibold">Service Providers:</span>{" "}
              Companies that perform services on our behalf, such as payment
              processing, data analysis, and customer service.
            </li>
            <li>
              <span className="font-semibold">Business Partners:</span> With
              your consent, we may share information with business partners to
              offer certain products, services, or promotions.
            </li>
            <li>
              <span className="font-semibold">Legal Requirements:</span> When
              required by law or to protect our rights, safety, and property.
            </li>
          </ul>
          <p className="mt-3">
            We do not sell your personal information to third parties.
          </p>
        </>
      ),
    },
    {
      id: "rights",
      title: "Your Rights",
      content: (
        <>
          <p className="mb-3">
            Depending on your location, you may have certain rights regarding
            your personal information, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              The right to access and receive a copy of your personal
              information
            </li>
            <li>The right to correct or update inaccurate information</li>
            <li>The right to delete your personal information</li>
            <li>The right to restrict or object to processing</li>
            <li>The right to data portability</li>
            <li>The right to withdraw consent at any time</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, please contact us through the contact
            information provided at the end of this policy.
          </p>
        </>
      ),
    },
    {
      id: "updates",
      title: "Policy Updates",
      content: (
        <>
          <p className="mb-3">
            We may update this Privacy Policy from time to time to reflect
            changes in our practices or for other operational, legal, or
            regulatory reasons. We will notify you of any material changes by
            posting the new policy on this page and updating the "Last Updated"
            date.
          </p>
          <p>
            We encourage you to review our Privacy Policy periodically. Your
            continued use of our services after any changes indicates your
            acceptance of the updated Privacy Policy.
          </p>
        </>
      ),
    },
  ];

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? "bg-[#23486A]/75" : "bg-[#f0f0f0]/60"
      }  py-10 mt-8 rounded-xl`}>
      <div className="max-w-[90%] mx-auto">
        {/* Header */}
        <h1
          className={`text-4xl font-bold ${
            isDarkMode ? "text-white" : "text-[#23486A]"
          } mb-2`}>
          Privacy Policy
        </h1>
        <div className="h-1 w-32 bg-[#FFCF50] mb-2"></div>
        <p className="text-white font-semibold mb-6">
          Last Updated: March 2025
        </p>

        {/* Introduction */}
        <div className="bg-[#1A3A5F] p-5 rounded-lg mb-5">
          <p className="text-white mb-3">
            At YuMix, we take your privacy seriously. This Privacy Policy
            describes how we collect, use, and share information about you when
            you use our website and services. Please take a moment to
            familiarize yourself with our privacy practices.
          </p>
        </div>

        {/* Privacy Sections */}
        <div className="space-y-3">
          {privacySections.map((section) => (
            <div
              key={section.id}
              className="bg-[#1A3A5F] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-[#1A3A5F]/80 transition-colors">
                <span className="font-medium text-white">{section.title}</span>
                <span className="text-[#FFCF50] font-bold text-xl">
                  {activeSection === section.id ? "−" : "+"}
                </span>
              </button>
              {activeSection === section.id && (
                <div className="p-4 bg-[#1A3A5F]/80 text-white">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className={`mt-6 text-center ${
            isDarkMode ? "text-white/80" : "text-[#23486A]"
          } text-sm pt-3`}>
          <p>
            For questions about our privacy practices, contact:
            support@yumix.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
