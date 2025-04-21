import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";

const Terms = () => {
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

  const termsSections = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      content: (
        <>
          <p className="mb-3">
            By accessing or using YuMix, you acknowledge that you have read,
            understood, and agree to be bound by these Terms and Conditions. If
            you do not agree to these Terms, you must not access or use our
            services.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and
            YuMix regarding your use of our services. You must be at least 13
            years old to use YuMix. If you are under 18, you represent that you
            have your parent or guardian's permission to use the services.
          </p>
        </>
      ),
    },
    {
      id: "accounts",
      title: "User Accounts",
      content: (
        <>
          <p className="mb-3">
            When you create an account with us, you must provide accurate and
            complete information. You are responsible for safeguarding your
            password and for all activities that occur under your account.
          </p>
          <p>
            We reserve the right to disable any user account if, in our opinion,
            you have violated any provision of these Terms.
          </p>
        </>
      ),
    },
    {
      id: "services",
      title: "Service Description",
      content: (
        <>
          <p className="mb-3">
            YuMix provides a platform for users to search, save, and discover
            recipes. We do not guarantee that our services will always be
            available, or that they will be error-free.
          </p>
          <p>
            We reserve the right to modify, suspend, or discontinue the services
            at any time without notice. We will not be liable if, for any
            reason, all or any part of the services are unavailable at any time
            or for any period.
          </p>
        </>
      ),
    },
    {
      id: "content",
      title: "User Content",
      content: (
        <>
          <p className="mb-3">
            By submitting content to YuMix, you grant us a worldwide,
            non-exclusive, royalty-free license to use, reproduce, modify,
            adapt, publish, translate, and distribute your content in any
            existing or future media.
          </p>
          <p>
            You represent and warrant that you own or have the necessary rights
            to the content you submit, and that the content does not violate the
            rights of any third party.
          </p>
        </>
      ),
    },
    {
      id: "payments",
      title: "Payments & Subscriptions",
      content: (
        <>
          <p className="mb-3">
            Some features of YuMix require payment of fees. You agree to pay all
            fees and charges associated with your account on a timely basis and
            according to the fees schedule and terms displayed to you at the
            time of purchase.
          </p>
          <p className="mb-3">
            Unless otherwise stated, subscriptions automatically renew until
            canceled. You may cancel your subscription at any time from your
            account settings.
          </p>
          <p>
            We reserve the right to change our pricing at any time. If we change
            pricing for a subscription service, we will provide notice of the
            change and allow you to cancel without penalty before the change
            takes effect.
          </p>
        </>
      ),
    },
    {
      id: "disclaimers",
      title: "Disclaimers",
      content: (
        <>
          <p className="mb-3">
            YuMix provides recipe information for general informational purposes
            only. We do not guarantee the accuracy, completeness, or usefulness
            of this information.
          </p>
          <p>
            The services and all included content are provided on an "as is"
            basis without warranty of any kind, whether express or implied. We
            specifically disclaim any and all warranties and conditions of
            merchantability, fitness for a particular purpose, and
            non-infringement.
          </p>
        </>
      ),
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      content: (
        <>
          <p className="mb-3">
            In no event will YuMix, its affiliates, or their licensors, service
            providers, employees, agents, officers, or directors be liable for
            damages of any kind arising from the use of the services.
          </p>
          <p>
            This includes any direct, indirect, special, incidental,
            consequential, or punitive damages, including but not limited to,
            personal injury, pain and suffering, emotional distress, loss of
            revenue, loss of profits, or loss of business or anticipated
            savings.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "Changes to Terms",
      content: (
        <>
          <p className="mb-3">
            We may revise and update these Terms from time to time at our sole
            discretion. All changes are effective immediately when we post them.
          </p>
          <p>
            Your continued use of the services following the posting of revised
            Terms means that you accept and agree to the changes. You are
            expected to check this page frequently so you are aware of any
            changes.
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
          Terms & Conditions
        </h1>
        <div className="h-1 w-32 bg-[#FFCF50] mb-2"></div>
        <p className="text-white font-semibold mb-6">
          Last Updated: March 2025
        </p>

        {/* Introduction */}
        <div className="bg-[#1A3A5F] p-5 rounded-lg mb-5">
          <p className="text-white mb-3">
            Please read these Terms and Conditions carefully before using the
            YuMix website and services. These Terms govern your access to and
            use of YuMix. By accessing or using our services, you agree to be
            bound by these Terms.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-3">
          {termsSections.map((section) => (
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
          <p>For questions about these Terms, contact: support@yumix.com</p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
