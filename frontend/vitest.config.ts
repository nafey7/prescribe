import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
  /** Node fetch requires absolute URLs; matches dev proxy origin only for tests. */
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1/api"),
  },
});
