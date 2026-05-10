declare module "@mui/material/styles" {
  interface Palette {
    surface: {
      subtle: string;
      muted: string;
      elevated: string;
    };
  }

  interface PaletteOptions {
    surface?: {
      subtle?: string;
      muted?: string;
      elevated?: string;
    };
  }

  interface PaletteColor {
    50?: string;
    100?: string;
    200?: string;
    300?: string;
    400?: string;
    500?: string;
    600?: string;
    700?: string;
    800?: string;
    900?: string;
  }

  interface PaletteColorOptions {
    50?: string;
    100?: string;
    200?: string;
    300?: string;
    400?: string;
    500?: string;
    600?: string;
    700?: string;
    800?: string;
    900?: string;
  }
}

export {};
