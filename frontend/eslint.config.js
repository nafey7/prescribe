import tseslint from "typescript-eslint";

/**
 * Route literals must live in `src/router/paths.ts` (and `router.tsx` redirects).
 * Tests and path definitions are excluded. No full TS style rules — `tsc` is source of truth.
 */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "vite.config.ts",
      "vitest.config.ts",
      "vitest.setup.ts",
      "postcss.config.js",
      "tailwind.config.js",
    ],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/^\\/(home|profile|documents|dashboard|public\\/chat|doctor|patient)(\\/|$)/]",
          message:
            "Use route constants from src/router/paths.ts instead of hard-coded SPA paths.",
        },
      ],
    },
  },
  {
    files: [
      "src/router/paths.ts",
      "src/router.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/__tests__/**/*.ts",
      "src/**/__tests__/**/*.tsx",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  }
);
