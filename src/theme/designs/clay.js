import { alpha } from '@mui/material/styles';
import { withAlpha } from '../../utils/colorUtils';

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

export const clay = (mode) => {
  const palettes = {
    light: {
      primary: '#a084a0', // Muted lavender
      accent: '#c8a0c0', // Soft purple-pink
      secondary: '#d4a373', // Soft peach
      tertiary: '#a8c8b8', // Soft mint
      backgroundDefault: '#fdf8f5', // Warm off-white (creamy)
      paper: '#fdf8f5',
      bubbleView: 'linear-gradient(135deg, #fdf8f5 0%, #faf5f2 100%)',
      textPrimary: '#3d3340', // Dark brown-gray
      textSecondary: '#6d6470', // Mid brown-gray
      divider: '#e8dfe2',
      shadowColor: 'rgba(50, 40, 45, 0.15)', // Soft warm brown shadow
      shadowHighlight: 'rgba(255, 255, 255, 0.8)', // Soft highlight
    },
    dark: {
      primary: '#9a7f95', // Muted desaturated lavender
      accent: '#a89aa5', // Soft muted purple
      secondary: '#a68a7a', // Muted warm brown
      tertiary: '#8fa89a', // Muted cool gray
      backgroundDefault: '#2a2328', // Deep muted purple-gray
      paper: '#2a2328',
      bubbleView: 'linear-gradient(160deg, #2a2328 0%, #322b30 100%)',
      textPrimary: '#ddd2d5', // Soft off-white
      textSecondary: '#9e9598', // Mid muted gray
      divider: '#3d3540',
      shadowColor: 'rgba(0, 0, 0, 0.4)', // Dark soft shadow
      shadowHighlight: 'rgba(255, 255, 255, 0.12)', // Subtle highlight
    },
  };

  const c = palettes[mode];

  const buildClayNeomorphicShadows = () => {
    const shadows = ['none'];
    for (let i = 1; i <= 24; i++) {
      const y = Math.round(2 + i * 0.6);
      const blur = Math.round(6 + i * 1.4);
      const opacity = Math.min(0.06 + i * 0.005, 0.18);
      shadows.push(`0 ${y}px ${blur}px ${alpha(c.shadowColor, opacity)}`);
    }
    return shadows;
  };

  return {
    palette: {
      mode,
      primary: { main: c.primary },
      secondary: { main: c.secondary },
      success: { main: mode === 'light' ? '#3a9d6d' : '#6dd5ad' },
      warning: { main: mode === 'light' ? '#d4a035' : '#e8c05c' },
      error: { main: mode === 'light' ? '#c85a54' : '#f08080' },
      info: { main: mode === 'light' ? '#8070b0' : '#9a8fb0' },
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
      fontFamily: "'Nunito Variable', 'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
      h1: { fontWeight: 600, letterSpacing: '-0.01em' },
      h2: { fontWeight: 600, letterSpacing: '-0.01em' },
      h3: { fontWeight: 600, letterSpacing: '-0.01em' },
      h4: { fontWeight: 600, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      button: { fontWeight: 500, textTransform: 'none' },
    },

    shape: {
      borderRadius: 24, // Very rounded (clay aesthetic)
    },

    shadows: buildClayNeomorphicShadows(),

    components: {
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
            boxShadow: `0 16px 40px ${alpha(c.shadowColor, 0.15)}, inset 0 1px 2px ${alpha(c.shadowHighlight, 0.3)}`,
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
            boxShadow: `0 8px 16px ${alpha(c.shadowColor, 0.12)}, inset 0 1px 0 ${alpha(c.shadowHighlight, 0.2)}`,
            '&:active': {
              boxShadow: `0 2px 6px ${alpha(c.shadowColor, 0.1)}, inset 0 2px 4px ${alpha(c.shadowColor, 0.1)}`,
            },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 28,
            boxShadow: `0 12px 24px ${alpha(c.shadowColor, 0.14)}, inset 0 1px 0 ${alpha(c.shadowHighlight, 0.3)}`,
            '&:active': {
              boxShadow: `0 4px 10px ${alpha(c.shadowColor, 0.12)}, inset 0 2px 4px ${alpha(c.shadowColor, 0.08)}`,
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
    },

    custom: {
      design: 'clay',
      bubble: {
        strokeWidth: 1.5,
        highlightStrokeWidth: 2.5,
        defaultStroke: c.primary,
        fill: {
          tagAlpha: mode === 'light' ? 0.12 : 0.15,
          defaultFill: mode === 'light'
            ? withAlpha(c.primary, 0.09)
            : 'rgba(154, 127, 149, 0.10)',
        },
        effect: 'clay',
        effectParams: {
          shadowColor: c.shadowColor,
          blurRadius: mode === 'light' ? 10 : 14,
          dx: 3,
          dy: 3,
          highlightColor: c.shadowHighlight,
          highlightAlpha: mode === 'light' ? 0.5 : 0.25,
        },
        label: {
          weight: 500,
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
            backgroundColor: alpha(c.primary, 0.14),
            color: c.primary,
            boxShadow: `0 6px 12px ${alpha(c.shadowColor, 0.1)}, inset 0 1px 0 ${alpha(c.shadowHighlight, 0.2)}`,
            '&:hover': {
              backgroundColor: alpha(c.primary, 0.22),
            },
          }
        : {
            backgroundColor: alpha(c.primary, 0.2),
            color: c.textPrimary,
            boxShadow: `0 6px 12px ${alpha(c.shadowColor, 0.2)}, inset 0 1px 0 ${alpha(c.shadowHighlight, 0.1)}`,
            '&:hover': {
              backgroundColor: alpha(c.primary, 0.3),
            },
          },
      outlinedButtonStyles: mode === 'light'
        ? {
            color: c.primary,
            borderColor: alpha(c.primary, 0.5),
            backgroundColor: alpha(c.primary, 0.06),
            '&:hover': {
              borderColor: c.primary,
              backgroundColor: alpha(c.primary, 0.12),
            },
          }
        : {
            color: c.accent,
            borderColor: alpha(c.primary, 0.6),
            backgroundColor: 'transparent',
            '&:hover': {
              borderColor: c.primary,
              backgroundColor: alpha(c.primary, 0.12),
            },
          },
      dialogPaper: {
        borderRadius: 28,
      },
    },
  };
};
