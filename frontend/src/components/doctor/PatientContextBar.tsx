import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, styled } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getConnectedPatientProfile } from "../../api/doctors";
import { useIdentity } from "../../contexts/IdentityContext";
import { paths } from "../../router/paths";

const PatientTabLink = styled(NavLink)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(0.75, 1.5),
  fontSize: theme.typography.body2.fontSize,
  textDecoration: "none",
  whiteSpace: "nowrap",
  color: theme.palette.text.secondary,
  "&:hover": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.action.hover,
  },
  '&[aria-current="page"]': {
    fontWeight: 600,
    color: theme.palette.secondary.dark,
    backgroundColor: alpha(theme.palette.secondary.main, 0.12),
  },
}));

const BackLink = styled(NavLink)(({ theme }) => ({
  display: "inline-flex",
  flexShrink: 0,
  alignItems: "center",
  gap: theme.spacing(0.5),
  fontSize: theme.typography.body2.fontSize,
  fontWeight: 500,
  textDecoration: "none",
  color: theme.palette.secondary.dark,
  "&:hover": {
    color: theme.palette.secondary.main,
  },
}));

/**
 * Sub-navigation when viewing a specific patient under `/doctor/patients/:patientId/*`.
 */
export default function PatientContextBar({ patientId }: { patientId: string }) {
  const { currentDoctorId } = useIdentity();
  const base = paths.doctor.patientDetail(encodeURIComponent(patientId));
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!currentDoctorId || !patientId) {
      setDisplayName(null);
      return;
    }
    let cancelled = false;
    getConnectedPatientProfile(currentDoctorId, patientId)
      .then((p) => {
        if (cancelled) return;
        const n = `${p.first_name} ${p.last_name}`.trim();
        setDisplayName(n || null);
      })
      .catch(() => {
        if (!cancelled) setDisplayName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDoctorId, patientId]);

  const label =
    displayName ||
    (patientId.length > 12 ? `${patientId.slice(0, 8)}…` : patientId);

  return (
    <Box
      sx={(theme) => ({
        position: "relative",
        isolation: "isolate",
        flexShrink: 0,
        borderBottom: 1,
        borderColor: alpha(theme.palette.secondary.main, 0.2),
        bgcolor: alpha(theme.palette.secondary.main, 0.06),
        px: 2,
        py: 1.5,
      })}
    >
      <Box
        sx={{
          mx: "auto",
          maxWidth: "72rem",
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", sm: "minmax(0,1fr) auto" },
          alignItems: { sm: "center" },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center", minWidth: 0 }}>
          <BackLink to={paths.doctor.patients}>
            <ArrowLeft size={16} aria-hidden />
            Back to Patients
          </BackLink>
          <Typography
            component="span"
            variant="body2"
            sx={{ display: { xs: "none", sm: "inline" }, color: "divider" }}
            aria-hidden
          >
            |
          </Typography>
          <Typography variant="body2" color="text.primary" noWrap sx={{ minWidth: 0 }}>
            <Typography component="span" sx={{ fontWeight: 600 }}>
              Viewing:
            </Typography>{" "}
            <Box component="span" title={patientId}>
              {label}
            </Box>
          </Typography>
        </Stack>
        <Stack
          component="nav"
          direction="row"
          spacing={0.5}
          aria-label="Patient section"
          sx={{
            flexWrap: "wrap",
            minWidth: 0,
            flexShrink: 0,
            justifyContent: { xs: "flex-start", sm: "flex-end" },
          }}
        >
          <PatientTabLink to={base} end>
            Overview
          </PatientTabLink>
          <PatientTabLink to={`${base}/chat`}>AI</PatientTabLink>
          <PatientTabLink to={`${base}/documents`}>Documents</PatientTabLink>
          <PatientTabLink to={`${base}/prescriptions`}>Prescriptions</PatientTabLink>
        </Stack>
      </Box>
    </Box>
  );
}
