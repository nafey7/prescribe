import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  /** Node fetch requires absolute URLs; matches dev proxy origin only for tests. */
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1/api"),
  },
});
