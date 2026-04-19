import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <LandingPage />
    </MemoryRouter>
  );
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

  it("shows landing title and auth mode toggles", () => {
    renderLanding("/");
    expect(screen.getByText("Prescribe")).toBeInTheDocument();
    expect(
      screen.getByText(/patient and doctor health portal/i)
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^sign in$/i }).length).toBe(
      2
    );
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
  });

  it("hides Doctor signup tab when allowDoctorSelfSignup is false", () => {
    renderLanding("/?auth=signup");
    expect(screen.queryByRole("button", { name: /^doctor$/i })).toBeNull();
  });

  it("shows Doctor signup tab when allowDoctorSelfSignup is true", () => {
    mockUseFeatureFlags.mockReturnValue({
      aiSuggestionsEnabled: false,
      authRelaxed: false,
      allowDoctorSelfSignup: true,
      isLoading: false,
    });
    renderLanding("/?auth=signup");
    expect(
      screen.getByRole("button", { name: /^doctor$/i })
    ).toBeInTheDocument();
  });

  it("submits signup with role doctor when Doctor is selected", async () => {
    const signup = vi.fn().mockResolvedValue({
      user_id: "u1",
      role: "doctor",
      email: "d@example.com",
      status: "active",
      email_verified: false,
      profile_completed: false,
      patient_slug: null,
    });
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      accessToken: "",
      login: vi.fn(),
      signup,
      logout: vi.fn(),
    });
    mockUseFeatureFlags.mockReturnValue({
      aiSuggestionsEnabled: false,
      authRelaxed: false,
      allowDoctorSelfSignup: true,
      isLoading: false,
    });

    renderLanding("/?auth=signup");
    fireEvent.click(screen.getAllByRole("button", { name: /^doctor$/i })[0]!);
    fireEvent.change(document.getElementById("landing-signup-first-name")!, {
      target: { value: "Jane" },
    });
    fireEvent.change(document.getElementById("landing-signup-last-name")!, {
      target: { value: "Doe" },
    });
    fireEvent.change(document.getElementById("landing-signup-email")!, {
      target: { value: "doc@example.com" },
    });
    fireEvent.change(document.getElementById("landing-signup-password")!, {
      target: { value: "validpassword1" },
    });
    fireEvent.change(
      document.getElementById("landing-signup-confirm-password")!,
      {
        target: { value: "validpassword1" },
      }
    );
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => expect(signup).toHaveBeenCalled());
    expect(signup).toHaveBeenCalledWith({
      firstName: "Jane",
      lastName: "Doe",
      email: "doc@example.com",
      password: "validpassword1",
      confirmPassword: "validpassword1",
      role: "doctor",
    });
  });

  it("surfaces backend detail on signup failure", async () => {
    const signup = vi.fn().mockRejectedValue({
      data: { detail: "Doctor self-signup is disabled." },
    });
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      accessToken: "",
      login: vi.fn(),
      signup,
      logout: vi.fn(),
    });
    mockUseFeatureFlags.mockReturnValue({
      aiSuggestionsEnabled: false,
      authRelaxed: false,
      allowDoctorSelfSignup: true,
      isLoading: false,
    });

    renderLanding("/?auth=signup");
    fireEvent.change(document.getElementById("landing-signup-first-name")!, {
      target: { value: "X" },
    });
    fireEvent.change(document.getElementById("landing-signup-last-name")!, {
      target: { value: "Y" },
    });
    fireEvent.change(document.getElementById("landing-signup-email")!, {
      target: { value: "x@example.com" },
    });
    fireEvent.change(document.getElementById("landing-signup-password")!, {
      target: { value: "validpassword1" },
    });
    fireEvent.change(
      document.getElementById("landing-signup-confirm-password")!,
      {
        target: { value: "validpassword1" },
      }
    );
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    expect(
      await screen.findByText("Doctor self-signup is disabled.")
    ).toBeInTheDocument();
  });
});
