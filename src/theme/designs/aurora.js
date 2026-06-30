import { alpha } from '@mui/material/styles';
import { withAlpha } from '../../utils/colorUtils';
import { buildDesign } from '../buildDesign';

/**
 * Aurora Glass design skin
 * - Primary color: neon purple/pink accent (#a78bfa)
 * - Font family: Sora (headings) + Inter (body)
 * - Shape: Rounded (glassmorphic)
 * - Bubble strokes: neon-lit, thin (1.5)
 * - Bubble fills: translucent glass; glow effect on dark variant
 * - Backdrop: aurora (animated neon gradient drift)
 * - Effect: glow with neon halo params
 */

const buildAuroraShadows = (c, mode, alphaFn) => {
  const shadows = ['none'];
  for (let i = 1; i <= 24; i++) {
    const y = Math.round(1 + i * 0.75);
    const blur = Math.round(4 + i * 1.6);
    const opacity = Math.min(0.08 + i * 0.008, 0.25);
    shadows.push(`0 ${y}px ${blur}px ${alphaFn(c.primary, opacity)}`);
  }
  return shadows;
};

export const aurora = buildDesign({
  id: 'aurora',
  palette: {
    light: {
      primary: '#9d4edd',
      accent: '#e0aaff',
      secondary: '#f472b6',
      success: '#3a9d6d',
      warning: '#d4a035',
      error: '#c85a54',
      info: '#7c3aed',
      backgroundDefault: '#faf8ff',
      paper: '#ffffff',
      bubbleView: 'linear-gradient(135deg, #faf8ff 0%, #f5ecff 100%)',
      textPrimary: '#2a1a4e',
      textSecondary: '#6b5b91',
      divider: '#e8dfff',
      glowColor: '#c77dff',
    },
    dark: {
      primary: '#a78bfa',
      accent: '#d8b4ff',
      secondary: '#f472b6',
      success: '#6dd5ad',
      warning: '#e8c05c',
      error: '#f08080',
      info: '#a78bfa',
      backgroundDefault: '#0b0e1a',
      paper: '#1a1d2e',
      bubbleView: 'linear-gradient(160deg, #0b0e1a 0%, #16152b 100%)',
      textPrimary: '#e0d5ff',
      textSecondary: '#b8a8d8',
      divider: '#2d2347',
      glowColor: '#a78bfa',
    },
  },
  tokens: {
    fontFamily: "'InterVariable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontWeightHeading: 600,
    headingExtras: { letterSpacing: '-0.01em', fontFamily: "'Sora Variable', system-ui" },
    textTransform: 'none',
    borderRadius: 16,
    shadowsBuilder: buildAuroraShadows,
  },
  bubble: {
    strokeWidth: 1.5,
    highlightStrokeWidth: 2.5,
    effect: 'glow',
    labelWeight: 600,
    labelShadow: (mode) => mode === 'dark',
    fill: (c, mode) => ({
      tagAlpha: mode === 'light' ? 0.12 : 0.18,
      defaultFill: mode === 'light'
        ? withAlpha(c.primary, 0.09)
        : 'rgba(167, 139, 250, 0.08)',
    }),
    effectParams: (c, mode) => ({
      glowColor: c.glowColor,
      blurRadius: mode === 'light' ? 8 : 16,
    }),
    defaultStroke: (c) => c.glowColor,
  },
  headerStrip: {
    show: true,
    sx: (c, mode, alphaFn) => ({
      backgroundColor: mode === 'light'
        ? 'rgba(255, 248, 255, 0.7)'
        : 'rgba(26, 29, 46, 0.5)',
      backdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${alphaFn(c.primary, mode === 'light' ? 0.15 : 0.25)}`,
    }),
  },
  backdrop: 'aurora',
  buttonStyles: (c, mode, alphaFn) => (mode === 'light'
    ? {
      backgroundColor: alphaFn(c.primary, 0.15),
      color: c.primary,
      '&:hover': {
        backgroundColor: alphaFn(c.primary, 0.25),
      },
    }
    : {
      backgroundColor: alphaFn(c.glowColor, 0.2),
      color: c.textPrimary,
      '&:hover': {
        backgroundColor: alphaFn(c.glowColor, 0.3),
      },
    }),
  outlinedButtonStyles: (c, mode, alphaFn) => (mode === 'light'
    ? {
      color: c.primary,
      borderColor: alphaFn(c.primary, 0.6),
      backgroundColor: alphaFn(c.primary, 0.06),
      '&:hover': {
        borderColor: c.primary,
        backgroundColor: alphaFn(c.primary, 0.15),
      },
    }
    : {
      color: c.accent,
      borderColor: alphaFn(c.glowColor, 0.7),
      backgroundColor: alphaFn(c.glowColor, 0.08),
      '&:hover': {
        borderColor: c.glowColor,
        backgroundColor: alphaFn(c.glowColor, 0.15),
      },
    }),
  componentOverrides: (c, mode, alphaFn) => ({
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          '& a': {
            color: c.primary,
            textDecoration: 'none',
            '&:hover': {
              color: c.accent,
              textDecoration: 'underline',
            },
            '&:visited': {
              color: mode === 'light' ? '#7c3aed' : '#d8b4ff',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: mode === 'light'
            ? 'rgba(255, 248, 255, 0.8)'
            : 'rgba(26, 29, 46, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          backgroundColor: mode === 'light'
            ? 'rgba(255, 248, 255, 0.95)'
            : 'rgba(26, 29, 46, 0.95)',
          backdropFilter: 'blur(12px)',
          border: mode === 'light'
            ? `1px solid ${alphaFn(c.primary, 0.2)}`
            : `1px solid ${alphaFn(c.primary, 0.3)}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: mode === 'light'
            ? 'rgba(255, 248, 255, 0.9)'
            : 'rgba(26, 29, 46, 0.9)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: `0 8px 24px ${alphaFn(c.glowColor, 0.4)}`,
          '&:active': {
            boxShadow: `0 4px 12px ${alphaFn(c.glowColor, 0.5)}`,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: c.primary,
          '&:hover': {
            color: c.accent,
          },
          '&:visited': {
            color: mode === 'light' ? '#7c3aed' : '#d8b4ff',
          },
        },
      },
    },
  }),
  dialogPaper: {
    borderRadius: '20px',
  },
});
