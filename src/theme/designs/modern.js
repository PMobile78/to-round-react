import { alpha } from '@mui/material/styles';
import { withAlpha } from '../../utils/colorUtils';

/**
 * Modern design skin (current minimal redesign look)
 * - Primary color: #2f6bdb (modern blue)
 * - Font family: Inter (variable)
 * - Shape: Soft (borderRadius 12)
 * - Bubble strokes: lineWidth 1.5 / highlight 2.5
 * - Bubble fills: pastel via withAlpha (tag colors 0.10 light / 0.14 dark, default 0.08 / 0.06)
 */

export const modern = (mode) => {
  const palettes = {
    light: {
      primary: '#2f6bdb',
      backgroundDefault: '#fafbfc',
      paper: '#ffffff',
      bubbleView: '#fafbfc',
      textPrimary: '#1c2330',
      textSecondary: '#5b6472',
      divider: '#eef0f3',
    },
    dark: {
      primary: '#5589e8',
      backgroundDefault: '#151c28',
      paper: '#161d2a',
      bubbleView: 'linear-gradient(160deg, #151c28 0%, #1b2433 100%)',
      textPrimary: '#e8ecf4',
      textSecondary: '#8e9ab0',
      divider: '#263043',
    },
  };

  const c = palettes[mode];

  const buildSoftShadows = () => {
    const shadows = ['none'];
    for (let i = 1; i <= 24; i++) {
      const y = Math.round(1 + i * 0.75);
      const blur = Math.round(4 + i * 1.6);
      const opacity = Math.min(0.05 + i * 0.007, 0.22);
      shadows.push(`0 ${y}px ${blur}px rgba(15, 23, 42, ${opacity})`);
    }
    return shadows;
  };

  return {
    palette: {
      mode,
      primary: { main: c.primary },
      secondary: { main: '#FF6B6B' },
      success: { main: mode === 'light' ? '#2e9e63' : '#4ec98b' },
      warning: { main: mode === 'light' ? '#d97f1d' : '#e8a44b' },
      error: { main: mode === 'light' ? '#d05050' : '#ef7070' },
      info: { main: mode === 'light' ? '#2f86c1' : '#5fb0de' },
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
      fontFamily: "'InterVariable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
      h1: { fontWeight: 600, letterSpacing: '-0.01em' },
      h2: { fontWeight: 600, letterSpacing: '-0.01em' },
      h3: { fontWeight: 600, letterSpacing: '-0.01em' },
      h4: { fontWeight: 600, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      button: { fontWeight: 500, textTransform: 'none' },
    },

    shape: {
      borderRadius: 12,
    },

    shadows: buildSoftShadows(),

    components: {
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
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
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
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            boxShadow: `0 4px 14px ${alpha(c.primary, 0.35)}`,
            '&:active': {
              boxShadow: `0 2px 8px ${alpha(c.primary, 0.4)}`,
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
    },

    custom: {
      design: 'modern',
      bubble: {
        strokeWidth: 1.5,
        highlightStrokeWidth: 2.5,
        defaultStroke: c.primary,
        fill: {
          tagAlpha: mode === 'light' ? 0.10 : 0.14,
          defaultFill: mode === 'light'
            ? withAlpha('#2f6bdb', 0.08)
            : 'rgba(255, 255, 255, 0.06)',
        },
        effect: 'none',
        effectParams: null,
        label: {
          weight: 600,
          color: c.textPrimary,
          shadow: false,
        },
      },
      canvasBackground: c.bubbleView,
      headerStrip: {
        show: true,
        sx: {},
      },
      backdrop: 'none',
      buttonStyles: mode === 'light'
        ? {
            backgroundColor: alpha(c.primary, 0.12),
            color: c.primary,
            '&:hover': {
              backgroundColor: alpha(c.primary, 0.2)
            }
          }
        : {
            backgroundColor: alpha(c.primary, 0.18),
            color: c.textPrimary,
            '&:hover': {
              backgroundColor: alpha(c.primary, 0.28)
            }
          },
      outlinedButtonStyles: mode === 'light'
        ? {
            color: c.primary,
            borderColor: alpha(c.primary, 0.5),
            backgroundColor: alpha(c.primary, 0.06),
            '&:hover': {
              borderColor: c.primary,
              backgroundColor: alpha(c.primary, 0.12)
            }
          }
        : {
            color: c.textPrimary,
            borderColor: alpha(c.primary, 0.6),
            backgroundColor: 'transparent',
            '&:hover': {
              borderColor: c.primary,
              backgroundColor: alpha(c.primary, 0.1)
            }
          },
      dialogPaper: {
        borderRadius: 16,
      },
    },
  };
};
