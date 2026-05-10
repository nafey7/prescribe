# Figma Design Implementation

Implement the Figma design from the URL provided by the user using the Figma MCP.

## Input

The user will provide a Figma design URL when invoking this command (e.g. via `$ARGUMENTS` or in their message). Example URL format:

```
https://www.figma.com/design/<fileKey>/<fileName>?node-id=<nodeId>
```

**Important:** Use only the URL the user provides. Do not use or fetch any example URL; the example above is for format reference only.

## Workflow

1. **Extract node ID**: Parse the Figma URL to get `node-id`. Convert hyphen to colon (e.g. `232-9876` → `232:9876`).
2. **Fetch design context**: Call the Figma MCP `get_design_context` tool with:
   - `nodeId`: Extracted from the URL
   - `clientLanguages`: `typescript`
   - `clientFrameworks`: `react`
   - `artifactType`: `COMPONENT_WITHIN_A_WEB_PAGE_OR_APP_SCREEN` or `REUSABLE_COMPONENT` as appropriate
3. **Implement** following the technical guidelines below.

## Technical Guidelines (Strict)

- **Tech Stack:** React (Vite). Export as a clean, functional component.
- **Strict MUI Usage:** Do not write raw HTML elements (`<div>`, `<span>`, `<p>`, `<button>`). Use **only** Material UI (MUI) components.
- **Layout Mapping:**
  - Figma Auto Layouts → MUI `<Stack>` (flexbox/directional layouts) or `<Box>` components
- **Elements:**
  - All text → MUI `<Typography>`
  - All buttons → MUI `<Button>`
- **Typography height/spacing:** MUI Typography variants (e.g. `variant="h4"`, default `body1`) add default margins that inflate height. For Figma-matched text, **always** use `component="span"`, apply styles via `sx` (fontSize, fontWeight, lineHeight), add `m: 0` to reset margins, and use `display: 'block'` when the text participates in flex layouts.
- **Button height/spacing:** MUI Button `sizeMedium` adds default padding and min-height. For Figma-matched buttons, use `size="small"`, add `minHeight: 0` and `m: 0` in `sx`, and set padding explicitly (e.g. `py`, `pl`, `pr`) to match the design.
  - Tags, filters, pills, badges, or compact labeled elements → MUI `<Chip>`
- **Styling:** Use the MUI `sx` prop only. No separate CSS files, no Tailwind. Apply exact padding, gaps, background colors, and border-radius from the Figma node.
- **Props:** Extract obvious dynamic content (titles, descriptions, image URLs) into component props with TypeScript interfaces.
- **Section comments:** Add brief comments for major component sections (e.g. header, form area, card list) so each block’s purpose is clear. Keep comments at section level only—do not comment every small element.
