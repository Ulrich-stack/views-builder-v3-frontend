export interface DesignSystem {
  colors: {
    primary: string;
    secondary: string;
    bg: string;
    surface: string;
    text: string;
    muted: string;
  };
  typography: {
    family: string;
    sizeBase: number; // en pixels
  };
  spacing: {
    radius: number;
    padding: number;
  };
}