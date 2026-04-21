import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { Stethoscope } from "lucide-react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { paths } from "../../router/paths";

/**
 * Shared header for marketing landing and `/login` / `/signup` so layout and
 * controls stay aligned (same max width, sticky bar, brand + Sign in).
 */
export default function PublicNavBar() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const loginParams = new URLSearchParams(searchParams);
  loginParams.delete("auth");
  const loginTo = `${paths.login}${loginParams.toString() ? `?${loginParams.toString()}` : ""}`;

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: 1,
        borderColor: "divider",
        backdropFilter: "blur(12px)",
        bgcolor: alpha(theme.palette.background.default, 0.72),
      }}
    >
      <Container maxWidth="lg" sx={{ py: 1.5 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Stack
            direction="row"
            spacing={1}
            component={RouterLink}
            to={paths.root}
            sx={{ alignItems: "center", textDecoration: "none", color: "inherit" }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: theme.palette.primary.contrastText,
              }}
            >
              <Stethoscope size={20} strokeWidth={2} aria-hidden />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
              Prescribe
            </Typography>
          </Stack>

          <Button
            component={RouterLink}
            to={loginTo}
            color="inherit"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Sign in
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
