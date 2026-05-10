import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { CircleStop, Mic, X } from "lucide-react";
import { useRef, useState } from "react";
import { useGeneratePrescriptionSuggestionMutation } from "../api/prescriptionsApi";
import { useWebSpeechRecognition } from "../hooks/useWebSpeechRecognition";
import type { PrescriptionSuggestionResponse } from "../types/doctor";

interface Props {
  open: boolean;
  onClose: () => void;
  doctorId: string;
  patientId: string;
  onAccept: (suggestion: PrescriptionSuggestionResponse) => void;
}

export default function PrescriptionCopilotModal({
  open,
  onClose,
  doctorId,
  patientId,
  onAccept,
}: Props) {
  const [prompt, setPrompt] = useState("");

  const [generateSuggestion, { isLoading, data: suggestion, error, reset }] =
    useGeneratePrescriptionSuggestionMutation();

  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  const { isListening, error: micError, supported: micSupported, start, stop } =
    useWebSpeechRecognition((text) => setPrompt(text));

  function handleMicToggle() {
    if (isListening) {
      stop();
    } else {
      start(() => promptRef.current);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    await generateSuggestion({ doctorId, patientId, body: { prompt: prompt.trim() } });
  }

  function handleAccept() {
    if (suggestion) {
      onAccept(suggestion);
    }
  }

  function handleClose() {
    stop();
    setPrompt("");
    reset();
    onClose();
  }

  const errorMessage =
    error != null
      ? "Failed to generate suggestion. Please try again."
      : null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          AI Prescription Copilot
          <IconButton size="small" onClick={handleClose} disabled={isLoading}>
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            Describe what you want to prescribe in plain language. The AI will
            suggest a structured prescription based on the patient's profile.
          </Typography>

          <Stack spacing={1}>
            <TextField
              label="Prescription description"
              placeholder="e.g. Patient has a sinus infection, prescribe a 10-day course of Amoxicillin and add a nasal spray"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
              disabled={isLoading}
              slotProps={{
                input: micSupported
                  ? {
                      endAdornment: (
                        <InputAdornment position="end" sx={{ alignSelf: "flex-end", mb: 0.5 }}>
                          <Tooltip title={isListening ? "Stop recording" : "Start voice input"}>
                            <IconButton
                              size="small"
                              edge="end"
                              onClick={handleMicToggle}
                              color={isListening ? "error" : "default"}
                              disabled={isLoading}
                            >
                              {isListening ? <CircleStop size={18} /> : <Mic size={18} />}
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }
                  : undefined,
              }}
            />

            {isListening && (
              <Typography variant="caption" color="error">
                Listening…
              </Typography>
            )}

            {micError && (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                {micError}
              </Alert>
            )}
          </Stack>

          {isLoading && (
            <Stack spacing={1} sx={{ alignItems: "center", py: 2 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                Generating suggestion…
              </Typography>
            </Stack>
          )}

          {errorMessage && !isLoading && (
            <Alert severity="error">{errorMessage}</Alert>
          )}

          {suggestion && !isLoading && (
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                bgcolor: "background.paper",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: 0.5, display: "block", mb: 1.5 }}
              >
                SUGGESTED PRESCRIPTION
              </Typography>

              {suggestion.diagnosis_summary && (
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {suggestion.diagnosis_summary}
                </Typography>
              )}

              {suggestion.notes && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5, fontStyle: "italic" }}
                >
                  {suggestion.notes}
                </Typography>
              )}

              {suggestion.medications.length > 0 && (
                <Stack spacing={1.5}>
                  {suggestion.medications.map((med, i) => (
                    <Box key={i}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {med.name}
                      </Typography>
                      <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", mt: 0.5 }}>
                        {med.dosage && (
                          <Chip label={med.dosage} size="small" variant="outlined" />
                        )}
                        {med.frequency && (
                          <Chip label={med.frequency} size="small" variant="outlined" />
                        )}
                        {med.duration && (
                          <Chip label={`${med.duration}`} size="small" variant="outlined" />
                        )}
                      </Stack>
                      {med.instructions && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          {med.instructions}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {suggestion && !isLoading ? (
          <>
            <Button onClick={() => reset()}>Try again</Button>
            <Button variant="contained" onClick={handleAccept}>
              Accept
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleGenerate()}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? "Generating…" : "Generate"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
