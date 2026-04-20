import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function DocumentPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (total === 0) return null;

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        py: 2,
        color: "text.secondary",
      }}
    >
      <Button
        type="button"
        variant="outlined"
        size="small"
        disabled={!canPrev}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <Typography variant="body2" color="text.secondary" component="div">
        Page {page} of {totalPages}{" "}
        <Box component="span" sx={{ color: "text.disabled" }}>
          · {total} total
        </Box>
      </Typography>
      <Button
        type="button"
        variant="outlined"
        size="small"
        disabled={!canNext}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </Stack>
  );
}
