import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ColorModeProvider,
  COLOR_MODE_STORAGE_KEY,
  useColorMode,
} from "../ColorModeContext";

function ModeProbe() {
  const { mode, toggleMode, setMode } = useColorMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button type="button" onClick={toggleMode}>
        toggle
      </button>
      <button type="button" onClick={() => setMode("dark")}>
        set dark
      </button>
    </div>
  );
}

describe("ColorModeContext", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) =>
      storage.has(key) ? storage.get(key)! : null
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      storage.set(key, value);
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key) => {
      storage.delete(key);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("defaults to dark when storage is empty", () => {
    render(
      <ColorModeProvider>
        <ModeProbe />
      </ColorModeProvider>
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
  });

  it("reads light from localStorage when set", () => {
    storage.set(COLOR_MODE_STORAGE_KEY, "light");
    render(
      <ColorModeProvider>
        <ModeProbe />
      </ColorModeProvider>
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("toggleMode flips mode and persists", () => {
    render(
      <ColorModeProvider>
        <ModeProbe />
      </ColorModeProvider>
    );
    act(() => {
      screen.getByRole("button", { name: /toggle/i }).click();
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
    expect(storage.get(COLOR_MODE_STORAGE_KEY)).toBe("light");
    act(() => {
      screen.getByRole("button", { name: /toggle/i }).click();
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(storage.get(COLOR_MODE_STORAGE_KEY)).toBe("dark");
  });

  it("setMode writes storage", () => {
    render(
      <ColorModeProvider>
        <ModeProbe />
      </ColorModeProvider>
    );
    act(() => {
      screen.getByRole("button", { name: /set dark/i }).click();
    });
    expect(storage.get(COLOR_MODE_STORAGE_KEY)).toBe("dark");
  });
});
