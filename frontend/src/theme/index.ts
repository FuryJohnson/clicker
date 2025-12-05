import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    telegram: {
      bg: string;
      text: string;
      hint: string;
      link: string;
      button: string;
      buttonText: string;
      secondary: string;
    };
  }
  interface PaletteOptions {
    telegram?: {
      bg?: string;
      text?: string;
      hint?: string;
      link?: string;
      button?: string;
      buttonText?: string;
      secondary?: string;
    };
  }
}

export const createAppTheme = () =>
  createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#0098EA',
        light: '#45B8F5',
        dark: '#0077B8',
      },
      secondary: {
        main: '#2D2D37',
        light: '#3D3D47',
      },
      background: {
        default: '#1C1C26',
        paper: '#2D2D37',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#8E8E93',
      },
      success: {
        main: '#34C759',
      },
      error: {
        main: '#FF3B30',
      },
      telegram: {
        bg: '#1C1C26',
        text: '#FFFFFF',
        hint: '#8E8E93',
        link: '#0098EA',
        button: '#0098EA',
        buttonText: '#FFFFFF',
        secondary: '#2D2D37',
      },
    },
    typography: {
      fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`,
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
          },
          'html, body': {
            height: '100%',
            overflow: 'hidden',
          },
          '#root': {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
    },
  });
