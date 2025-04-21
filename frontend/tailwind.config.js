/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        cursive: ["Pacifico", "cursive"],
        serif: ["Georgia", "Cambria", "serif"],
      },
      keyframes: {
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        sparkle: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.4, transform: "scale(0.8)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out forwards",
        sparkle: "sparkle 1.5s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-custom":
          "linear-gradient(135deg, rgba(30, 64, 110, 0.95) 0%, rgba(64, 45, 95, 0.9) 100%)",
      },
    },
  },
  plugins: [require("tailwind-scrollbar")({ nocompatible: true })],
  // Add custom utilities
  utilities: {
    ".scrollbar-hide": {
      /* Firefox */
      "scrollbar-width": "none",
      /* Safari and Chrome */
      "&::-webkit-scrollbar": {
        display: "none",
      },
    },
  },
};
