import type { TypographyVariantsOptions } from "@mui/material";

const fontFamily = [
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
].join(",");

/** Readable defaults for medical / portal UI. */
export const typography: TypographyVariantsOptions = {
  fontFamily,
  h1: { fontSize: "2rem", fontWeight: 600, lineHeight: 1.2 },
  h2: { fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.3 },
  h3: { fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.4 },
  h4: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.4 },
  h5: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.5 },
  h6: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.5 },
  body1: { fontSize: "1rem", lineHeight: 1.6 },
  body2: { fontSize: "0.875rem", lineHeight: 1.6 },
  button: { fontSize: "0.875rem", fontWeight: 600, textTransform: "none" },
  caption: { fontSize: "0.75rem", lineHeight: 1.5 },
};
