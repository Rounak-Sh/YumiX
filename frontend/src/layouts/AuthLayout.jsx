import React from "react";
import { bg_1 } from "../assets/assets.jsx";

const AuthLayout = ({ children }) => {
  // Simplified background style
  const backgroundStyle = {
    backgroundImage: `url(${bg_1})`,
    backgroundRepeat: "repeat",
    backgroundSize: "800px auto",
    backgroundColor: "#C48229",
    backgroundBlendMode: "multiply",
  };

  return (
    <div className="min-h-screen bg-[#C48229]/70 relative">
      {/* Background - integrated directly */}
      <div
        className="absolute inset-0 z-0 opacity-70 pointer-events-none overflow-hidden"
        style={backgroundStyle}></div>

      {/* Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
