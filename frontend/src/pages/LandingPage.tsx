import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { readStoredDevRole } from "../dev/devRoleStorage";
import { useAuth } from "../contexts/AuthContext";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import { defaultPostAuthPath, safeReturnUrl } from "../router/postAuthPath";

type AuthMode = "login" | "signup";
type SignupRole = "patient" | "doctor";

function parseAuthMode(raw: string | null): AuthMode {
  return raw === "signup" ? "signup" : "login";
}

function signupErrorMessage(err: unknown): string {
  const fallback =
    "Could not create account. Try a different email or stronger password.";
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: unknown }).data;
    if (typeof data === "object" && data && "detail" in data) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === "string") return d;
      if (Array.isArray(d) && d.length > 0) {
        const first = d[0];
        if (first && typeof first === "object" && "msg" in first) {
          const m = (first as { msg?: unknown }).msg;
          if (typeof m === "string") return m;
        }
      }
    }
  }
  return fallback;
}

export default function LandingPage() {
  const { login, signup, status, user } = useAuth();
  const { authRelaxed, allowDoctorSelfSignup, isLoading: flagsLoading } =
    useFeatureFlags();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = parseAuthMode(searchParams.get("auth"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupRole, setSignupRole] = useState<SignupRole>("patient");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const returnUrlParam = searchParams.get("returnUrl");

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "doctor" && allowDoctorSelfSignup) {
      setSignupRole("doctor");
    }
  }, [searchParams, allowDoctorSelfSignup]);

  useEffect(() => {
    if (signupRole === "doctor" && !allowDoctorSelfSignup) {
      setSignupRole("patient");
    }
  }, [signupRole, allowDoctorSelfSignup]);

  useEffect(() => {
    if (flagsLoading || !authRelaxed) return;
    if (status !== "unauthenticated") return;
    navigate(defaultPostAuthPath(readStoredDevRole()), { replace: true });
  }, [flagsLoading, authRelaxed, status, navigate]);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    const dest = safeReturnUrl(returnUrlParam, user.role);
    navigate(dest, { replace: true });
  }, [status, user, navigate, returnUrlParam]);

  function setMode(next: AuthMode) {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "login") {
      nextParams.delete("auth");
    } else {
      nextParams.set("auth", "signup");
    }
    setSearchParams(nextParams, { replace: true });
    setError(null);
    if (next === "login") {
      setSignupFirstName("");
      setSignupLastName("");
      setSignupConfirmPassword("");
    }
  }

  async function onSubmitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(email.trim(), password);
      navigate(safeReturnUrl(returnUrlParam, me.role), { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== signupConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const me = await signup({
        firstName: signupFirstName.trim(),
        lastName: signupLastName.trim(),
        email: email.trim(),
        password,
        confirmPassword: signupConfirmPassword,
        role: signupRole === "doctor" ? "doctor" : "patient",
      });
      navigate(safeReturnUrl(returnUrlParam, me.role), { replace: true });
    } catch (err) {
      setError(signupErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-600">
        Loading…
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Prescribe
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Patient and doctor health portal
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Create account
          </button>
        </div>

        {mode === "login" ? (
          <>
            <p className="mt-6 text-center text-sm text-gray-500">
              Use your account email.
            </p>
            <form className="mt-4 space-y-4" onSubmit={onSubmitLogin}>
              <div>
                <label
                  htmlFor="landing-login-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="landing-login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <div>
                <label
                  htmlFor="landing-login-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="landing-login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </>
        ) : (
          <>
            {allowDoctorSelfSignup ? (
              <div className="mt-6 flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setSignupRole("patient")}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors sm:text-sm ${
                    signupRole === "patient"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setSignupRole("doctor")}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors sm:text-sm ${
                    signupRole === "doctor"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Doctor
                </button>
              </div>
            ) : null}
            <p className="mt-4 text-center text-sm text-gray-500">
              {signupRole === "doctor"
                ? "Doctor signup — you will complete your clinical profile after sign-up."
                : "Patient signup — at least 8 characters, one letter and one number."}
            </p>
            <form className="mt-4 space-y-4" onSubmit={onSubmitSignup}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="landing-signup-first-name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    First name
                  </label>
                  <input
                    id="landing-signup-first-name"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
                <div>
                  <label
                    htmlFor="landing-signup-last-name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Last name
                  </label>
                  <input
                    id="landing-signup-last-name"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={signupLastName}
                    onChange={(e) => setSignupLastName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="landing-signup-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="landing-signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <div>
                <label
                  htmlFor="landing-signup-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="landing-signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <div>
                <label
                  htmlFor="landing-signup-confirm-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm password
                </label>
                <input
                  id="landing-signup-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? "Creating account…" : "Sign up"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
