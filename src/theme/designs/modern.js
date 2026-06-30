import { alpha } from '@mui/material/styles';
import { withAlpha } from '../../utils/colorUtils';
import { buildDesign } from '../buildDesign';

/**
 * Modern design skin (current minimal redesign look)
 * - Primary color: #2f6bdb (modern blue)
 * - Font family: Inter (variable)
 * - Shape: Soft (borderRadius 12)
 * - Bubble strokes: lineWidth 1.5 / highlight 2.5
 * - Bubble fills: pastel via withAlpha
 */

const buildSoftShadows = (c, mode, alphaFn) => {
  const shadows = ['none'];
  for (let i = 1; i <= 24; i++) {
    const y = Math.round(1 + i * 0.75);
    const blur = Math.round(4 + i * 1.6);
    const opacity = Math.min(0.05 + i * 0.007, 0.22);
    shadows.push(`0 ${y}px ${blur}px rgba(15, 23, 42, ${opacity})`);
  }
  return shadows;
};

export const modern = buildDesign({
  id: 'modern',
  palette: {
    light: {
      primary: '#2f6bdb',
      secondary: '#FF6B6B',
      success: '#2e9e63',
      warning: '#d97f1d',
      error: '#d05050',
      info: '#2f86c1',
      backgroundDefault: '#fafbfc',
      paper: '#ffffff',
      bubbleView: '#fafbfc',
      textPrimary: '#1c2330',
      textSecondary: '#5b6472',
      divider: '#eef0f3',
    },
    dark: {
      primary: '#5589e8',
      secondary: '#FF6B6B',
      success: '#4ec98b',
      warning: '#e8a44b',
      error: '#ef7070',
      info: '#5fb0de',
      backgroundDefault: '#151c28',
      paper: '#161d2a',
      bubbleView: 'linear-gradient(160deg, #151c28 0%, #1b2433 100%)',
      textPrimary: '#e8ecf4',
      textSecondary: '#8e9ab0',
      divider: '#263043',
    },
  },
  tokens: {
    fontFamily: "'InterVariable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontWeightHeading: 600,
    headingExtras: { letterSpacing: '-0.01em' },
    textTransform: 'none',
    borderRadius: 12,
    shadowsBuilder: buildSoftShadows,
  },
  bubble: {
    strokeWidth: 1.5,
    highlightStrokeWidth: 2.5,
    effect: 'none',
    labelWeight: 600,
    fill: (c, mode) => ({
      tagAlpha: mode === 'light' ? 0.10 : 0.14,
      defaultFill: mode === 'light'
        ? withAlpha('#2f6bdb', 0.08)
        : 'rgba(255, 255, 255, 0.06)',
    }),
  },
  headerStrip: {
    show: true,
    sx: {},
  },
  backdrop: 'none',
  buttonStyles: (c, mode, alphaFn) => (mode === 'light'
    ? {
      backgroundColor: alphaFn(c.primary, 0.12),
      color: c.primary,
      '&:hover': {
        backgroundColor: alphaFn(c.primary, 0.2),
      },
    }
    : {
      backgroundColor: alphaFn(c.primary, 0.18),
      color: c.textPrimary,
      '&:hover': {
        backgroundColor: alphaFn(c.primary, 0.28),
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
      color: c.textPrimary,
      borderColor: alphaFn(c.primary, 0.6),
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
            color: mode === 'light' ? '#2f6bdb' : '#8eb0f0',
            textDecoration: 'none',
            '&:hover': {
              color: mode === 'light' ? '#2558b8' : '#aac4f4',
              textDecoration: 'underline',
            },
            '&:visited': {
              color: mode === 'light' ? '#7b1fa2' : '#ce93d8',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          backgroundColor: mode === 'light'
            ? 'rgba(255, 255, 255, 0.95)'
            : 'rgba(22, 29, 42, 0.95)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: `0 4px 14px ${alphaFn(c.primary, 0.35)}`,
          '&:active': {
            boxShadow: `0 2px 8px ${alphaFn(c.primary, 0.4)}`,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: mode === 'light' ? '#2f6bdb' : '#8eb0f0',
          '&:hover': {
            color: mode === 'light' ? '#2558b8' : '#aac4f4',
          },
          '&:visited': {
            color: mode === 'light' ? '#7b1fa2' : '#ce93d8',
          },
        },
      },
    },
  }),
  dialogPaper: {
    borderRadius: '16px',
  },
});
