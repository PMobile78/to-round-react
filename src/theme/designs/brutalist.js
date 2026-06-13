import { alpha } from '@mui/material/styles';
import { withAlpha } from '../../utils/colorUtils';

/**
 * Brutalist design skin (neo-brutalist aesthetic)
 * - Primary: stark black/white with loud accent colors (electric blue, hot pink, acid yellow)
 * - Font family: Space Grotesk (headings, bold) + Archivo (body)
 * - Shape: Sharp (borderRadius 0–2)
 * - Bubble strokes: thick (3–4px), black/white ink
 * - Bubble fills: solid with hard shadows
 * - Bubble effect: hardShadow (offset disc shadow at 5px 5px)
 * - Backdrop: dots (minimal grid pattern)
 * - Hard offset shadows on all components (buttons, dialogs, FABs): 5px 5px 0 #000 (light) or 5px 5px 0 #fff (dark)
 */

export const brutalist = (mode) => {
  const palettes = {
    light: {
      primary: '#0066ff', // Electric blue
      secondary: '#ff0099', // Hot pink
      tertiary: '#ccff00', // Acid yellow
      backgroundDefault: '#f5f0e6', // Warm off-white
      paper: '#f5f0e6',
      bubbleView: '#f5f0e6',
      textPrimary: '#000000', // Pure black
      textSecondary: '#333333', // Dark gray
      divider: '#d0d0d0',
      shadowColor: '#000000', // Black hard shadow
    },
    dark: {
      primary: '#00ddff', // Bright cyan
      secondary: '#ff00ff', // Magenta
      tertiary: '#ffff00', // Pure yellow
      backgroundDefault: '#0a0a0a', // Pure black
      paper: '#1a1a1a',
      bubbleView: '#0a0a0a',
      textPrimary: '#ffffff', // Pure white
      textSecondary: '#cccccc', // Light gray
      divider: '#404040',
      shadowColor: '#ffffff', // White hard shadow
    },
  };

  const c = palettes[mode];

  // Stark shadows with hard offset
  const buildBrutalistShadows = () => {
    const shadows = ['none'];
    for (let i = 1; i <= 24; i++) {
      const offset = 5 + Math.floor(i * 0.2);
      shadows.push(`${offset}px ${offset}px 0 ${alpha(c.shadowColor, 0.4)}`);
    }
    return shadows;
  };

  return {
    palette: {
      mode,
      primary: { main: c.primary },
      secondary: { main: c.secondary },
      success: { main: mode === 'light' ? '#00aa00' : '#00ff00' },
      warning: { main: mode === 'light' ? '#ff6600' : '#ffaa00' },
      error: { main: mode === 'light' ? '#cc0000' : '#ff3333' },
      info: { main: mode === 'light' ? '#0066ff' : '#00ddff' },
      background: {
        default: c.backgroundDefault,
        paper: c.paper,
        bubbleView: c.bubbleView,
      },
      text: {
        primary: c.textPrimary,
        secondary: c.textSecondary,
      },
      divider: c.divider,
    },

    typography: {
      fontFamily: "'Archivo Variable', 'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif",
      h1: { fontWeight: 900, letterSpacing: '-0.02em', fontFamily: "'Space Grotesk Variable', system-ui" },
      h2: { fontWeight: 900, letterSpacing: '-0.02em', fontFamily: "'Space Grotesk Variable', system-ui" },
      h3: { fontWeight: 800, letterSpacing: '-0.01em', fontFamily: "'Space Grotesk Variable', system-ui" },
      h4: { fontWeight: 800, letterSpacing: '-0.01em', fontFamily: "'Space Grotesk Variable', system-ui" },
      h5: { fontWeight: 700, fontFamily: "'Space Grotesk Variable', system-ui" },
      h6: { fontWeight: 700, fontFamily: "'Space Grotesk Variable', system-ui" },
      button: { fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Archivo Variable', 'Archivo'" },
    },

    shape: {
      borderRadius: 0, // Sharp, no rounding
    },

    shadows: buildBrutalistShadows(),

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            '& a': {
              color: mode === 'light' ? c.primary : c.primary,
              textDecoration: 'underline',
              fontWeight: 700,
              '&:hover': {
                color: mode === 'light' ? c.secondary : c.secondary,
              },
              '&:visited': {
                color: mode === 'light' ? '#663399' : '#aa77ff',
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: c.paper,
            border: `2px solid ${c.textPrimary}`,
            boxShadow: `5px 5px 0 ${alpha(c.shadowColor, 0.5)}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            backgroundColor: c.paper,
            border: `3px solid ${c.textPrimary}`,
            boxShadow: `8px 8px 0 ${alpha(c.shadowColor, 0.6)}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: c.paper,
            border: `2px solid ${c.textPrimary}`,
            boxShadow: `5px 5px 0 ${alpha(c.shadowColor, 0.5)}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: `2px solid ${c.textPrimary}`,
            boxShadow: `4px 4px 0 ${alpha(c.shadowColor, 0.5)}`,
            '&:active': {
              boxShadow: `2px 2px 0 ${alpha(c.shadowColor, 0.4)}`,
            },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: `3px solid ${c.textPrimary}`,
            boxShadow: `6px 6px 0 ${alpha(c.shadowColor, 0.6)}`,
            '&:active': {
              boxShadow: `3px 3px 0 ${alpha(c.shadowColor, 0.5)}`,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            '& fieldset': {
              borderWidth: '2px',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: `2px solid ${c.textPrimary}`,
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: c.primary,
            fontWeight: 700,
            textDecoration: 'underline',
            '&:hover': {
              color: c.secondary,
            },
            '&:visited': {
              color: mode === 'light' ? '#663399' : '#aa77ff',
            },
          },
        },
      },
    },

    custom: {
      design: 'brutalist',
      bubble: {
        strokeWidth: 3.5,
        highlightStrokeWidth: 4.5,
        defaultStroke: c.textPrimary,
        fill: {
          tagAlpha: mode === 'light' ? 0.25 : 0.30,
          defaultFill: mode === 'light'
            ? 'rgba(0, 102, 255, 0.15)'
            : 'rgba(0, 221, 255, 0.18)',
        },
        effect: 'hardShadow',
        effectParams: {
          dx: 5,
          dy: 5,
          shadowColor: c.shadowColor,
          shadowAlpha: mode === 'light' ? 0.6 : 0.5,
        },
        label: {
          weight: 800,
          color: c.textPrimary,
          shadow: false,
        },
      },
      canvasBackground: c.bubbleView,
      headerStrip: {
        show: true,
        sx: {
          backgroundColor: c.paper,
          borderBottom: `2px solid ${c.textPrimary}`,
        },
      },
      backdrop: 'dots',
      buttonStyles: {
        backgroundColor: mode === 'light' ? c.tertiary : c.tertiary,
        color: c.textPrimary,
        border: `2px solid ${c.textPrimary}`,
        '&:hover': {
          backgroundColor: mode === 'light' ? alpha(c.tertiary, 0.8) : alpha(c.tertiary, 0.8),
        },
      },
      outlinedButtonStyles: {
        color: c.textPrimary,
        borderColor: c.textPrimary,
        borderWidth: '2px',
        backgroundColor: 'transparent',
        '&:hover': {
          borderColor: c.primary,
          backgroundColor: alpha(c.primary, 0.1),
        },
      },
      dialogPaper: {
        borderRadius: 0,
      },
    },
  };
};
