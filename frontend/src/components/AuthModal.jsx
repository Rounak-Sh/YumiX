import React from "react";
import { Link } from "react-router-dom";
import { banner } from "../assets/assets.jsx";
import { XMarkIcon } from "@heroicons/react/24/outline";

const AuthModal = ({ isOpen, onClose, featureName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-3xl animate-fadeIn">
        <div className="flex flex-col md:flex-row">
          {/* Banner Image */}
          <div className="md:w-2/5 bg-[#23486A] flex items-center justify-center p-6">
            <img
              src={banner}
              alt="Authentication Required"
              className="max-h-64 object-contain"
            />
          </div>

          {/* Content */}
          <div className="md:w-3/5 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#23486A]">
                Authentication Required
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <p className="text-[#23486A]/80 mb-6 mr-2">
              {featureName ? (
                <>
                  You need to sign in to access
                  <span className="font-semibold">{featureName}</span>.
                </>
              ) : (
                <>
                  Sign in to access all features and personalize your
                  experience.
                </>
              )}
            </p>

            <div className="space-y-4">
              <Link
                to="/login"
                className="block w-full px-6 py-3 bg-[#23486A] text-white font-bold rounded-md hover:bg-[#1A3A5F] transition-colors text-center">
                Sign In
              </Link>

              <Link
                to="/register"
                className="block w-full px-6 py-3 bg-[#FFCF50] text-[#23486A] font-bold rounded-md border-2 border-[#23486A] hover:bg-[#f0c040] transition-colors text-center">
                Create Account
              </Link>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              By signing in, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
