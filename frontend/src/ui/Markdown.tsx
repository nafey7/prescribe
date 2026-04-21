import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { alpha, useTheme, type Theme } from "@mui/material";
import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const remarkPlugins = [remarkGfm];

function createMarkdownComponents(theme: Theme): Components {
  return {
    h1: ({ children }) => (
      <Typography
        component="h1"
        variant="subtitle1"
        color="text.primary"
        sx={{ fontWeight: 700, mt: 2, mb: 1, "&:first-of-type": { mt: 0 } }}
      >
        {children}
      </Typography>
    ),
    h2: ({ children }) => (
      <Typography
        component="h2"
        variant="body2"
        color="text.primary"
        sx={{ fontWeight: 700, mt: 2, mb: 0.75, "&:first-of-type": { mt: 0 } }}
      >
        {children}
      </Typography>
    ),
    h3: ({ children }) => (
      <Typography
        component="h3"
        variant="body2"
        color="text.primary"
        sx={{ fontWeight: 600, mt: 1.5, mb: 0.5, "&:first-of-type": { mt: 0 } }}
      >
        {children}
      </Typography>
    ),
    h4: ({ children }) => (
      <Typography
        component="h4"
        variant="body2"
        sx={{ fontWeight: 600, mt: 1.5, mb: 0.5, "&:first-of-type": { mt: 0 } }}
      >
        {children}
      </Typography>
    ),
    p: ({ children }) => (
      <Typography
        component="p"
        variant="body2"
        sx={{ my: 0.75, lineHeight: 1.6, "&:first-of-type": { mt: 0 }, "&:last-of-type": { mb: 0 } }}
      >
        {children}
      </Typography>
    ),
    ul: ({ children }) => (
      <Box
        component="ul"
        sx={{
          my: 0.75,
          pl: 2.5,
          listStyleType: "disc",
          "& li": { mb: 0.25 },
          color: "text.secondary",
          "& li::marker": { color: "text.disabled" },
        }}
      >
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box
        component="ol"
        sx={{
          my: 0.75,
          pl: 2.5,
          listStyleType: "decimal",
          "& li": { mb: 0.25 },
          color: "text.secondary",
          "& li::marker": { color: "text.disabled" },
        }}
      >
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Box component="li" sx={{ pl: 0.5, lineHeight: 1.6, display: "list-item" }}>
        {children}
      </Box>
    ),
    strong: ({ children }) => (
      <Typography component="strong" variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    blockquote: ({ children }) => (
      <Box
        component="blockquote"
        sx={{
          my: 1,
          pl: 1.5,
          borderLeft: 3,
          borderColor: "primary.light",
          fontStyle: "italic",
          color: "text.secondary",
        }}
      >
        {children}
      </Box>
    ),
    code: ({ className, children }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <Box
            component="code"
            sx={{
              px: 0.5,
              py: 0.25,
              borderRadius: 1,
              bgcolor: "surface.muted",
              color: "text.primary",
              fontFamily: "monospace",
              fontSize: "0.75rem",
            }}
          >
            {children}
          </Box>
        );
      }
      return <code className={className}>{children}</code>;
    },
    pre: ({ children }) => (
      <Box
        component="pre"
        sx={{
          my: 1,
          p: 1.5,
          borderRadius: 2,
          bgcolor: "surface.subtle",
          border: 1,
          borderColor: "divider",
          overflowX: "auto",
          fontSize: "0.75rem",
          fontFamily: "monospace",
        }}
      >
        {children}
      </Box>
    ),
    table: ({ children }) => (
      <TableContainer
        sx={{
          my: 1,
          overflowX: "auto",
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
        }}
      >
        <Table size="small" sx={{ minWidth: "100%" }}>
          {children}
        </Table>
      </TableContainer>
    ),
    thead: ({ children }) => (
      <TableHead sx={{ bgcolor: "surface.subtle" }}>{children}</TableHead>
    ),
    tbody: ({ children }) => <TableBody>{children}</TableBody>,
    tr: ({ children }) => <TableRow>{children}</TableRow>,
    th: ({ children }) => (
      <TableCell
        component="th"
        scope="col"
        sx={{
          px: 1.5,
          py: 1,
          textAlign: "left",
          fontWeight: 600,
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {children}
      </TableCell>
    ),
    td: ({ children }) => (
      <TableCell
        sx={{
          px: 1.5,
          py: 1,
          color: "text.secondary",
          borderTop: 1,
          borderColor: alpha(theme.palette.divider, 0.6),
          fontSize: "0.75rem",
        }}
      >
        {children}
      </TableCell>
    ),
    hr: () => <Box component="hr" sx={{ my: 1.5, border: 0, borderTop: 1, borderColor: "divider" }} />,
    a: ({ children, href }) => (
      <Link href={href} target="_blank" rel="noopener noreferrer" variant="body2" underline="hover">
        {children}
      </Link>
    ),
  };
}

type MarkdownProps = {
  children: string;
};

/**
 * `react-markdown` + `remark-gfm` with MUI primitives and theme tokens (replaces Tailwind / prose).
 */
export function Markdown({ children }: MarkdownProps) {
  const theme = useTheme();
  const components = useMemo(() => createMarkdownComponents(theme), [theme]);

  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </ReactMarkdown>
  );
}
