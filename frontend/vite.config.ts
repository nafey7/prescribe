import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Default Vite app type is SPA: dev server and `vite preview` serve
// `index.html` for non-file routes (client-side routing works on refresh).
export default defineConfig({
  plugins: [react()],
  appType: "spa",
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
