import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd());

  // Ensure the API URL is correct in production, regardless of .env file
  const apiUrl =
    mode === "production"
      ? "https://yumix-backend.onrender.com/api"
      : env.VITE_API_URL || "http://localhost:5000/api";

  console.log(`Using API URL in Vite config: ${apiUrl} (${mode} mode)`);

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiUrl,
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
    define: {
      // Ensure these environment variables are always available
      "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
      "import.meta.env.MODE": JSON.stringify(mode),
    },
    build: {
      // Generate source maps for better debugging
      sourcemap: true,
    },
  };
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
