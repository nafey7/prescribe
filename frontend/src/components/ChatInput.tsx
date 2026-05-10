import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { CircleStop, Mic, SendHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { useWebSpeechRecognition } from "../hooks/useWebSpeechRecognition";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  value: string;
  onChange: (v: string) => void;
}

export default function ChatInput({ onSend, isLoading, value, onChange }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { isListening, error, supported, start, stop, clearError } = useWebSpeechRecognition(onChange);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isLoading && isListening) stop();
  }, [isLoading, isListening, stop]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    if (isListening) stop();
    onSend(trimmed);
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoice = () => {
    clearError();
    if (isListening) {
      stop();
      return;
    }
    start(() => value);
  };

  const inputDisabled = isLoading || isListening;
  const placeholder = isLoading
    ? "Waiting for response..."
    : isListening
      ? "Listening… speak now"
      : "Ask about the patient's symptoms, medications, or history...";

  return (
    <Box
      sx={{
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        p: 2,
      }}
    >
      {error ? (
        <Alert severity="error" onClose={() => clearError()} sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      ) : null}
      <Box
        sx={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: 1,
        }}
      >
        <TextField
          inputRef={inputRef}
          value={value}
          onChange={(e) => {
            clearError();
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={inputDisabled}
          fullWidth
          variant="outlined"
          size="medium"
          color="secondary"
          sx={(theme) => {
            const control = theme.spacing(5);
            return {
              flex: 1,
              minWidth: 0,
              "& .MuiOutlinedInput-root": {
                // MUI: numeric radius is × theme.shape.borderRadius — use `1` (~8px), not raw `shape.borderRadius`
                borderRadius: 1,
                height: control,
                minHeight: control,
                boxSizing: "border-box",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderWidth: 1,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderWidth: 1,
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderWidth: 1,
                },
              },
            };
          }}
        />
        {supported ? (
          <Tooltip title={isListening ? "Stop voice input" : "Voice input (browser)"}>
            <IconButton
              type="button"
              onClick={toggleVoice}
              disabled={isLoading}
              color={isListening ? "error" : "default"}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              aria-pressed={isListening}
              size="medium"
              sx={(theme) => {
                const control = theme.spacing(5);
                return {
                  flexShrink: 0,
                  width: control,
                  height: control,
                  borderRadius: isListening ? "50%" : 1,
                  ...(isListening
                    ? {
                        bgcolor: "error.main",
                        color: "error.contrastText",
                        "&:hover": { bgcolor: "error.dark" },
                      }
                    : {
                        border: 1,
                        borderColor: "divider",
                        color: "text.secondary",
                        "&:hover": { bgcolor: "action.hover" },
                      }),
                  "&.Mui-disabled": {
                    borderColor: "action.disabledBackground",
                    color: "action.disabled",
                    bgcolor: "transparent",
                  },
                };
              }}
            >
              {isListening ? <CircleStop size={18} /> : <Mic size={18} />}
            </IconButton>
          </Tooltip>
        ) : null}
        <IconButton
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          color="secondary"
          size="medium"
          sx={(theme) => {
            const control = theme.spacing(5);
            return {
              flexShrink: 0,
              width: control,
              height: control,
              borderRadius: 1,
              bgcolor: "secondary.main",
              color: "secondary.contrastText",
              "&:hover": { bgcolor: "secondary.dark" },
              "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" },
            };
          }}
        >
          <SendHorizontal size={18} />
        </IconButton>
      </Box>
    </Box>
  );
}
