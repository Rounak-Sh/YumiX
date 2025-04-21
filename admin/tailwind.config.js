/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        waveLoading: {
          "0%": { transform: "translateY(0) scale(1)" },
          "25%": { transform: "translateY(-5px) scale(1.2)" },
          "50%": { transform: "translateY(-10px) scale(1)" },
          "75%": { transform: "translateY(-5px) scale(0.8)" },
          "100%": { transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        waveLoading: "waveLoading 1s infinite",
      },
    },
  },
  plugins: [require("tailwind-scrollbar")({ nocompatible: true })],
};
