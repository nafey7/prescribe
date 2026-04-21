import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import LandingAuthForm from "../components/landing/LandingAuthForm";
import PublicNavBar from "../components/landing/PublicNavBar";
import { useAuth } from "../contexts/AuthContext";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import { paths } from "../router/paths";
import { safeReturnUrl } from "../router/postAuthPath";

type AuthMode = "login" | "signup";
type SignupRole = "patient" | "doctor";

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

const driftA = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
`;

const driftB = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-35px, 25px) scale(1.08); }
`;

export default function AuthPage() {
  const theme = useTheme();
  const { pathname } = useLocation();
  const mode: AuthMode = pathname === paths.signup ? "signup" : "login";
  const { login, signup, status, user } = useAuth();
  const { allowDoctorSelfSignup } = useFeatureFlags();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
    if (status !== "authenticated" || !user) return;
    const dest = safeReturnUrl(returnUrlParam, user.role);
    navigate(dest, { replace: true });
  }, [status, user, navigate, returnUrlParam]);

  function setMode(next: AuthMode) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("auth");
    const path = next === "login" ? paths.login : paths.signup;
    navigate(`${path}?${nextParams.toString()}`, { replace: true });
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
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          typography: "body2",
          color: "text.secondary",
        }}
      >
        Loading…
      </Box>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: `radial-gradient(ellipse 80% 55% at 50% -20%, ${alpha(theme.palette.primary.main, 0.22)}, transparent 55%),
            radial-gradient(ellipse 60% 40% at 100% 0%, ${alpha(theme.palette.secondary.main, 0.12)}, transparent 50%),
            radial-gradient(ellipse 50% 35% at 0% 100%, ${alpha(theme.palette.primary.dark, 0.08)}, transparent 45%)`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          width: 420,
          height: 420,
          borderRadius: "50%",
          top: "12%",
          right: "-8%",
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.35)}, ${alpha(theme.palette.primary.light, 0.1)})`,
          filter: "blur(40px)",
          animation: `${driftA} 18s ease-in-out infinite`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          width: 360,
          height: 360,
          borderRadius: "50%",
          bottom: "5%",
          left: "-6%",
          background: `linear-gradient(225deg, ${alpha(theme.palette.secondary.main, 0.25)}, ${alpha(theme.palette.primary.main, 0.08)})`,
          filter: "blur(48px)",
          animation: `${driftB} 22s ease-in-out infinite`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        <PublicNavBar />

        <Container maxWidth="sm" sx={{ flex: 1, display: "flex", alignItems: "center", py: 4 }}>
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              border: 1,
              borderColor: "divider",
              bgcolor: alpha(theme.palette.background.paper, 0.85),
              backdropFilter: "blur(8px)",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {mode === "login" ? "Welcome back" : "Join Prescribe"}
            </Typography>
            <LandingAuthForm
              mode={mode}
              onModeChange={setMode}
              allowDoctorSelfSignup={allowDoctorSelfSignup}
              signupRole={signupRole}
              onSignupRoleChange={setSignupRole}
              email={email}
              onEmailChange={setEmail}
              password={password}
              onPasswordChange={setPassword}
              signupFirstName={signupFirstName}
              onSignupFirstNameChange={setSignupFirstName}
              signupLastName={signupLastName}
              onSignupLastNameChange={setSignupLastName}
              signupConfirmPassword={signupConfirmPassword}
              onSignupConfirmPasswordChange={setSignupConfirmPassword}
              error={error}
              submitting={submitting}
              onSubmitLogin={onSubmitLogin}
              onSubmitSignup={onSubmitSignup}
            />
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
