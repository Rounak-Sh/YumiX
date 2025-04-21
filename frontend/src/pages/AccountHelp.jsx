import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { Link } from "react-router-dom";

const AccountHelp = () => {
  const [activeSection, setActiveSection] = useState(null);
  const { isDarkMode } = useTheme();

  // Toggle section expansion
  const toggleSection = (section) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };

  const accountHelpSections = [
    {
      id: "deactivation",
      title: "Account Deactivation",
      content: (
        <>
          <p className="mb-3">
            When you deactivate your YuMix account, the following happens:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your account will be marked as "inactive" in our system</li>
            <li>You will no longer be able to log in to YuMix</li>
            <li>Your profile will not be visible to other users</li>
            <li>You will stop receiving emails and notifications from YuMix</li>
            <li>
              Your preferences, favorites, and personal data will be preserved
            </li>
          </ul>
          <p className="mt-3">
            Unlike permanent deletion, deactivation allows you to reactivate
            your account in the future and regain access to your data.
          </p>
        </>
      ),
    },
    {
      id: "reactivation",
      title: "Account Reactivation",
      content: (
        <>
          <p className="mb-3">
            If you've deactivated your account and wish to return to YuMix, you
            can request reactivation by:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              Contacting our support team at{" "}
              <a
                href="mailto:support@yumix.com"
                className="text-[#FFCF50] hover:underline">
                support@yumix.com
              </a>
            </li>
            <li>Providing your registered email address and full name</li>
            <li>Specifying that you'd like to reactivate your account</li>
          </ol>
          <p className="mt-3">
            Our support team will verify your identity and reactivate your
            account within 1-2 business days. Once reactivated, you'll receive a
            confirmation email with instructions to reset your password and
            access your account.
          </p>
        </>
      ),
    },
    {
      id: "data-retention",
      title: "Data Retention Policy",
      content: (
        <>
          <p className="mb-3">When your account is deactivated:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>All your account data is preserved securely on our servers</li>
            <li>
              Your saved recipes, favorites, and preferences remain intact
            </li>
            <li>Your subscription information is maintained (if applicable)</li>
            <li>
              Your personal information remains protected under our{" "}
              <Link
                to="/privacy-policy"
                className="text-[#FFCF50] hover:underline">
                Privacy Policy
              </Link>
            </li>
          </ul>
          <p className="mt-3">
            We retain deactivated account data for a period of 12 months. If you
            don't reactivate your account within this period, we may consider
            your account for permanent deletion. You will receive a notification
            email before any permanent deletion occurs.
          </p>
        </>
      ),
    },
    {
      id: "versus-deletion",
      title: "Deactivation vs. Permanent Deletion",
      content: (
        <>
          <p className="mb-3">
            <span className="font-semibold">Account Deactivation:</span>
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li>Temporary suspension of account access</li>
            <li>All your data is preserved</li>
            <li>You can reactivate your account at any time</li>
            <li>Your subscription status is maintained</li>
          </ul>
          <p className="mb-3">
            <span className="font-semibold">Permanent Deletion:</span>
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Complete removal of your account and associated data</li>
            <li>Cannot be undone or recovered</li>
            <li>
              All of your personal data, preferences, and saved recipes are
              deleted
            </li>
            <li>
              You would need to create a new account if you wish to use YuMix
              again
            </li>
          </ul>
          <p className="mt-3">
            We currently offer account deactivation rather than permanent
            deletion to give our users flexibility in their account management
            decisions. If you require permanent deletion for compliance with
            data protection regulations, please contact our support team.
          </p>
        </>
      ),
    },
  ];

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
          Account Management Help
        </h1>
        <div className="h-1 w-32 bg-[#FFCF50] mb-2"></div>
        <p className="text-white font-semibold mb-6">
          Learn about account deactivation and reactivation
        </p>

        {/* Introduction */}
        <div className="bg-[#1A3A5F] p-5 rounded-lg mb-5">
          <p className="text-white mb-3">
            At YuMix, we understand that you might need to take a break from our
            platform. Instead of permanently deleting your account, we offer an
            account deactivation option that preserves your data and allows you
            to return whenever you're ready.
          </p>
        </div>

        {/* Help Sections */}
        <div className="space-y-3">
          {accountHelpSections.map((section) => (
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

        {/* CTA Section */}
        <div className="mt-8 bg-[#1A3A5F] p-5 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-3">
            Need Additional Help?
          </h2>
          <p className="text-white mb-4">
            If you have any questions about account deactivation or
            reactivation, our support team is here to help.
          </p>
          <Link
            to="/support"
            className="inline-block bg-[#FFCF50] text-[#23486A] px-4 py-2 rounded-md font-medium hover:bg-[#FFCF50]/90 transition-colors">
            Contact Support
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-white/80 text-sm pt-3">
          <p>
            For immediate assistance:{" "}
            <a href="mailto:support@yumix.com" className="hover:underline">
              support@yumix.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountHelp;
