import { render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ColorModeProvider } from "../contexts/ColorModeContext";
import { FeatureFlagProvider } from "../contexts/FeatureFlagContext";
import { AppThemeProvider } from "../providers/AppThemeProvider";
import { appRouteTree } from "../router";
import { store } from "../store";

vi.mock("../api/configApi", () => ({
  useGetFeatureFlagsQuery: () => ({
    data: {
      ai_suggestions_enabled: false,
      auth_relaxed: true,
      allow_doctor_self_signup: false,
    },
    isLoading: false,
    isError: false,
  }),
}));

function renderWithRouter(initialPath: string) {
  const r = createMemoryRouter(appRouteTree, { initialEntries: [initialPath] });
  render(
    <Provider store={store}>
      <ColorModeProvider>
        <AppThemeProvider>
          <FeatureFlagProvider>
            <RouterProvider router={r} />
          </FeatureFlagProvider>
        </AppThemeProvider>
      </ColorModeProvider>
    </Provider>
  );
  return r;
}

describe("legacy redirects (dev bypass, unauthenticated)", () => {
  it.each([
    ["/home", "/patient"],
    ["/profile", "/patient/profile"],
    ["/documents", "/patient/documents"],
    ["/dashboard", "/patient"],
    ["/public/chat", "/patient/chat"],
  ])("%s → %s", async (from, to) => {
    const r = renderWithRouter(from);
    await waitFor(() => expect(r.state.location.pathname).toBe(to));
  });

  it("redirects /admin to landing root, then dev bypass sends unauth users to /patient", async () => {
    const r = renderWithRouter("/admin");
    await waitFor(() => expect(r.state.location.pathname).toBe("/patient"));
  });

  it("catch-all sends to landing root, then dev bypass sends unauth users to /patient", async () => {
    const r = renderWithRouter("/totally-unknown");
    await waitFor(() => expect(r.state.location.pathname).toBe("/patient"));
  });
});
