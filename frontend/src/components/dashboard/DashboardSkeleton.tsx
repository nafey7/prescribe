import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function DashboardSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={112} sx={{ borderRadius: 2 }} />
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
        }}
      >
        <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
      </Box>
      <Skeleton variant="rounded" height={192} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rounded" height={224} sx={{ borderRadius: 2 }} />
    </Stack>
  );
}
