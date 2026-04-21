import { createAppTheme } from "./createAppTheme";

export { createAppTheme } from "./createAppTheme";
export { paletteLight } from "./paletteLight";
export { paletteDark } from "./paletteDark";

/** Default theme matches first-visit color mode (`dark` when nothing stored). */
export const appTheme = createAppTheme("dark");

export type AppTheme = ReturnType<typeof createAppTheme>;
