import { describe, expect, it } from "vitest";
import { createAppTheme } from "./createAppTheme";

describe("createAppTheme", () => {
  it("sets palette mode from argument", () => {
    expect(createAppTheme("light").palette.mode).toBe("light");
    expect(createAppTheme("dark").palette.mode).toBe("dark");
  });

  it("includes semantic surface tokens", () => {
    const dark = createAppTheme("dark");
    expect(dark.palette.surface.subtle).toMatch(/^#/);
    expect(dark.palette.surface.muted).toMatch(/^#/);
    expect(dark.palette.surface.elevated).toMatch(/^#/);
  });
});
