import { alpha } from '@mui/material/styles';
import { withAlpha } from '../../utils/colorUtils';
import { buildDesign } from '../buildDesign';

/**
 * Clay Pastel design skin (final Task 7)
 * - Primary: soft pastel lavender/purple accents
 * - Font family: Nunito Variable (rounded, friendly)
 * - Shape: Large border radii (very rounded, 20–28)
 * - Bubble strokes: thin (1.5), soft pastel color
 * - Bubble fills: pastel via withAlpha, subtle and soft
 * - Bubble effect: clay (soft shadow + subtle radial highlight)
 * - Backdrop: none (no decorative layer)
 * - Component shadows: neomorphic (soft outer shadow + inset highlights for pressed)
 */

const buildClayNeomorphicShadows = (c, mode, alphaFn) => {
  const shadows = ['none'];
  for (let i = 1; i <= 24; i++) {
    const y = Math.round(2 + i * 0.6);
    const blur = Math.round(6 + i * 1.4);
    const opacity = Math.min(0.06 + i * 0.005, 0.18);
    shadows.push(`0 ${y}px ${blur}px ${alphaFn(c.shadowColor, opacity)}`);
  }
  return shadows;
};

export const clay = buildDesign({
  id: 'clay',
  palette: {
    light: {
      primary: '#a084a0',
      accent: '#c8a0c0',
      secondary: '#d4a373',
      tertiary: '#a8c8b8',
      success: '#3a9d6d',
      warning: '#d4a035',
      error: '#c85a54',
      info: '#8070b0',
      backgroundDefault: '#fdf8f5',
      paper: '#fdf8f5',
      bubbleView: 'linear-gradient(135deg, #fdf8f5 0%, #faf5f2 100%)',
      textPrimary: '#3d3340',
      textSecondary: '#6d6470',
      divider: '#e8dfe2',
      shadowColor: 'rgba(50, 40, 45, 0.15)',
      shadowHighlight: 'rgba(255, 255, 255, 0.8)',
    },
    dark: {
      primary: '#9a7f95',
      accent: '#a89aa5',
      secondary: '#a68a7a',
      tertiary: '#8fa89a',
      success: '#6dd5ad',
      warning: '#e8c05c',
      error: '#f08080',
      info: '#9a8fb0',
      backgroundDefault: '#2a2328',
      paper: '#2a2328',
      bubbleView: 'linear-gradient(160deg, #2a2328 0%, #322b30 100%)',
      textPrimary: '#ddd2d5',
      textSecondary: '#9e9598',
      divider: '#3d3540',
      shadowColor: 'rgba(0, 0, 0, 0.4)',
      shadowHighlight: 'rgba(255, 255, 255, 0.12)',
    },
  },
  tokens: {
    fontFamily: "'Nunito Variable', 'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontWeightHeading: 600,
    headingExtras: { letterSpacing: '-0.01em' },
    textTransform: 'none',
    borderRadius: 24,
    shadowsBuilder: buildClayNeomorphicShadows,
  },
  bubble: {
    strokeWidth: 1.5,
    highlightStrokeWidth: 2.5,
    effect: 'clay',
    labelWeight: 500,
    fill: (c, mode) => ({
      tagAlpha: mode === 'light' ? 0.12 : 0.15,
      defaultFill: mode === 'light'
        ? withAlpha(c.primary, 0.09)
        : 'rgba(154, 127, 149, 0.10)',
    }),
    effectParams: (c, mode) => ({
      shadowColor: c.shadowColor,
      shadowFill: mode === 'light'
        ? 'rgba(50, 40, 45, 0.8)'
        : 'rgba(0, 0, 0, 0.7)',
      blurRadius: mode === 'light' ? 10 : 14,
      dx: 3,
      dy: 3,
      highlightInner: mode === 'light'
        ? 'rgba(255, 255, 255, 0.5)'
        : 'rgba(255, 255, 255, 0.15)',
      highlightOuter: 'rgba(255, 255, 255, 0)',
    }),
  },
  headerStrip: {
    show: true,
    sx: {},
  },
  backdrop: 'none',
  buttonStyles: (c, mode, alphaFn) => (mode === 'light'
    ? {
      backgroundColor: alphaFn(c.primary, 0.14),
      color: c.primary,
      boxShadow: `0 6px 12px ${alphaFn(c.shadowColor, 0.1)}, inset 0 1px 0 ${alphaFn(c.shadowHighlight, 0.2)}`,
      '&:hover': {
        backgroundColor: alphaFn(c.primary, 0.22),
      },
    }
    : {
      backgroundColor: alphaFn(c.primary, 0.2),
      color: c.textPrimary,
      boxShadow: `0 6px 12px ${alphaFn(c.shadowColor, 0.2)}, inset 0 1px 0 ${alphaFn(c.shadowHighlight, 0.1)}`,
      '&:hover': {
        backgroundColor: alphaFn(c.primary, 0.3),
      },
    }),
  outlinedButtonStyles: (c, mode, alphaFn) => (mode === 'light'
    ? {
      color: c.primary,
      borderColor: alphaFn(c.primary, 0.5),
      backgroundColor: alphaFn(c.primary, 0.06),
      '&:hover': {
        borderColor: c.primary,
        backgroundColor: alphaFn(c.primary, 0.12),
      },
    }
    : {
      color: c.accent,
      borderColor: alphaFn(c.primary, 0.6),
      backgroundColor: 'transparent',
      '&:hover': {
        borderColor: c.primary,
        backgroundColor: alphaFn(c.primary, 0.12),
      },
    }),
  componentOverrides: (c, mode, alphaFn) => ({
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          '& a': {
            color: mode === 'light' ? c.primary : c.accent,
            textDecoration: 'none',
            '&:hover': {
              color: mode === 'light' ? c.accent : c.accent,
              textDecoration: 'underline',
            },
            '&:visited': {
              color: mode === 'light' ? '#9070a8' : '#9a8fa0',
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
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          backgroundColor: mode === 'light'
            ? 'rgba(253, 248, 245, 0.95)'
            : 'rgba(42, 35, 40, 0.95)',
          boxShadow: `0 16px 40px ${alphaFn(c.shadowColor, 0.15)}, inset 0 1px 2px ${alphaFn(c.shadowHighlight, 0.3)}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: c.paper,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: `0 8px 16px ${alphaFn(c.shadowColor, 0.12)}, inset 0 1px 0 ${alphaFn(c.shadowHighlight, 0.2)}`,
          '&:active': {
            boxShadow: `0 2px 6px ${alphaFn(c.shadowColor, 0.1)}, inset 0 2px 4px ${alphaFn(c.shadowColor, 0.1)}`,
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          boxShadow: `0 12px 24px ${alphaFn(c.shadowColor, 0.14)}, inset 0 1px 0 ${alphaFn(c.shadowHighlight, 0.3)}`,
          '&:active': {
            boxShadow: `0 4px 10px ${alphaFn(c.shadowColor, 0.12)}, inset 0 2px 4px ${alphaFn(c.shadowColor, 0.08)}`,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: mode === 'light' ? c.primary : c.accent,
          '&:hover': {
            color: mode === 'light' ? c.accent : c.accent,
          },
          '&:visited': {
            color: mode === 'light' ? '#9070a8' : '#9a8fa0',
          },
        },
      },
    },
  }),
  dialogPaper: {
    borderRadius: '28px',
  },
});
