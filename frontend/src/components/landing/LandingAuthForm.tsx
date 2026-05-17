import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material";

export type LandingAuthMode = "login" | "signup";
export type LandingSignupRole = "patient" | "doctor";

export type LandingAuthFormProps = {
  mode: LandingAuthMode;
  onModeChange: (mode: LandingAuthMode) => void;
  allowDoctorSelfSignup: boolean;
  signupRole: LandingSignupRole;
  onSignupRoleChange: (role: LandingSignupRole) => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  signupFirstName: string;
  onSignupFirstNameChange: (value: string) => void;
  signupLastName: string;
  onSignupLastNameChange: (value: string) => void;
  signupConfirmPassword: string;
  onSignupConfirmPasswordChange: (value: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmitLogin: (e: React.FormEvent) => void;
  onSubmitSignup: (e: React.FormEvent) => void;
};

export default function LandingAuthForm({
  mode,
  onModeChange,
  allowDoctorSelfSignup,
  signupRole,
  onSignupRoleChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  signupFirstName,
  onSignupFirstNameChange,
  signupLastName,
  onSignupLastNameChange,
  signupConfirmPassword,
  onSignupConfirmPasswordChange,
  error,
  submitting,
  onSubmitLogin,
  onSubmitSignup,
}: LandingAuthFormProps) {
  const theme = useTheme();
  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
    },
  };

  return (
    <Box>
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
          onClick={() => onModeChange("login")}
          data-testid="auth-tab-login"
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
          onClick={() => onModeChange("signup")}
          data-testid="auth-tab-signup"
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
                onChange={(e) => onEmailChange(e.target.value)}
                sx={inputSx}
                slotProps={{ htmlInput: { "data-testid": "login-email" } }}
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
                onChange={(e) => onPasswordChange(e.target.value)}
                sx={inputSx}
                slotProps={{ htmlInput: { "data-testid": "login-password" } }}
              />
              {error ? (
                <Alert severity="error" role="alert" data-testid="login-error">
                  {error}
                </Alert>
              ) : null}
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                fullWidth
                sx={{ py: 1.25, textTransform: "none", fontWeight: 500 }}
                data-testid="login-submit"
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
              onChange={(_, v) => v && onSignupRoleChange(v)}
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
                  onChange={(e) => onSignupFirstNameChange(e.target.value)}
                  sx={inputSx}
                  slotProps={{ htmlInput: { "data-testid": "signup-first-name" } }}
                />
                <TextField
                  id="landing-signup-last-name"
                  label="Last name"
                  autoComplete="family-name"
                  required
                  fullWidth
                  size="small"
                  value={signupLastName}
                  onChange={(e) => onSignupLastNameChange(e.target.value)}
                  sx={inputSx}
                  slotProps={{ htmlInput: { "data-testid": "signup-last-name" } }}
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
                onChange={(e) => onEmailChange(e.target.value)}
                sx={inputSx}
                slotProps={{ htmlInput: { "data-testid": "signup-email" } }}
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
                onChange={(e) => onPasswordChange(e.target.value)}
                sx={inputSx}
                slotProps={{ htmlInput: { minLength: 8, "data-testid": "signup-password" } }}
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
                onChange={(e) => onSignupConfirmPasswordChange(e.target.value)}
                sx={inputSx}
                slotProps={{ htmlInput: { minLength: 8, "data-testid": "signup-confirm-password" } }}
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
                data-testid="signup-submit"
              >
                {submitting ? "Creating account…" : "Sign up"}
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}
