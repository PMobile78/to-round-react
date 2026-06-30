import { alpha } from '@mui/material/styles';
import { buildDesign } from '../buildDesign';

/**
 * Classic design skin (pre-redesign look from commit 24123f1^)
 * - Primary color: #3B7DED (classic blue)
 * - Font family: Roboto (system default)
 * - Shape: Sharp (borderRadius 4)
 * - Bubble strokes: lineWidth 3 / highlight 4
 * - Bubble fills: rgba blue/white
 */

const buildClassicShadows = (c, mode, alpha) => {
  const shadows = [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
    '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
    '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
    '0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)',
    '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)',
    '0px 5px 6px -3px rgba(0,0,0,0.2),0px 9px 12px 1px rgba(0,0,0,0.14),0px 3px 16px 2px rgba(0,0,0,0.12)',
    '0px 6px 6px -3px rgba(0,0,0,0.2),0px 10px 14px 1px rgba(0,0,0,0.14),0px 4px 18px 3px rgba(0,0,0,0.12)',
    '0px 6px 7px -4px rgba(0,0,0,0.2),0px 11px 15px 1px rgba(0,0,0,0.14),0px 4px 20px 3px rgba(0,0,0,0.12)',
    '0px 7px 8px -4px rgba(0,0,0,0.2),0px 12px 17px 2px rgba(0,0,0,0.14),0px 5px 22px 4px rgba(0,0,0,0.12)',
    '0px 7px 8px -4px rgba(0,0,0,0.2),0px 13px 19px 2px rgba(0,0,0,0.14),0px 5px 24px 4px rgba(0,0,0,0.12)',
    '0px 7px 9px -4px rgba(0,0,0,0.2),0px 14px 21px 2px rgba(0,0,0,0.14),0px 5px 26px 4px rgba(0,0,0,0.12)',
    '0px 8px 9px -5px rgba(0,0,0,0.2),0px 15px 22px 2px rgba(0,0,0,0.14),0px 6px 28px 5px rgba(0,0,0,0.12)',
    '0px 8px 10px -5px rgba(0,0,0,0.2),0px 16px 24px 2px rgba(0,0,0,0.14),0px 6px 30px 5px rgba(0,0,0,0.12)',
    '0px 8px 11px -5px rgba(0,0,0,0.2),0px 17px 26px 2px rgba(0,0,0,0.14),0px 6px 32px 5px rgba(0,0,0,0.12)',
    '0px 9px 11px -5px rgba(0,0,0,0.2),0px 18px 28px 2px rgba(0,0,0,0.14),0px 7px 34px 6px rgba(0,0,0,0.12)',
    '0px 9px 12px -6px rgba(0,0,0,0.2),0px 19px 29px 2px rgba(0,0,0,0.14),0px 7px 36px 6px rgba(0,0,0,0.12)',
    '0px 10px 13px -6px rgba(0,0,0,0.2),0px 20px 31px 3px rgba(0,0,0,0.14),0px 8px 38px 7px rgba(0,0,0,0.12)',
    '0px 10px 13px -6px rgba(0,0,0,0.2),0px 21px 33px 3px rgba(0,0,0,0.14),0px 8px 40px 7px rgba(0,0,0,0.12)',
    '0px 10px 14px -6px rgba(0,0,0,0.2),0px 22px 35px 3px rgba(0,0,0,0.14),0px 8px 42px 7px rgba(0,0,0,0.12)',
    '0px 11px 14px -7px rgba(0,0,0,0.2),0px 23px 36px 3px rgba(0,0,0,0.14),0px 9px 44px 8px rgba(0,0,0,0.12)',
    '0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)',
  ];
  return shadows;
};

export const classic = buildDesign({
  id: 'classic',
  palette: {
    light: {
      primary: '#3B7DED',
      secondary: '#FF6B6B',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
      backgroundDefault: '#f5f5f5',
      paper: '#ffffff',
      bubbleView: '#ffffff',
      textPrimary: '#000000',
      textSecondary: '#666666',
      divider: '#e0e0e0',
    },
    dark: {
      primary: '#3B7DED',
      secondary: '#FF6B6B',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
      backgroundDefault: '#121212',
      paper: '#1e1e1e',
      bubbleView: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
      textPrimary: '#ffffff',
      textSecondary: '#aaaaaa',
      divider: '#333333',
    },
  },
  tokens: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightHeading: 500,
    textTransform: 'uppercase',
    borderRadius: 4,
    shadowsBuilder: buildClassicShadows,
  },
  bubble: {
    strokeWidth: 3,
    highlightStrokeWidth: 4,
    effect: 'none',
    labelWeight: 500,
    fill: (c, mode) => ({
      tagAlpha: 0,
      defaultFill: mode === 'light'
        ? 'rgba(59, 125, 237, 0.08)'
        : 'rgba(255, 255, 255, 0.05)',
    }),
  },
  headerStrip: {
    show: false,
    sx: {},
  },
  backdrop: 'none',
  buttonStyles: (c, mode, alpha) => (mode === 'light'
    ? {
      backgroundColor: c.primary,
      color: '#ffffff',
      '&:hover': {
        backgroundColor: '#2558b8',
      },
    }
    : {
      backgroundColor: alpha(c.primary, 0.25),
      color: '#ffffff',
      '&:hover': {
        backgroundColor: alpha(c.primary, 0.35),
      },
    }),
  outlinedButtonStyles: (c, mode, alpha) => (mode === 'light'
    ? {
      color: c.primary,
      borderColor: c.primary,
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: alpha(c.primary, 0.08),
        borderColor: c.primary,
      },
    }
    : {
      color: c.primary,
      borderColor: alpha(c.primary, 0.7),
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: alpha(c.primary, 0.12),
        borderColor: c.primary,
      },
    }),
  dialogPaper: {
    borderRadius: '4px',
  },
});
