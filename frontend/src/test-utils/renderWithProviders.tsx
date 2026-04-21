/**
 * Testing Library wrappers that mirror production providers so `useTheme()` and Redux
 * hooks work without per-test boilerplate.
 *
 * - `renderWithTheme`: `ColorModeProvider` + `AppThemeProvider` (matches production).
 * - `renderWithProviders`: Redux `Provider` + color mode + theme, optional `MemoryRouter`.
 *
 * Prefer asserting roles, labels, or `data-testid` — avoid relying on Tailwind class names.
 */
import {
  render,
  type RenderOptions,
  screen,
  within,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import {
  MemoryRouter,
  type MemoryRouterProps,
} from "react-router-dom";
import { ColorModeProvider } from "../contexts/ColorModeContext";
import { AppThemeProvider } from "../providers/AppThemeProvider";
import { store } from "../store";

export type RenderWithProvidersOptions = Omit<RenderOptions, "wrapper"> & {
  /** When set, wraps children with `MemoryRouter` (for `useLocation`, links, etc.). */
  router?: MemoryRouterProps;
};

function wrapWithTheme(children: ReactNode) {
  return (
    <ColorModeProvider>
      <AppThemeProvider>{children}</AppThemeProvider>
    </ColorModeProvider>
  );
}

export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, {
    ...options,
    wrapper: ({ children }) => wrapWithTheme(children),
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
) {
  const { router, ...renderOptions } = options ?? {};

  function Wrapper({ children }: { children: ReactNode }) {
    let tree: ReactNode = children;
    if (router) {
      tree = <MemoryRouter {...router}>{tree}</MemoryRouter>;
    }
    tree = wrapWithTheme(tree);
    return <Provider store={store}>{tree}</Provider>;
  }

  return render(ui, { ...renderOptions, wrapper: Wrapper });
}

export { screen, within };
