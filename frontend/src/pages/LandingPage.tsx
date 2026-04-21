import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import {
  MessageSquare,
  ShieldCheck,
  Stethoscope,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PublicNavBar from "../components/landing/PublicNavBar";
import { useAuth } from "../contexts/AuthContext";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import { readStoredDevRole } from "../dev/devRoleStorage";
import { paths } from "../router/paths";
import { defaultPostAuthPath, safeReturnUrl } from "../router/postAuthPath";

const driftA = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
`;

const driftB = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-35px, 25px) scale(1.08); }
`;

const shimmer = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`;

const fadeRise = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export default function LandingPage() {
  const theme = useTheme();
  const { status, user } = useAuth();
  const { authRelaxed, isLoading: flagsLoading } = useFeatureFlags();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrlParam = searchParams.get("returnUrl");

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "login" || auth === "signup") {
      const next = new URLSearchParams(searchParams);
      next.delete("auth");
      const path = auth === "login" ? paths.login : paths.signup;
      const q = next.toString();
      navigate(`${path}${q ? `?${q}` : ""}`, { replace: true });
    }
  }, [searchParams, navigate]);

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

  const features = [
    {
      icon: Stethoscope,
      title: "Clinical clarity",
      body: "One place for prescriptions, documents, and care context—built for busy practices and engaged patients.",
    },
    {
      icon: UtensilsCrossed,
      title: "Nutrition that fits",
      body: "Meal planning tools that respect real life—so guidance is actionable, not overwhelming.",
    },
    {
      icon: MessageSquare,
      title: "Guided conversations",
      body: "Chat with context-aware assistance so questions get answered without losing the human touch.",
    },
    {
      icon: ShieldCheck,
      title: "Privacy-minded",
      body: "Designed around sensitive health data—with clear roles for patients and clinicians.",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
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

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <PublicNavBar />

        <Container maxWidth="lg" sx={{ px: 2, py: { xs: 6, md: 10 } }}>
          <Stack spacing={6} sx={{ alignItems: "center" }}>
            <Box sx={{ textAlign: "center", maxWidth: 800 }}>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: "0.2em",
                  fontWeight: 700,
                  color: "primary.main",
                  display: "block",
                  mb: 2,
                  animation: `${fadeRise} 0.7s ease-out both`,
                }}
              >
                Patient & clinician portal
              </Typography>
              <Typography
                component="h1"
                variant="h2"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.1,
                  mb: 2,
                  fontSize: { xs: "2.25rem", sm: "3rem", md: "3.5rem" },
                  background: `linear-gradient(120deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 45%, ${theme.palette.text.primary} 100%)`,
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  animation: `${fadeRise} 0.7s ease-out 0.08s both, ${shimmer} 8s linear infinite`,
                }}
              >
                Care that moves with you—not against you.
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{
                  fontWeight: 400,
                  lineHeight: 1.6,
                  maxWidth: 560,
                  mx: "auto",
                  mb: 4,
                  animation: `${fadeRise} 0.7s ease-out 0.16s both`,
                }}
              >
                Prescribe connects patients and doctors around prescriptions, meal plans, and
                secure messaging—so follow-through feels simple, not scattered.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                gap: 2.5,
                width: "100%",
                maxWidth: 1000,
              }}
            >
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Paper
                    key={f.title}
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      border: 1,
                      borderColor: "divider",
                      bgcolor: alpha(theme.palette.background.paper, 0.55),
                      backdropFilter: "blur(8px)",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
                      animation: `${fadeRise} 0.65s ease-out ${0.32 + i * 0.08}s both`,
                      "&:hover": {
                        transform: "translateY(-6px)",
                        boxShadow: 4,
                        borderColor: alpha(theme.palette.primary.main, 0.35),
                      },
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                          color: "primary.main",
                        }}
                      >
                        <Icon size={22} strokeWidth={2} aria-hidden />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {f.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                        {f.body}
                      </Typography>
                    </Stack>
                  </Paper>
                );
              })}
            </Box>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
