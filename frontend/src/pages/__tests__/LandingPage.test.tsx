import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  screen,
} from "../../test-utils/renderWithProviders";
import LandingPage from "../LandingPage";

const mockUseAuth = vi.fn();
const mockUseFeatureFlags = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../contexts/FeatureFlagContext", () => ({
  useFeatureFlags: () => mockUseFeatureFlags(),
}));

function renderLanding(initial: string) {
  return renderWithProviders(<LandingPage />, {
    router: { initialEntries: [initial] },
  });
}

describe("LandingPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      accessToken: "",
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });
    mockUseFeatureFlags.mockReturnValue({
      aiSuggestionsEnabled: false,
      authRelaxed: false,
      allowDoctorSelfSignup: false,
      isLoading: false,
    });
  });

  it("shows landing title, Sign in in the nav, and no theme toggle or hero sign-up CTAs", () => {
    renderLanding("/");
    expect(screen.getAllByText("Prescribe").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/patient.*clinician portal/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(
      screen.queryByRole("button", { name: /switch to (light|dark) mode/i })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /^sign up$/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /create free account/i })
    ).toBeNull();
  });
});
