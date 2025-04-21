import React, { useState } from "react";
import GuestSupportModal from "../components/GuestSupportModal";
import { submitGuestSupportRequest } from "../services/supportService";

const TestAuth = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testResponse, setTestResponse] = useState(null);

  const testGuestSupport = async () => {
    try {
      const response = await submitGuestSupportRequest({
        email: "test@example.com",
        name: "Test User",
        message: "This is a test support request",
        subject: "Test Request",
        requestType: "general",
      });

      setTestResponse(response);
    } catch (error) {
      setTestResponse({
        error: true,
        message: error.message || "An error occurred",
        details: error.response?.data || {},
      });
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">
        Test Guest Support Implementation
      </h1>

      <div className="space-y-4 mb-8">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
          Open Support Modal
        </button>

        <button
          onClick={testGuestSupport}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded ml-4">
          Test Direct API Call
        </button>
      </div>

      {testResponse && (
        <div
          className={`p-4 rounded mt-4 ${
            testResponse.error
              ? "bg-red-100 border border-red-300"
              : "bg-green-100 border border-green-300"
          }`}>
          <h3 className="font-semibold">API Response:</h3>
          <pre className="mt-2 overflow-auto max-h-96 p-2 bg-gray-50 rounded">
            {JSON.stringify(testResponse, null, 2)}
          </pre>
        </div>
      )}

      <GuestSupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default TestAuth;
