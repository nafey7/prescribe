import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Default Vite app type is SPA: dev server and `vite preview` serve
// `index.html` for non-file routes (client-side routing works on refresh).
// Vitest shares this config so tests get the same JSX + plugin pipeline as `vite build`.
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
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Node/undici require absolute URLs for Request/fetch; browser uses relative /api.
    env: {
      VITE_API_URL: "http://localhost/api",
    },
  },
});
