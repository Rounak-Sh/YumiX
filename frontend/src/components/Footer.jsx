import React from "react";
import { Link } from "react-router-dom";
import { yumix2 } from "../assets/assets";
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
} from "react-icons/fa";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1A3A5F] text-white py-8 rounded-lg shadow-lg w-full">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="flex flex-col space-y-4">
            <div className="w-32 h-auto">
              <img
                src={yumix2}
                alt="YuMix Logo"
                className="w-full h-auto object-contain"
              />
            </div>
            <p className="text-sm text-gray-300">
              Discover delicious recipes tailored to your ingredients. Search by
              what you have or find popular dishes to cook today.
            </p>
            <div className="flex space-x-4 text-[#FFCF50]">
              <a href="#" className="hover:text-white transition-colors">
                <FaFacebook size={18} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <FaTwitter size={18} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <FaInstagram size={18} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <FaYoutube size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b-2 border-[#FFCF50] pb-1 inline-block">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/dashboard"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/search-recipe"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  Search Recipes
                </Link>
              </li>
              <li>
                <Link
                  to="/favorites"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  My Favorites
                </Link>
              </li>
              <li>
                <Link
                  to="/recipe-history"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  Recipe History
                </Link>
              </li>
              <li>
                <Link
                  to="/subscription"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  Subscription Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Useful Links */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b-2 border-[#FFCF50] pb-1 inline-block">
              Useful Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  Help & Support
                </Link>
              </li>
              <li>
                <Link
                  to="/account-help"
                  className="text-sm text-gray-300 hover:text-[#FFCF50] transition-colors">
                  Account Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b-2 border-[#FFCF50] pb-1 inline-block">
              Contact Information
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <FaMapMarkerAlt className="text-[#FFCF50] mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-300">
                  123 Recipe Street, Food City, FC 12345
                </span>
              </li>
              <li className="flex items-center">
                <FaPhone className="text-[#FFCF50] mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-300">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center">
                <FaEnvelope className="text-[#FFCF50] mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-300">support@yumix.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#FFCF50]/30 mt-6 pt-4 text-center text-sm">
          <p className="text-gray-300">
            &copy; {currentYear} YuMix - All rights reserved.
          </p>
          <p className="mt-1 text-gray-400">Designed with ❤️ by YuMix Team</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
