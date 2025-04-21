import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";

const About = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const { isDarkMode } = useTheme();

  // Toggle section expansion
  const toggleSection = (section) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };

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
          About YuMix
        </h1>
        <div className="h-1 w-32 bg-[#FFCF50] mb-2"></div>
        <p className="text-white font-semibold mb-6">
          Recipe Search & AI Recipe Generator
        </p>

        {/* Introduction */}
        <div className="bg-[#1A3A5F] p-5 rounded-lg mb-5 text-white">
          <p className="mb-3">
            YuMix is a web application to help users discover recipes based on
            ingredients they have available, save their favorite recipes, and
            generate custom recipes using AI technology.
          </p>
          <p>
            This project combines modern web development technologies with
            artificial intelligence to create a seamless cooking and recipe
            discovery experience.
          </p>
        </div>

        {/* Key Features Section */}
        <div className="bg-[#1A3A5F] rounded-lg overflow-hidden mb-5">
          <button
            onClick={() => toggleSection("features")}
            className="w-full flex justify-between items-center p-4 text-left hover:bg-[#1A3A5F]/80 transition-colors">
            <span className="font-medium text-white">Key Features</span>
            <span className="text-[#FFCF50] font-bold text-xl">
              {activeSection === "features" ? "−" : "+"}
            </span>
          </button>
          {activeSection === "features" && (
            <div className="p-4 bg-[#1A3A5F]/80 text-white">
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">•</span>
                  <span>
                    <strong>Ingredient-Based Search:</strong> Find recipes based
                    on ingredients you already have
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">•</span>
                  <span>
                    <strong>AI Recipe Generator:</strong> Create custom recipes
                    with artificial intelligence
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">•</span>
                  <span>
                    <strong>Recipe Favorites:</strong> Save and organize your
                    favorite recipes
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">•</span>
                  <span>
                    <strong>Recipe History:</strong> Keep track of recipes
                    you've viewed
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">•</span>
                  <span>
                    <strong>Subscription Options:</strong> Access premium
                    features with subscription plans
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Technologies Used Section */}
        <div className="bg-[#1A3A5F] rounded-lg overflow-hidden mb-5">
          <button
            onClick={() => toggleSection("technologies")}
            className="w-full flex justify-between items-center p-4 text-left hover:bg-[#1A3A5F]/80 transition-colors">
            <span className="font-medium text-white">Technologies Used</span>
            <span className="text-[#FFCF50] font-bold text-xl">
              {activeSection === "technologies" ? "−" : "+"}
            </span>
          </button>
          {activeSection === "technologies" && (
            <div className="p-4 bg-[#1A3A5F]/80 text-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2 text-[#FFCF50]">
                    Frontend
                  </h3>
                  <ul className="space-y-1">
                    <li>• React.js</li>
                    <li>• Tailwind CSS</li>
                    <li>• Framer Motion</li>
                    <li>• Context API</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-[#FFCF50]">Backend</h3>
                  <ul className="space-y-1">
                    <li>• Node.js</li>
                    <li>• Express</li>
                    <li>• MongoDB</li>
                    <li>• JWT Authentication</li>
                  </ul>
                </div>
                <div className="md:col-span-2 mt-4">
                  <h3 className="font-semibold mb-2 text-[#FFCF50]">
                    APIs & Services
                  </h3>
                  <ul className="space-y-1">
                    <li>• Recipe API Integration</li>
                    <li>• AI/Machine Learning for Recipe Generation</li>
                    <li>• Payment Processing</li>
                    <li>• Cloud Storage</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Project Goals Section */}
        <div className="bg-[#1A3A5F] rounded-lg overflow-hidden mb-5">
          <button
            onClick={() => toggleSection("goals")}
            className="w-full flex justify-between items-center p-4 text-left hover:bg-[#1A3A5F]/80 transition-colors">
            <span className="font-medium text-white">Project Goals</span>
            <span className="text-[#FFCF50] font-bold text-xl">
              {activeSection === "goals" ? "−" : "+"}
            </span>
          </button>
          {activeSection === "goals" && (
            <div className="p-4 bg-[#1A3A5F]/80 text-white">
              <p className="mb-4">
                This project was developed with several key objectives:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">1.</span>
                  <span>
                    Apply full-stack web development skills in a real-world
                    application
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">2.</span>
                  <span>
                    Integrate third-party APIs and services into a cohesive user
                    experience
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">3.</span>
                  <span>
                    Implement user authentication and data security best
                    practices
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">4.</span>
                  <span>
                    Design and develop a responsive, user-friendly interface
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FFCF50] mr-2">5.</span>
                  <span>
                    Explore AI and machine learning applications in food
                    technology
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Project Information Section */}
        <div className="bg-[#1A3A5F] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection("info")}
            className="w-full flex justify-between items-center p-4 text-left hover:bg-[#1A3A5F]/80 transition-colors">
            <span className="font-medium text-white">Project Information</span>
            <span className="text-[#FFCF50] font-bold text-xl">
              {activeSection === "info" ? "−" : "+"}
            </span>
          </button>
          {activeSection === "info" && (
            <div className="p-4 bg-[#1A3A5F]/80 text-white">
              <div className="flex flex-col space-y-4">
                <div>
                  <h3 className="font-semibold text-[#FFCF50]">Developer</h3>
                  <p>
                    This application was developed by me as a personal project.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#FFCF50]">Year</h3>
                  <p>2025</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`mt-6 text-center ${
            isDarkMode ? "text-white/80" : "text-[#23486A]"
          } text-sm pt-3`}>
          <p>&copy; 2025 YuMix</p>
        </div>
      </div>
    </div>
  );
};

export default About;
