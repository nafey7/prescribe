import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import { ShieldAlert, Stethoscope, UserRound } from "lucide-react";
import PatientSelector from "./PatientSelector";
import { useAuth } from "../contexts/AuthContext";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import { useIdentity } from "../contexts/IdentityContext";
import { usePatientContext } from "../contexts/PatientContext";
import type { DoctorInfo } from "../types/doctor";

/**
 * Sticky dev-only bar: role switch + acting-as identity when the backend allows
 * header bypass and no JWT session. Stripped in production builds.
 */
export default function DevIdentityBanner() {
  const { user } = useAuth();
  const { authRelaxed } = useFeatureFlags();
  const {
    currentRole,
    setCurrentRole,
    currentDoctorId,
    setCurrentDoctorId,
    doctors,
    isDoctorsLoading,
    doctorsError,
    currentDoctor,
  } = useIdentity();
  const { currentPatientId, setCurrentPatientId } = usePatientContext();

  if (!import.meta.env.DEV || !authRelaxed || user) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        flexShrink: 0,
        borderBottom: 1,
        borderColor: (theme) => alpha(theme.palette.warning.dark, 0.45),
        bgcolor: "warning.light",
        px: 2,
        py: 1,
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          mx: "auto",
          display: "flex",
          maxWidth: "72rem",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            minWidth: 0,
            flex: 1,
            alignItems: "center",
            gap: 1,
            color: "warning.dark",
          }}
        >
          <ShieldAlert size={16} aria-hidden />
          <Typography variant="caption" component="p" sx={{ color: "warning.dark", m: 0 }}>
            <Box component="strong" sx={{ fontWeight: 700 }}>
              DEV MODE
            </Box>{" "}
            — Role:{" "}
            <Box component="span" sx={{ color: "warning.main" }}>
              (picker only, not authentication). Educational prototype.
            </Box>
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexShrink: 0,
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 600 }}>
              Role
            </Typography>
            <FormControl size="small" variant="outlined">
              <Select
                value={currentRole}
                onChange={(e) =>
                  setCurrentRole(e.target.value as "patient" | "doctor")
                }
                inputProps={{ "aria-label": "Switch dev role" }}
                sx={{
                  minWidth: 100,
                  bgcolor: "background.paper",
                  typography: "caption",
                  fontWeight: 600,
                  color: "warning.dark",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: (theme) => alpha(theme.palette.warning.main, 0.55),
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "warning.main",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "warning.main",
                  },
                }}
              >
                <MenuItem value="patient">Patient</MenuItem>
                <MenuItem value="doctor">Doctor</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {currentRole === "patient" ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderLeft: 1,
                borderColor: (theme) => alpha(theme.palette.warning.main, 0.45),
                pl: 1,
              }}
            >
              <Typography
                variant="caption"
                color="warning.dark"
                sx={{ display: { xs: "none", sm: "inline" }, fontWeight: 600 }}
              >
                Acting as
              </Typography>
              <UserRound size={16} aria-hidden style={{ opacity: 0.85 }} />
              <PatientSelector
                selectedId={currentPatientId}
                onChange={setCurrentPatientId}
                ariaLabel="Switch active patient"
              />
            </Box>
          ) : null}

          {currentRole === "doctor" ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderLeft: 1,
                borderColor: (theme) => alpha(theme.palette.warning.main, 0.45),
                pl: 1,
              }}
            >
              <Typography
                variant="caption"
                color="warning.dark"
                sx={{ display: { xs: "none", sm: "inline" }, fontWeight: 600 }}
              >
                Acting as
              </Typography>
              <Stethoscope size={16} aria-hidden style={{ opacity: 0.85 }} />
              <DoctorIdentityPicker
                doctors={doctors}
                selectedId={currentDoctorId ?? ""}
                onChange={setCurrentDoctorId}
                isLoading={isDoctorsLoading}
                error={doctorsError}
                currentDoctor={currentDoctor}
              />
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

function DoctorIdentityPicker({
  doctors,
  selectedId,
  onChange,
  isLoading,
  error,
  currentDoctor,
}: {
  doctors: DoctorInfo[];
  selectedId: string;
  onChange: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  currentDoctor: DoctorInfo | null;
}) {
  const selected = doctors.find((d) => d.id === selectedId);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <FormControl size="small" variant="outlined">
        <Select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading || doctors.length === 0}
          inputProps={{ "aria-label": "Switch active doctor" }}
          sx={{
            minWidth: 160,
            typography: "body2",
            fontWeight: 500,
          }}
        >
          {doctors.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
              {d.specialization ? ` — ${d.specialization}` : ""}
              {d.institution ? ` · ${d.institution}` : ""}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {isLoading ? (
        <Typography variant="caption" color="text.secondary">
          Loading…
        </Typography>
      ) : null}
      {error ? (
        <Typography
          variant="caption"
          color="error"
          title={error}
          sx={{ maxWidth: 140 }}
          noWrap
        >
          {error}
        </Typography>
      ) : null}
      {!isLoading && !selected && doctors.length > 0 ? (
        <Typography variant="caption" color="warning.main">
          Unknown doctor
        </Typography>
      ) : null}
      {!isLoading && currentDoctor ? (
        <Typography
          variant="caption"
          color="warning.dark"
          sx={{
            display: { xs: "none", lg: "inline" },
            maxWidth: 180,
          }}
          noWrap
        >
          {currentDoctor.specialization}
        </Typography>
      ) : null}
    </Box>
  );
}
