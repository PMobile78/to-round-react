import { alpha } from '@mui/material/styles';
import { buildDesign } from '../buildDesign';

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

const buildBrutalistShadows = (c, mode, alphaFn) => {
  const shadows = ['none'];
  for (let i = 1; i <= 24; i++) {
    const offset = 5 + Math.floor(i * 0.2);
    shadows.push(`${offset}px ${offset}px 0 ${alphaFn(c.shadowColor, 0.4)}`);
  }
  return shadows;
};

export const brutalist = buildDesign({
  id: 'brutalist',
  palette: {
    light: {
      primary: '#0066ff',
      secondary: '#ff0099',
      tertiary: '#ccff00',
      success: '#00aa00',
      warning: '#ff6600',
      error: '#cc0000',
      info: '#0066ff',
      backgroundDefault: '#f5f0e6',
      paper: '#f5f0e6',
      bubbleView: '#f5f0e6',
      textPrimary: '#000000',
      textSecondary: '#333333',
      divider: '#d0d0d0',
      shadowColor: '#000000',
    },
    dark: {
      primary: '#00ddff',
      secondary: '#ff00ff',
      tertiary: '#ffff00',
      success: '#00ff00',
      warning: '#ffaa00',
      error: '#ff3333',
      info: '#00ddff',
      backgroundDefault: '#0a0a0a',
      paper: '#1a1a1a',
      bubbleView: '#0a0a0a',
      textPrimary: '#ffffff',
      textSecondary: '#cccccc',
      divider: '#404040',
      shadowColor: '#ffffff',
    },
  },
  tokens: {
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontWeightHeading: 900,
    headingExtras: { fontFamily: "'Space Grotesk Variable', system-ui", letterSpacing: '-0.02em' },
    textTransform: 'uppercase',
    borderRadius: 0,
    shadowsBuilder: buildBrutalistShadows,
  },
  bubble: {
    strokeWidth: 3.5,
    highlightStrokeWidth: 4.5,
    defaultStroke: (c) => c.textPrimary,
    effect: 'hardShadow',
    labelWeight: 800,
    fill: (c, mode) => ({
      tagAlpha: mode === 'light' ? 0.25 : 0.30,
      defaultFill: mode === 'light'
        ? 'rgba(0, 102, 255, 0.15)'
        : 'rgba(0, 221, 255, 0.18)',
    }),
    effectParams: (c, mode) => ({
      dx: 5,
      dy: 5,
      shadowColor: c.shadowColor,
      shadowAlpha: mode === 'light' ? 0.6 : 0.5,
    }),
  },
  headerStrip: {
    show: true,
    sx: (c, mode, alphaFn) => ({
      backgroundColor: c.paper,
      borderBottom: `2px solid ${c.textPrimary}`,
    }),
  },
  backdrop: 'dots',
  buttonStyles: (c, mode, alphaFn) => ({
    backgroundColor: c.tertiary,
    color: c.textPrimary,
    border: `2px solid ${c.textPrimary}`,
    '&:hover': {
      backgroundColor: alphaFn(c.tertiary, 0.8),
    },
  }),
  outlinedButtonStyles: (c, mode, alphaFn) => ({
    color: c.textPrimary,
    borderColor: c.textPrimary,
    borderWidth: '2px',
    backgroundColor: 'transparent',
    '&:hover': {
      borderColor: c.primary,
      backgroundColor: alphaFn(c.primary, 0.1),
    },
  }),
  componentOverrides: (c, mode, alphaFn) => ({
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
          boxShadow: `5px 5px 0 ${alphaFn(c.shadowColor, 0.5)}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          backgroundColor: c.paper,
          border: `3px solid ${c.textPrimary}`,
          boxShadow: `8px 8px 0 ${alphaFn(c.shadowColor, 0.6)}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: c.paper,
          border: `2px solid ${c.textPrimary}`,
          boxShadow: `5px 5px 0 ${alphaFn(c.shadowColor, 0.5)}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `2px solid ${c.textPrimary}`,
          boxShadow: `4px 4px 0 ${alphaFn(c.shadowColor, 0.5)}`,
          '&:active': {
            boxShadow: `2px 2px 0 ${alphaFn(c.shadowColor, 0.4)}`,
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `3px solid ${c.textPrimary}`,
          boxShadow: `6px 6px 0 ${alphaFn(c.shadowColor, 0.6)}`,
          '&:active': {
            boxShadow: `3px 3px 0 ${alphaFn(c.shadowColor, 0.5)}`,
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
  }),
  dialogPaper: {
    borderRadius: '0px',
  },
});
