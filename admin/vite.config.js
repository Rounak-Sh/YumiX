import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["@heroicons/react/24/outline"],
  },
});

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import path from "path";

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 5173,
//     strictPort: true,
//     host: "0.0.0.0", // Allow external access
//     cors: true, // Enable CORS for external access
//     allowedHosts: [".trycloudflare.com", ".ngrok.io"], // Allow Cloudflare & Ngrok URLs
//     proxy: {
//       "/api": {
//         target: "http://localhost:5000",
//         changeOrigin: true,
//         secure: false,
//       },
//     },
//   },
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//     },
//   },
//   optimizeDeps: {
//     include: ["@heroicons/react/24/outline"],
//   },
// });
