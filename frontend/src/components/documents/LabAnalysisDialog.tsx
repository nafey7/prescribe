import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { X } from "lucide-react";
import LabAnalysisPanel from "./LabAnalysisPanel";

interface Props {
  patientId: string;
  documentId: string;
  filename: string;
  open: boolean;
  onClose: () => void;
}

export default function LabAnalysisDialog({
  patientId,
  documentId,
  filename,
  open,
  onClose,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography component="span" variant="h6" noWrap>
            Lab analysis · {filename}
          </Typography>
          <IconButton onClick={onClose} aria-label="Close lab analysis">
            <X size={20} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <LabAnalysisPanel patientId={patientId} documentId={documentId} />
      </DialogContent>
    </Dialog>
  );
}
