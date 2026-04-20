import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DashboardStatCards from "../../components/doctor/dashboard/DashboardStatCards";
import DoctorWelcomeBanner from "../../components/doctor/dashboard/DoctorWelcomeBanner";
import PendingRequestsCard from "../../components/doctor/dashboard/PendingRequestsCard";
import RecentActivityCard from "../../components/doctor/dashboard/RecentActivityCard";
import RecentPatientsCard from "../../components/doctor/dashboard/RecentPatientsCard";
import { useIdentity } from "../../contexts/IdentityContext";
import { useDoctorDashboard } from "../../hooks/useDoctorDashboard";

function DashboardSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rounded" height={96} sx={{ borderRadius: 3 }} />
      <DashboardStatCards stats={undefined} />
      <Skeleton variant="rounded" height={192} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={224} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={192} sx={{ borderRadius: 3 }} />
    </Stack>
  );
}

export default function DoctorDashboardPage() {
  const { currentDoctorId } = useIdentity();
  const { data, isLoading, error } = useDoctorDashboard();

  if (!currentDoctorId) {
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Alert severity="warning" sx={{ mt: 1 }}>
          Select a doctor in the dev identity bar to load your overview.
        </Alert>
      </>
    );
  }

  return (
    <>
      <Box
        component="h1"
        sx={{
          position: "absolute",
          width: 1,
          height: 1,
          p: 0,
          m: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Doctor dashboard
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }} role="alert">
          {error}
        </Alert>
      ) : null}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <Stack spacing={3}>
          <DoctorWelcomeBanner data={data} />
          <DashboardStatCards stats={data?.stats} />
          <Stack spacing={3}>
            <PendingRequestsCard items={data?.pending_requests ?? []} />
            <RecentPatientsCard patients={data?.recent_patients ?? []} />
            <RecentActivityCard items={data?.recent_activity ?? []} />
          </Stack>
        </Stack>
      )}
    </>
  );
}
