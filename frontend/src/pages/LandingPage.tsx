import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { readStoredDevRole } from "../dev/devRoleStorage";
import { useAuth } from "../contexts/AuthContext";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import ThemeToggleButton from "../components/ThemeToggleButton";
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
  const theme = useTheme();
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

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
    },
  };

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
        position: "relative",
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
        py: 6,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: (theme) => theme.spacing(2),
          right: (theme) => theme.spacing(2),
        }}
      >
        <ThemeToggleButton />
      </Box>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h5" component="h1" color="text.primary" sx={{ fontWeight: 600 }}>
          Prescribe
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Patient and doctor health portal
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 4,
          border: 1,
          borderColor: "divider",
          borderRadius: 3,
          boxShadow: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            borderRadius: 2,
            bgcolor: alpha(theme.palette.text.primary, 0.08),
            p: 0.5,
          }}
        >
          <Button
            type="button"
            fullWidth
            onClick={() => setMode("login")}
            sx={{
              py: 1,
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.875rem",
              borderRadius: 1.5,
              ...(mode === "login"
                ? {
                    bgcolor: "background.paper",
                    color: "text.primary",
                    boxShadow: 1,
                  }
                : { color: "text.secondary" }),
            }}
          >
            Sign in
          </Button>
          <Button
            type="button"
            fullWidth
            onClick={() => setMode("signup")}
            sx={{
              py: 1,
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.875rem",
              borderRadius: 1.5,
              ...(mode === "signup"
                ? {
                    bgcolor: "background.paper",
                    color: "text.primary",
                    boxShadow: 1,
                  }
                : { color: "text.secondary" }),
            }}
          >
            Create account
          </Button>
        </Box>

        {mode === "login" ? (
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 3, textAlign: "center" }}
            >
              Use your account email.
            </Typography>
            <Box component="form" onSubmit={onSubmitLogin} sx={{ mt: 2 }}>
              <Stack spacing={2}>
                <TextField
                  id="landing-login-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  required
                  fullWidth
                  size="small"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={inputSx}
                />
                <TextField
                  id="landing-login-password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  required
                  fullWidth
                  size="small"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={inputSx}
                />
                {error ? (
                  <Alert severity="error" role="alert">
                    {error}
                  </Alert>
                ) : null}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  fullWidth
                  sx={{ py: 1.25, textTransform: "none", fontWeight: 500 }}
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </Stack>
            </Box>
          </>
        ) : (
          <>
            {allowDoctorSelfSignup ? (
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={signupRole}
                onChange={(_, v) => v && setSignupRole(v)}
                sx={{
                  mt: 3,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.text.primary, 0.08),
                  p: 0.5,
                  gap: 0,
                  "& .MuiToggleButtonGroup-grouped": {
                    border: 0,
                    borderRadius: `${
                      (typeof theme.shape.borderRadius === "number"
                        ? theme.shape.borderRadius
                        : 8) * 1.5
                    }px !important`,
                  },
                }}
              >
                <ToggleButton value="patient" sx={{ textTransform: "none", flex: 1 }}>
                  Patient
                </ToggleButton>
                <ToggleButton value="doctor" sx={{ textTransform: "none", flex: 1 }}>
                  Doctor
                </ToggleButton>
              </ToggleButtonGroup>
            ) : null}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: allowDoctorSelfSignup ? 2 : 3,
                textAlign: "center",
              }}
            >
              {signupRole === "doctor"
                ? "Doctor signup — you will complete your clinical profile after sign-up."
                : "Patient signup — at least 8 characters, one letter and one number."}
            </Typography>
            <Box component="form" onSubmit={onSubmitSignup} sx={{ mt: 2 }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  useFlexGap
                >
                  <TextField
                    id="landing-signup-first-name"
                    label="First name"
                    autoComplete="given-name"
                    required
                    fullWidth
                    size="small"
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    sx={inputSx}
                  />
                  <TextField
                    id="landing-signup-last-name"
                    label="Last name"
                    autoComplete="family-name"
                    required
                    fullWidth
                    size="small"
                    value={signupLastName}
                    onChange={(e) => setSignupLastName(e.target.value)}
                    sx={inputSx}
                  />
                </Stack>
                <TextField
                  id="landing-signup-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  required
                  fullWidth
                  size="small"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={inputSx}
                />
                <TextField
                  id="landing-signup-password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  required
                  fullWidth
                  size="small"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={inputSx}
                  slotProps={{ htmlInput: { minLength: 8 } }}
                />
                <TextField
                  id="landing-signup-confirm-password"
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  required
                  fullWidth
                  size="small"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  sx={inputSx}
                  slotProps={{ htmlInput: { minLength: 8 } }}
                />
                {error ? (
                  <Alert severity="error" role="alert">
                    {error}
                  </Alert>
                ) : null}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  fullWidth
                  sx={{ py: 1.25, textTransform: "none", fontWeight: 500 }}
                >
                  {submitting ? "Creating account…" : "Sign up"}
                </Button>
              </Stack>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
