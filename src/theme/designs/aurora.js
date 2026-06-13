import { alpha } from '@mui/material/styles';
import { withAlpha } from '../../utils/colorUtils';

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

export const aurora = (mode) => {
  const palettes = {
    light: {
      primary: '#9d4edd',
      accent: '#e0aaff',
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
      backgroundDefault: '#0b0e1a',
      paper: '#1a1d2e',
      bubbleView: 'linear-gradient(160deg, #0b0e1a 0%, #16152b 100%)',
      textPrimary: '#e0d5ff',
      textSecondary: '#b8a8d8',
      divider: '#2d2347',
      glowColor: '#a78bfa',
    },
  };

  const c = palettes[mode];

  const buildAuroraShadows = () => {
    const shadows = ['none'];
    for (let i = 1; i <= 24; i++) {
      const y = Math.round(1 + i * 0.75);
      const blur = Math.round(4 + i * 1.6);
      const opacity = Math.min(0.08 + i * 0.008, 0.25);
      shadows.push(`0 ${y}px ${blur}px ${alpha(c.primary, opacity)}`);
    }
    return shadows;
  };

  return {
    palette: {
      mode,
      primary: { main: c.primary },
      secondary: { main: '#f472b6' },
      success: { main: mode === 'light' ? '#3a9d6d' : '#6dd5ad' },
      warning: { main: mode === 'light' ? '#d4a035' : '#e8c05c' },
      error: { main: mode === 'light' ? '#c85a54' : '#f08080' },
      info: { main: mode === 'light' ? '#7c3aed' : '#a78bfa' },
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
      fontFamily: "'Sora', 'InterVariable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
      h1: { fontWeight: 600, letterSpacing: '-0.01em', fontFamily: "'Sora', system-ui" },
      h2: { fontWeight: 600, letterSpacing: '-0.01em', fontFamily: "'Sora', system-ui" },
      h3: { fontWeight: 600, letterSpacing: '-0.01em', fontFamily: "'Sora', system-ui" },
      h4: { fontWeight: 600, letterSpacing: '-0.01em', fontFamily: "'Sora', system-ui" },
      h5: { fontWeight: 600, letterSpacing: '-0.01em', fontFamily: "'Sora', system-ui" },
      h6: { fontWeight: 600, letterSpacing: '-0.01em', fontFamily: "'Sora', system-ui" },
      button: { fontWeight: 500, textTransform: 'none', fontFamily: "'InterVariable', 'Inter'" },
    },

    shape: {
      borderRadius: 16,
    },

    shadows: buildAuroraShadows(),

    components: {
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
              ? `1px solid ${alpha(c.primary, 0.2)}`
              : `1px solid ${alpha(c.primary, 0.3)}`,
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
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: `0 8px 24px ${alpha(c.glowColor, 0.4)}`,
            '&:active': {
              boxShadow: `0 4px 12px ${alpha(c.glowColor, 0.5)}`,
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
    },

    custom: {
      design: 'aurora',
      bubble: {
        strokeWidth: 1.5,
        highlightStrokeWidth: 2.5,
        defaultStroke: c.glowColor,
        fill: {
          tagAlpha: mode === 'light' ? 0.12 : 0.18,
          defaultFill: mode === 'light'
            ? withAlpha(c.primary, 0.09)
            : 'rgba(167, 139, 250, 0.08)',
        },
        effect: 'glow',
        effectParams: {
          glowColor: c.glowColor,
          blurRadius: mode === 'light' ? 8 : 16,
        },
        label: {
          weight: 600,
          color: c.textPrimary,
          shadow: mode === 'dark',
        },
      },
      canvasBackground: c.bubbleView,
      headerStrip: {
        show: true,
        sx: {
          backgroundColor: mode === 'light'
            ? 'rgba(255, 248, 255, 0.7)'
            : 'rgba(26, 29, 46, 0.5)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${alpha(c.primary, mode === 'light' ? 0.15 : 0.25)}`,
        },
      },
      backdrop: 'aurora',
      buttonStyles: mode === 'light'
        ? {
            backgroundColor: alpha(c.primary, 0.15),
            color: c.primary,
            '&:hover': {
              backgroundColor: alpha(c.primary, 0.25)
            }
          }
        : {
            backgroundColor: alpha(c.glowColor, 0.2),
            color: c.textPrimary,
            '&:hover': {
              backgroundColor: alpha(c.glowColor, 0.3)
            }
          },
      outlinedButtonStyles: mode === 'light'
        ? {
            color: c.primary,
            borderColor: alpha(c.primary, 0.6),
            backgroundColor: alpha(c.primary, 0.06),
            '&:hover': {
              borderColor: c.primary,
              backgroundColor: alpha(c.primary, 0.15)
            }
          }
        : {
            color: c.accent,
            borderColor: alpha(c.glowColor, 0.7),
            backgroundColor: alpha(c.glowColor, 0.08),
            '&:hover': {
              borderColor: c.glowColor,
              backgroundColor: alpha(c.glowColor, 0.15)
            }
          },
      dialogPaper: {
        borderRadius: 20,
      },
    },
  };
};
