import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { paths } from "../router/paths";

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || error.data?.toString?.() || `Error ${error.status}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Something went wrong.";
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const message = errorMessage(error);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          p: 4,
          boxShadow: 1,
        }}
      >
        <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600 }}>
          Something went wrong
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} role="alert">
          {message}
        </Typography>
        <Button
          component={Link}
          to={paths.root}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3, py: 1.25 }}
        >
          Back to home
        </Button>
      </Paper>
    </Box>
  );
}
