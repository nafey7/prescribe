import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box
      sx={{
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        p: 2,
      }}
    >
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isLoading
              ? "Waiting for response..."
              : "Ask about the patient's symptoms, medications, or history..."
          }
          disabled={isLoading}
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
        <IconButton
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
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
