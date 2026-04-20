import { FileText, ExternalLink } from "lucide-react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { paths } from "../../router/paths";
import type { DocumentSummary } from "../../types/patient";

interface Props {
  documents: DocumentSummary[];
  /** Router path for “View all” (default: patient `/documents`). */
  viewAllTo?: string;
}

export default function RecentDocumentsCard({
  documents,
  viewAllTo = paths.patient.documents,
}: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "success.main", display: "flex" }}>
            <FileText size={18} />
          </Box>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
            Recent documents
          </Typography>
        </Stack>
        <Link
          component={RouterLink}
          to={viewAllTo}
          underline="hover"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            typography: "body2",
            fontWeight: 600,
            color: "success.main",
          }}
        >
          View all
          <ExternalLink size={14} />
        </Link>
      </Stack>
      {documents.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No uploaded documents yet. Uploads will appear here when available.
        </Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {documents.map((d) => (
            <Box component="li" key={d.document_id}>
              <Link
                component={RouterLink}
                to={
                  viewAllTo.includes("?")
                    ? `${viewAllTo}&doc=${encodeURIComponent(d.document_id)}`
                    : `${viewAllTo}?doc=${encodeURIComponent(d.document_id)}`
                }
                underline="none"
                color="inherit"
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 1,
                  borderRadius: 1,
                  px: 1,
                  py: 0.75,
                  typography: "body2",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Typography component="span" sx={{ fontWeight: 600 }}>
                  {d.filename}
                </Typography>
                {d.uploaded_at && (
                  <Typography component="span" variant="caption" color="text.secondary">
                    {d.uploaded_at}
                  </Typography>
                )}
              </Link>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
